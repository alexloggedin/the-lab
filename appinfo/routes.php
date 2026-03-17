<?php
return [
  'routes' => [
    ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],

    ['name' => 'api#getFiles', 'url' => '/api/files', 'verb' => 'GET'],
    ['name' => 'api#streamFile', 'url' => '/api/stream', 'verb' => 'GET'],
    [
      'name' => 'api#uploadFile',
      'url' => '/api/upload/{path}',
      'verb' => 'PUT',
      'requirements' => ['path' => '.+']
    ],

    ['name' => 'api#getShares', 'url' => '/api/shares', 'verb' => 'GET'],
    ['name' => 'api#createShare', 'url' => '/api/shares', 'verb' => 'POST'],
    ['name' => 'api#deleteShare', 'url' => '/api/shares/{id}', 'verb' => 'DELETE'],

    ['name' => 'api#getMetadata', 'url' => '/api/metadata', 'verb' => 'GET'],
    ['name' => 'api#updateMetadata', 'url' => '/api/metadata', 'verb' => 'POST'],
    ['name' => 'api#updateAlbumArt', 'url' => '/api/albumart', 'verb' => 'POST'],

    ['name' => 'api#getActivity', 'url' => '/api/activity', 'verb' => 'GET'],
    ['name' => 'api#initLabFolder', 'url' => '/api/init', 'verb' => 'POST'],

    ['name' => 'public_share#showShare',    'url' => '/s/{token}', 'verb' => 'GET'],
    ['name' => 'api#getShareByToken',       'url' => '/api/share/{token}', 'verb' => 'GET'],
  ]
];