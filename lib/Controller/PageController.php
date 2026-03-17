<?php
namespace OCA\TheLab\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;

class PageController extends Controller
{

  public function __construct(string $appName, IRequest $request)
  {
    parent::__construct($appName, $request);
  }

  /**
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function index(): TemplateResponse
  {
    $viteDev = file_exists(__DIR__ . '/../../.vite-dev');

    $response = new TemplateResponse('thelab', 'index', [
      'vite_dev' => $viteDev,
    ]);

    $csp = new ContentSecurityPolicy();
    $csp->addAllowedMediaDomain('blob:');
    $csp->addAllowedMediaDomain("'self'");
    $csp->addAllowedScriptDomain("'self'");
    $csp->addAllowedConnectDomain("'self'");

    if ($viteDev) {
      $csp->addAllowedScriptDomain('http://localhost:5173');
      $csp->addAllowedConnectDomain('http://localhost:5173');
      $csp->addAllowedConnectDomain('ws://localhost:5173');
    }

    $response->setContentSecurityPolicy($csp);

    return $response;
  }

      /**
     * Serves the React app shell. Annotations make this accessible without login.
     *
     * @NoAdminRequired
     * @PublicPage
     * @NoCSRFRequired
     */
    public function showShare(string $token): TemplateResponse
    {
        $viteDev = file_exists(__DIR__ . '/../../.vite-dev');

        if (!$viteDev) {
            \OCP\Util::addScript('thelab', 'thelab');
            \OCP\Util::addStyle('thelab', 'thelab');
        }

        $response = new TemplateResponse('thelab', 'index', [
            'vite_dev' => $viteDev,
            'share_token' => $token,
        ], 'base');

        $csp = new ContentSecurityPolicy();
        $csp->addAllowedMediaDomain('blob:');
        $csp->addAllowedMediaDomain("'self'");
        $csp->addAllowedScriptDomain("'self'");
        $csp->addAllowedConnectDomain("'self'");

        if ($viteDev) {
            $csp->addAllowedScriptDomain('http://localhost:5173');
            $csp->addAllowedConnectDomain('http://localhost:5173');
            $csp->addAllowedConnectDomain('ws://localhost:5173');
        }

        $response->setContentSecurityPolicy($csp);

        return $response;
    }
}