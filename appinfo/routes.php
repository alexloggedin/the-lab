<?php
return [
  'routes' => [

    // Page — serves the React app shell
    ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],

    // Files
    ['name' => 'api#getFiles',   'url' => '/api/files',         'verb' => 'GET'],
    ['name' => 'api#streamFile', 'url' => '/api/files/{path}',  'verb' => 'GET'],
    ['name' => 'api#uploadFile', 'url' => '/api/upload/{path}', 'verb' => 'PUT'],

    // Shares
    ['name' => 'api#getShares',   'url' => '/api/shares',       'verb' => 'GET'],
    ['name' => 'api#createShare', 'url' => '/api/shares',       'verb' => 'POST'],
    ['name' => 'api#deleteShare', 'url' => '/api/shares/{id}',  'verb' => 'DELETE'],

    // Versions
    ['name' => 'api#getVersions',    'url' => '/api/versions',         'verb' => 'GET'],
    ['name' => 'api#streamVersion',  'url' => '/api/versions/stream',  'verb' => 'GET'],
    ['name' => 'api#restoreVersion', 'url' => '/api/versions/restore', 'verb' => 'POST'],

    // Activity
    ['name' => 'api#getActivity', 'url' => '/api/activity', 'verb' => 'GET'],

  ]
];