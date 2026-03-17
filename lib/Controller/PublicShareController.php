<?php
namespace OCA\TheLab\Controller;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\PublicShareController as NCPublicShareController;
use OCP\IRequest;
use OCP\ISession;
use OCP\Share\IManager;
use OCP\Share\IShare;
use OCP\Share\Exceptions\ShareNotFound;
use OCP\AppFramework\Http\JSONResponse;

class PublicShareController extends NCPublicShareController
{

    private ?IShare $share = null;
    private IManager $shareManager;

    public function __construct(
        string $appName,
        IRequest $request,
        ISession $session,
        IManager $shareManager,
    ) {
        parent::__construct($appName, $request, $session, $shareManager);
        $this->shareManager = $shareManager;
    }

    // Called by Nextcloud to verify the token exists
    public function isValidToken(): bool
    {
        try {
            $this->share = $this->shareManager->getShareByToken($this->getToken());
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    // Called by Nextcloud to get the stored password hash for comparison
    protected function getPasswordHash(): string
    {
        return $this->share?->getPassword();
    }

    // Called by Nextcloud to decide whether to show the password prompt
    protected function isPasswordProtected(): bool
    {
        return $this->share?->getPassword() !== null;
    }

    /**
     * Serves the React app shell. Annotations make this accessible without login.
     *
     * @PublicPage
     * @NoCSRFRequired
     */
    public function showShare(): TemplateResponse
    {
        \OCP\Util::addScript('thelab', 'thelab');
        \OCP\Util::addStyle('thelab', 'thelab');

        return new TemplateResponse(
            'thelab',
            'public',
            ['token' => $this->getToken()],
            'base'
        );
    }

    /**
     * Serves JSON representing share information.
     * 
     * @PublicPage
     * @NoCSRFRequired
     */
    public function getShareByToken(string $token): JSONResponse
    {
        try {
            $share = $this->shareManager->getShareByToken($token);
        } catch (ShareNotFound $e) {
            return new JSONResponse(['error' => 'Share not found'], 404);
        }

        // Check expiry manually — Nextcloud does not auto-invalidate on fetch
        $expiry = $share->getExpirationDate();
        if ($expiry && $expiry < new \DateTime()) {
            return new JSONResponse(['error' => 'Share has expired'], 404);
        }

        $node = $share->getNode();

        $meta = [];
        if ($node instanceof \OCP\Files\File) {
            try {
                $localPath = $node->getStorage()->getLocalFile($node->getInternalPath());
                if (class_exists('\ID3Parser\ID3Parser')) {
                    $parser = new \ID3Parser\ID3Parser();
                    $tags = $parser->analyze($localPath);
                    \getid3_lib::CopyTagsToComments($tags);
                    $comments = $tags['comments'] ?? [];
                    $meta = [
                        'bpm' => $comments['bpm'][0] ?? null,
                        'key' => $comments['initial_key'][0] ?? null,
                        'genre' => $comments['genre'][0] ?? null,
                    ];
                }
            } catch (\Throwable $e) {
                // ID3 parsing is optional — don't let it break the response
                $meta = [];
            }
        }
        return new JSONResponse([
            'token' => $token,
            'fileName' => $node->getName(),
            'filePath' => $node->getInternalPath(),
            'mimetype' => $node instanceof \OCP\Files\File
                ? $node->getMimeType()
                : 'httpd/unix-directory',
            'isFolder' => $node instanceof \OCP\Files\Folder,
            'hideDownload' => $share->getHideDownload(),
            'meta' => $meta,
        ]);
    }

}
