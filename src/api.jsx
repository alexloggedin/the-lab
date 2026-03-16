import { USE_MOCK } from './dev/useMockData';
import { mockFiles, mockFolders, mockMetadata, mockVersions, mockShares } from './dev/fixtures';
import axios from 'axios';

const base = (path) =>
  window.OC ? window.OC.generateUrl(`/apps/wipshare${path}`) : path;

export const api = {
  getFiles: (path = '') =>
    USE_MOCK
      ? Promise.resolve({ data: path ? mockFiles : mockFolders })
      : axios.get(base(`/api/files?path=${encodeURIComponent(path)}`)),

  getMetadata: (path) =>
    USE_MOCK
      ? Promise.resolve({ data: mockMetadata })
      : axios.get(base(`/api/metadata?path=${encodeURIComponent(path)}`)),

  getVersions: (path) =>
    USE_MOCK
      ? Promise.resolve({ data: mockVersions })
      : axios.get(base(`/api/versions?path=${encodeURIComponent(path)}`)),

  getShares: () =>
    USE_MOCK
      ? Promise.resolve({ data: mockShares })
      : axios.get(base('/api/shares')),

  createShare: (data) =>
    USE_MOCK
      ? Promise.resolve({ data: { id: '2', token: 'newXyz', url: 'https://share.yourdomain.com/s/newXyz' } })
      : axios.post(base('/api/shares'), data),

  deleteShare: (id) =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : axios.delete(base(`/api/shares/${id}`)),

  updateMetadata: (path, data) =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : axios.post(base('/api/metadata'), { path, ...data }),

  streamUrl: (path) =>
    USE_MOCK
      ? '/mock-audio/test.wav'  // drop a real file in public/mock-audio/
      : base(`/api/files/${encodeURIComponent(path)}`),

  streamVersion: (path, versionId) =>
    USE_MOCK
      ? '/mock-audio/test.wav'
      : base(`/api/versions/stream?path=${encodeURIComponent(path)}&versionId=${encodeURIComponent(versionId)}`),

  restoreVersion: (path, versionId) =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : axios.post(base('/api/versions/restore'), { path, versionId }),
};