<?php
namespace OCA\TheLab\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;

class PageController extends Controller {

  public function __construct(string $appName, IRequest $request) {
    parent::__construct($appName, $request);
  }

  /**
   * @NoAdminRequired
   * @NoCSRFRequired
   */
  public function index(): TemplateResponse {
    $response = new TemplateResponse('thelab', 'index');

    $csp = new ContentSecurityPolicy();
    $csp->addAllowedMediaDomain('blob:');
    $csp->addAllowedMediaDomain("'self'");
    $csp->addAllowedScriptDomain("'self'");
    $csp->addAllowedConnectDomain("'self'");
    $response->setContentSecurityPolicy($csp);

    return $response;
  }
}