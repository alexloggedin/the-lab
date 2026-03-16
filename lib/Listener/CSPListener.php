<?php
namespace OCA\TheLab\Listener;

use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Security\CSP\AddContentSecurityPolicyEvent;

class CSPListener implements IEventListener {

  public function handle(Event $event): void {
    if (!$event instanceof AddContentSecurityPolicyEvent) {
      return;
    }

    $policy = new ContentSecurityPolicy();
    $policy->addAllowedMediaDomain('blob:');
    $policy->addAllowedMediaDomain("'self'");

    $event->setCsp($policy);
  }
}