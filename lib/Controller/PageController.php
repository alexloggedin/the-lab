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
    $response = new TemplateResponse('thelab', 'index');

    $response->setParams([
      'vite_dev' => getenv('THELAB_VITE_DEV') === 'true',
      'vite_port' => '5173',
    ]);

    $csp = new ContentSecurityPolicy();
    $csp->addAllowedMediaDomain('blob:');
    $csp->addAllowedMediaDomain("'self'");
    $csp->addAllowedScriptDomain("'self'");
    $csp->addAllowedConnectDomain("'self'");
    $response->setContentSecurityPolicy($csp);

    return $response;
  }
}