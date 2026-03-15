<?php
namespace OCA\WipShare\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\StreamResponse;
use OCP\Files\IRootFolder;
use OCP\IRequest;
use OCP\Share\IManager as IShareManager;
use OCP\Share\IShare;

class ApiController extends Controller {

  private IRootFolder $rootFolder;
  private IShareManager $shareManager;
  private string $userId;

  public function __construct(
    string $appName,
    IRequest $request,
    IRootFolder $rootFolder,
    IShareManager $shareManager,
    string $userId
  ) {
    parent::__construct($appName, $request);
    $this->rootFolder   = $rootFolder;
    $this->shareManager = $shareManager;
    $this->userId       = $userId;
  }

  /**
   * Lists files and folders at the given path.
   * @NoAdminRequired
   */
  public function getFiles(string $path = ''): JSONResponse {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);
    $folder     = $path ? $userFolder->get($path) : $userFolder;
    $items      = [];

    foreach ($folder->getDirectoryListing() as $node) {
      $items[] = [
        'name'     => $node->getName(),
        'path'     => $node->getInternalPath(),
        'size'     => $node->getSize(),
        'modified' => $node->getMTime(),
        'type'     => $node->getType(),
        'mimetype' => method_exists($node, 'getMimeType')
                        ? $node->getMimeType()
                        : 'httpd/unix-directory',
      ];
    }

    return new JSONResponse($items);
  }

  /**
   * Streams a file directly to the browser.
   * The {path} parameter comes from the route.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function streamFile(string $path): StreamResponse {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);
    $file       = $userFolder->get($path);
    $response   = new StreamResponse($file->fopen('r'));
    $response->addHeader('Content-Type', $file->getMimeType());
    $response->addHeader('Content-Length', $file->getSize());
    $response->addHeader('Accept-Ranges', 'bytes');
    return $response;
  }

  /**
   * Handles file uploads. Overwrites if the file already exists,
   * which triggers Nextcloud's automatic versioning.
   * @NoAdminRequired
   */
  public function uploadFile(string $path): JSONResponse {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);
    $content    = file_get_contents('php://input');

    // Create parent directories if they don't exist
    $dir = dirname($path);
    if ($dir !== '.' && !$userFolder->nodeExists($dir)) {
      $userFolder->newFolder($dir);
    }

    if ($userFolder->nodeExists($path)) {
      $file = $userFolder->get($path);
      $file->putContent($content);
    } else {
      $userFolder->newFile($path, $content);
    }

    return new JSONResponse(['success' => true]);
  }

  /**
   * Lists all public share links created by the current user.
   * @NoAdminRequired
   */
  public function getShares(): JSONResponse {
    $shares = $this->shareManager->getSharesBy(
      $this->userId,
      IShare::TYPE_LINK
    );

    $result = array_map(fn($share) => [
      'id'          => $share->getId(),
      'path'        => $share->getNode()->getInternalPath(),
      'token'       => $share->getToken(),
      'url'         => \OC::$server->getURLGenerator()
                          ->linkToRouteAbsolute('files_sharing.Share.showShare',
                            ['token' => $share->getToken()]),
      'expiry'      => $share->getExpirationDate()?->format('Y-m-d'),
      'hasPassword' => $share->getPassword() !== null,
    ], $shares);

    return new JSONResponse($result);
  }

  /**
   * Creates a new public share link.
   * @NoAdminRequired
   */
  public function createShare(
    string $path,
    string $password = '',
    string $expiryDate = '',
    bool $hideDownload = false
  ): JSONResponse {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);
    $node       = $userFolder->get($path);

    $share = $this->shareManager->newShare();
    $share->setNode($node)
          ->setShareType(IShare::TYPE_LINK)
          ->setPermissions(\OCP\Constants::PERMISSION_READ)
          ->setSharedBy($this->userId)
          ->setHideDownload($hideDownload);

    if ($password)   { $share->setPassword($password); }
    if ($expiryDate) { $share->setExpirationDate(new \DateTime($expiryDate)); }

    $share = $this->shareManager->createShare($share);

    return new JSONResponse([
      'id'    => $share->getId(),
      'token' => $share->getToken(),
      'url'   => \OC::$server->getURLGenerator()
                    ->linkToRouteAbsolute('files_sharing.Share.showShare',
                      ['token' => $share->getToken()]),
    ]);
  }

  /**
   * Revokes a share link by ID.
   * @NoAdminRequired
   */
  public function deleteShare(string $id): JSONResponse {
    $share = $this->shareManager->getShareById('ocinternal:' . $id);
    $this->shareManager->deleteShare($share);
    return new JSONResponse(['success' => true]);
  }

  /**
   * Lists version history for a file.
   * Requires the files_versions app to be enabled in Nextcloud.
   * @NoAdminRequired
   */
  public function getVersions(string $path): JSONResponse {
    $versions = \OCA\Files_Versions\Storage::getVersions(
      $this->userId,
      '/' . $path
    );

    $result = array_map(fn($v) => [
      'versionId' => $v['version'],
      'size'      => $v['size'],
      'modified'  => $v['version'], // version ID is a Unix timestamp
    ], array_values($versions));

    return new JSONResponse($result);
  }

  /**
   * Streams a specific historical version of a file.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function streamVersion(string $path, string $versionId): StreamResponse {
    $file     = \OCA\Files_Versions\Storage::getVersionedFile(
                  $this->userId, '/' . $path, $versionId);
    $response = new StreamResponse($file->fopen('r'));
    $response->addHeader('Content-Type', $file->getMimeType());
    $response->addHeader('Accept-Ranges', 'bytes');
    return $response;
  }

  /**
   * Restores a file to a previous version.
   * The current file becomes the newest version automatically.
   * @NoAdminRequired
   */
  public function restoreVersion(string $path, string $versionId): JSONResponse {
    \OCA\Files_Versions\Storage::rollback($path, $versionId, $this->userId);
    return new JSONResponse(['success' => true]);
  }

  /**
   * Returns recent file activity for the current user.
   * Requires the activity app to be enabled in Nextcloud.
   * @NoAdminRequired
   */
  public function getActivity(): JSONResponse {
    $manager = \OC::$server->get(\OCA\Activity\Data::class);
    $events  = $manager->get($this->userId, 0, 50);
    return new JSONResponse($events);
  }
}
