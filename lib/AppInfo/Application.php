<?php
namespace OCA\TheLab\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\Security\CSP\AddContentSecurityPolicyEvent;

class Application extends App implements IBootstrap {

  public const APP_ID = 'thelab';

  public function __construct() {
    parent::__construct(self::APP_ID);
  }

  public function register(IRegistrationContext $context): void {
  }

  public function boot(IBootContext $context): void {
  }
}