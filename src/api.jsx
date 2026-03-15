import axios from 'axios';

const base = window.OC
  ? (path) => window.OC.generateUrl(`/apps/wipshare${path}`)
  : (path) => `/apps/wipshare${path}`;

export const api = {
  getFiles:      (path = '') => axios.get(base(`/api/files?path=${encodeURIComponent(path)}`)),
  streamUrl:     (path)      => base(`/api/files/${encodeURIComponent(path)}`),
  uploadFile:    (path, file) => axios.put(base(`/api/upload/${encodeURIComponent(path)}`), file, {
                                   headers: { 'Content-Type': file.type }
                                 }),
  getShares:     ()          => axios.get(base('/api/shares')),
  createShare:   (data)      => axios.post(base('/api/shares'), data),
  deleteShare:   (id)        => axios.delete(base(`/api/shares/${id}`)),
  getVersions:   (path)      => axios.get(base(`/api/versions?path=${encodeURIComponent(path)}`)),
  streamVersion: (path, vid) => base(`/api/versions/stream?path=${encodeURIComponent(path)}&versionId=${vid}`),
  restoreVersion:(path, vid) => axios.post(base('/api/versions/restore'), { path, versionId: vid }),
  getActivity:   ()          => axios.get(base('/api/activity')),
};
