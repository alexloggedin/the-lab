<?php
// appinfo/routes.php

return [
  'routes' => [
    // Authenticated app shell
    ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
    
    // Public share page shell — served to unauthenticated users
    // The :token is passed to React as a data attribute; React Router handles
    // the rest of the public share UI via /share/:token
    ['name' => 'page#showShare', 'url' => '/s/{token}', 'verb' => 'GET'],
  ]
];
