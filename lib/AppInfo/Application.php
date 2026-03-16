<?php
namespace OCA\TheLab\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\Security\CSP\AddContentSecurityPolicyEvent;
use OCP\AppFramework\Http\ContentSecurityPolicy;

class Application extends App implements IBootstrap {

  public const APP_ID = 'thelab';

  public function __construct() {
    parent::__construct(self::APP_ID);
  }

  public function register(IRegistrationContext $context): void {
    $context->registerEventListener(
      AddContentSecurityPolicyEvent::class,
      CSPListener::class
    );
  }

  public function boot(IBootContext $context): void {
  }
}