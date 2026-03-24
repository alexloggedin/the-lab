// src/dev/fixtures.ts
import type { VaultFile, FileMetadata, FileVersion, ShareLink } from '../types';

export const mockFiles: VaultFile[] = [
  {
    name: 'track_01_v3.wav',
    path: 'ep-demos/track_01_v3.wav',
    size: 14900000,
    modified: 1741900000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'track_02_v1.wav',
    path: 'ep-demos/track_02_v1.wav',
    size: 8700000,
    modified: 1741800000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'interlude_rough.mp3',
    path: 'ep-demos/interlude_rough.mp3',
    size: 3100000,
    modified: 1741700000,
    mimetype: 'audio/mpeg',
    type: 'file',
  },
    {
    name: 'track_01_v3.wav',
    path: 'ep-demos/track_01_v3.wav',
    size: 14900000,
    modified: 1741900000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'track_02_v1.wav',
    path: 'ep-demos/track_02_v1.wav',
    size: 8700000,
    modified: 1741800000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'interlude_rough.mp3',
    path: 'ep-demos/interlude_rough.mp3',
    size: 3100000,
    modified: 1741700000,
    mimetype: 'audio/mpeg',
    type: 'file',
  },  {
    name: 'track_01_v3.wav',
    path: 'ep-demos/track_01_v3.wav',
    size: 14900000,
    modified: 1741900000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'track_02_v1.wav',
    path: 'ep-demos/track_02_v1.wav',
    size: 8700000,
    modified: 1741800000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'interlude_rough.mp3',
    path: 'ep-demos/interlude_rough.mp3',
    size: 3100000,
    modified: 1741700000,
    mimetype: 'audio/mpeg',
    type: 'file',
  },  {
    name: 'track_01_v3.wav',
    path: 'ep-demos/track_01_v3.wav',
    size: 14900000,
    modified: 1741900000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'track_02_v1.wav',
    path: 'ep-demos/track_02_v1.wav',
    size: 8700000,
    modified: 1741800000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'interlude_rough.mp3',
    path: 'ep-demos/interlude_rough.mp3',
    size: 3100000,
    modified: 1741700000,
    mimetype: 'audio/mpeg',
    type: 'file',
  },  {
    name: 'track_01_v3.wav',
    path: 'ep-demos/track_01_v3.wav',
    size: 14900000,
    modified: 1741900000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'track_02_v1.wav',
    path: 'ep-demos/track_02_v1.wav',
    size: 8700000,
    modified: 1741800000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'interlude_rough.mp3',
    path: 'ep-demos/interlude_rough.mp3',
    size: 3100000,
    modified: 1741700000,
    mimetype: 'audio/mpeg',
    type: 'file',
  },  {
    name: 'track_01_v3.wav',
    path: 'ep-demos/track_01_v3.wav',
    size: 14900000,
    modified: 1741900000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'track_02_v1.wav',
    path: 'ep-demos/track_02_v1.wav',
    size: 8700000,
    modified: 1741800000,
    mimetype: 'audio/wav',
    type: 'file',
  },
  {
    name: 'interlude_rough.mp3',
    path: 'ep-demos/interlude_rough.mp3',
    size: 3100000,
    modified: 1741700000,
    mimetype: 'audio/mpeg',
    type: 'file',
  },
];

export const mockFolders: VaultFile[] = [
  { name: 'ep demos — spring', path: 'ep-demos', type: 'dir', modified: 1741900000, size: 0, mimetype: 'httpd/unix-directory' },
  { name: 'album a — rough mixes', path: 'album-a', type: 'dir', modified: 1741500000, size: 0, mimetype: 'httpd/unix-directory' },
  { name: 'video — promo cuts', path: 'video-promo', type: 'dir', modified: 1740900000, size: 0, mimetype: 'httpd/unix-directory' },
];

export const mockMetadata: FileMetadata = {
  title: 'Track 01',
  artist: '',
  album: 'EP Demos — Spring',
  genre: 'Electronic',
  bpm: '128',
  key: 'Am',
  year: '2026',
  comment: 'needs brass stabs in verse 2',
  duration: 227,
  bitrate: 1411200,
  albumArt: null,
};

export const mockVersions: FileVersion[] = [
  {
    versionId: '1700000000',
    href: '/remote.php/dav/versions/admin/versions/42/1700000000',
    size: 4200000,
    modified: 1700000000,
    contentType: 'audio/wav',
  },
  {
    versionId: '1699000000',
    href: '/remote.php/dav/versions/admin/versions/42/1699000000',
    size: 3900000,
    modified: 1699000000,
    contentType: 'audio/wav',
  },
];

export const mockShareLinks: ShareLink[] = [
  {
    id: '1',
    path: 'ep-demos/track_01_v3.wav',
    token: 'aB3xYz9',
    url: 'https://share.yourdomain.com/s/aB3xYz9',
    expiry: '2026-04-15',
    hasPassword: true,
  },
];
