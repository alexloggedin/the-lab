import { USE_MOCK } from './dev/useMockData';
import { mockFiles, mockFolders, mockMetadata, mockShareLinks } from './dev/fixtures';
import axios from 'axios';

const base = (path) =>
  window.OC ? window.OC.generateUrl(`/apps/thelab${path}`) : path;

export const api = {
  initLab: () =>
    USE_MOCK
      ? Promise.resolve({ data: { success: true } })
      : axios.post(base('/api/init')),
  getFiles: (path = 'theLAB') =>
    USE_MOCK
      ? Promise.resolve({ data: path != "theLAB" ? mockFiles : mockFolders })
      : axios.get(base(`/api/files?path=${encodeURIComponent(path)}`)),

  getMetadata: (path) =>
    USE_MOCK
      ? Promise.resolve({ data: mockMetadata })
      : axios.get(base(`/api/metadata?path=${encodeURIComponent(path)}`)),

  getShares: () =>
    USE_MOCK
      ? Promise.resolve({ data: mockShareLinks })
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
      ? '/mock-audio/test.wav'
      : base(`/api/stream?path=${encodeURIComponent(path)}`),

  getShareByToken: (token) =>
    USE_MOCK
      ? getMockShareInfoFromToken(token)
      : axios.get(base(`/api/share/${token}`)),
};

function getMockShareInfoFromToken (token) {
  console.log(token)
  switch (token) {
    case "invalid":
      return Promise.reject(new Error('not found'));
    case "folder":
      return Promise.resolve({
        data: {
          token,
          fileName: 'ep-demos',
          filePath: 'ep-demos',
          mimetype: 'httpd/unix-directory',
          isFolder: true,
          hideDownload: false,
        }
      })
    default:
      return Promise.resolve({
        data: {
          token,
          fileName: 'track_01_v3.wav',
          filePath: 'ep-demos/track_01_v3.wav',
          mimetype: 'audio/wav',
          isFolder: false,
          hideDownload: false,
          meta: {
            bpm: '128',
            key: 'Am',
            genre: 'Electronic',
          }
        }
      })
  }

}