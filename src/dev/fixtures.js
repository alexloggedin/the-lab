export const mockFiles = [
  {
    name: 'track_01_v3.wav',
    path: 'ep-demos/track_01_v3.wav',
    size: 14900000,
    modified: 1741900000,
    mimetype: 'audio/wav',
  },
  {
    name: 'track_02_v1.wav',
    path: 'ep-demos/track_02_v1.wav',
    size: 8700000,
    modified: 1741800000,
    mimetype: 'audio/wav',
  },
  {
    name: 'interlude_rough.mp3',
    path: 'ep-demos/interlude_rough.mp3',
    size: 3100000,
    modified: 1741700000,
    mimetype: 'audio/mpeg',
  },
];

export const mockFolders = [
  { name: 'ep demos — spring', path: 'ep-demos', type: 'dir', modified: 1741900000 },
  { name: 'album a — rough mixes', path: 'album-a', type: 'dir', modified: 1741500000 },
  { name: 'video — promo cuts', path: 'video-promo', type: 'dir', modified: 1740900000 },
];

export const mockMetadata = {
  title:    'Track 01',
  artist:   '',
  album:    'EP Demos — Spring',
  genre:    'Electronic',
  bpm:      '128',
  key:      'Am',
  year:     '2026',
  comment:  'needs brass stabs in verse 2',
  duration: 227,
  bitrate:  1411200,
  albumArt: null,
};

export const mockVersions = [
  { versionId: '1741800000', size: 12000000, modified: 1741800000 },
  { versionId: '1741700000', size: 11500000, modified: 1741700000 },
  { versionId: '1741600000', size: 11200000, modified: 1741600000 },
];

export const mockShares = [
  {
    id: '1',
    path: 'ep-demos/track_01_v3.wav',
    token: 'aB3xYz9',
    url: 'https://share.yourdomain.com/s/aB3xYz9',
    expiry: '2026-04-15',
    hasPassword: true,
  },
];