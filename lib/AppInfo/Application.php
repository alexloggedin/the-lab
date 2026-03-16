<?php

namespace OCA\WipShare\AppInfo;

use OCP\AppFramework\App;

class Application extends App {
	public const APP_ID = 'wipshare';

	public function __construct() {
		parent::__construct(self::APP_ID);
	}
}
