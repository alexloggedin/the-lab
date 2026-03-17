<?php
namespace OCA\TheLab\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\AppFramework\Http\StreamResponse;
use OCP\Files\IRootFolder;
use OCP\IRequest;
use OCP\Share\IManager as IShareManager;
use OCP\Share\IShare;
use OCP\Share\Exceptions\ShareNotFound;
use OCP\IURLGenerator;


class ApiController extends Controller
{

  private IRootFolder $rootFolder;
  private IShareManager $shareManager;
  private ?string $userId = null;

  public function __construct(
    string $appName,
    IRequest $request,
    IRootFolder $rootFolder,
    IShareManager $shareManager,
    IURLGenerator $urlGenerator,
    ?string $userId
  ) {
    parent::__construct($appName, $request);
    $this->rootFolder = $rootFolder;
    $this->shareManager = $shareManager;
    $this->urlGenerator = $urlGenerator;
    $this->userId = $userId;
  }

  /**
   * Ensures the theLAB root folder exists, creating it if needed.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function initLabFolder(): JSONResponse
  {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);
    $labPath = 'theLAB';

    if (!$userFolder->nodeExists($labPath)) {
      $userFolder->newFolder($labPath);
    }

    return new JSONResponse(['success' => true, 'path' => $labPath]);
  }

  /**
   * Lists files and folders at the given path.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function getFiles(string $path = ''): JSONResponse
  {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);

    // Strip leading 'files/' prefix
    $cleanPath = preg_replace('#^files/#', '', $path);
    $cleanPath = ltrim($cleanPath, '/');

    // Ensure all file requests stay within theLAB
    if ($cleanPath !== 'theLAB' && !str_starts_with($cleanPath, 'theLAB/')) {
      return new JSONResponse(['error' => 'Access outside theLAB is not permitted'], 403);
    }

    // Get the node at this path
    $node = $cleanPath ? $userFolder->get($cleanPath) : $userFolder;

    // Guard against files being passed instead of folders
    if (!($node instanceof \OCP\Files\Folder)) {
      return new JSONResponse(['error' => 'Not a directory'], 400);
    }

    $items = [];
    foreach ($node->getDirectoryListing() as $child) {
      $relativePath = ($cleanPath ? $cleanPath . '/' : '') . $child->getName();
      $items[] = [
        'name' => $child->getName(),
        'path' => $relativePath,
        'size' => $child->getSize(),
        'modified' => $child->getMTime(),
        'type' => $child->getType(),
        'mimetype' => method_exists($child, 'getMimeType')
          ? $child->getMimeType()
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
  public function streamFile(string $path): StreamResponse
  {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);
    $cleanPath = preg_replace('#^files/#', '', $path);
    $file = $userFolder->get($cleanPath);
    $response = new StreamResponse($file->fopen('r'));
    $response->addHeader('Content-Type', $file->getMimeType());
    $response->addHeader('Content-Length', $file->getSize());
    $response->addHeader('Accept-Ranges', 'bytes');
    return $response;
  }
  /**
   * Handles file uploads. Overwrites if the file already exists,
   * which triggers Nextcloud's automatic versioning.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function uploadFile(string $path): JSONResponse
  {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);
    $content = file_get_contents('php://input');

    // Create parent directories if they don't exist
    $dir = dirname($path);
    if ($dir !== '.' && !$userFolder->nodeExists($dir)) {
      $userFolder->newFolder($dir);
    }

    if ($userFolder->nodeExists($path)) {
      $cleanPath = preg_replace('#^files/#', '', $path);

      $file = $cleanPath ? $userFolder->get($cleanPath) : $userFolder;
      $file->putContent($content);
    } else {
      $userFolder->newFile($path, $content);
    }

    return new JSONResponse(['success' => true]);
  }

  /**
   * Lists all public share links created by the current user.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function getShares(): JSONResponse
  {
    $shares = $this->shareManager->getSharesBy(
      $this->userId,
      IShare::TYPE_LINK
    );

    $result = array_map(fn($share) => [
      'id' => $share->getFullId(),
      'path' => $share->getNode()->getInternalPath(),
      'token' => $share->getToken(),
      'url' => $this->urlGenerator
        ->linkToRouteAbsolute('files_sharing.Share.showShare', ['token' => $share->getToken()]),
      'expiry' => $share->getExpirationDate()?->format('Y-m-d'),
      'hasPassword' => $share->getPassword() !== null,
    ], $shares);

    return new JSONResponse($result);
  }

  /**
   * Creates a new public share link.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function createShare(
    string $path,
    string $password = '',
    string $expiryDate = '',
    bool $hideDownload = false
  ): JSONResponse {
    $userFolder = $this->rootFolder->getUserFolder($this->userId);

    $cleanPath = preg_replace('#^files/#', '', $path);

    $node = $cleanPath ? $userFolder->get($cleanPath) : $userFolder;

    $share = $this->shareManager->newShare();
    $share->setNode($node)
      ->setShareType(IShare::TYPE_LINK)
      ->setPermissions(\OCP\Constants::PERMISSION_READ)
      ->setSharedBy($this->userId)
      ->setHideDownload($hideDownload);

    if ($password) {
      $share->setPassword($password);
    }
    if ($expiryDate) {
      $share->setExpirationDate(new \DateTime($expiryDate));
    }

    $share = $this->shareManager->createShare($share);

    return new JSONResponse([
      'id' => $share->getFullId(),
      'token' => $share->getToken(),
      'url' => $this->urlGenerator
        ->linkToRouteAbsolute(
          'files_sharing.Share.showShare',
          ['token' => $share->getToken()]
        ),
    ]);
  }

  /**
   * Revokes a share link by ID.
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function deleteShare(string $id): JSONResponse
  {
    try {
      $share = $this->shareManager->getShareById($id);
      $this->shareManager->deleteShare($share);
      return new JSONResponse(['success' => true]);
    } catch (ShareNotFound $e) {
      return new JSONResponse(['error' => 'Share not found'], 404);
    } catch (\Exception $e) {
      return new JSONResponse(['error' => $e->getMessage()], 500);
    }
  }
}
