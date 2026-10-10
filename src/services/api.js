const jsonRequest = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const authApi = {
  getCurrentUser: () => fetch('/api/auth/me'),
  authenticate: (mode, credentials) => fetch(`/api/auth/${mode}`, jsonRequest('POST', credentials)),
  changePassword: (passwords) => fetch('/api/auth/password', jsonRequest('PATCH', passwords)),
  updateProfile: (profile) => fetch('/api/auth/profile', jsonRequest('PATCH', profile)),
  logout: () => fetch('/api/auth/logout', { method: 'POST' }),
};

export const filesApi = {
  list: () => fetch('/api/files'),
  delete: (id) => fetch(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  previewUrl: (id) => `/api/files/${encodeURIComponent(id)}/preview`,
  downloadUrl: (id) => `/api/files/${encodeURIComponent(id)}/download`,
};

export const uploadsApi = {
  start: (fileName, fileSize) => fetch('/api/uploads', jsonRequest('POST', { fileName, fileSize })),
  uploadChunk: (uploadId, chunk) => fetch(
    `/api/uploads/${encodeURIComponent(uploadId)}/chunk`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: chunk,
    },
  ),
  complete: (uploadId) => fetch(
    `/api/uploads/${encodeURIComponent(uploadId)}/complete`,
    { method: 'POST' },
  ),
  cancel: (uploadId) => fetch(`/api/uploads/${encodeURIComponent(uploadId)}`, { method: 'DELETE' }),
};

export const adminApi = {
  getData: () => fetch('/api/admin/data'),
  deleteFile: (userId, id) => fetch(
    `/api/admin/files/${encodeURIComponent(userId)}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  ),
  previewUrl: (userId, id) => (
    `/api/admin/files/${encodeURIComponent(userId)}/${encodeURIComponent(id)}/preview`
  ),
  downloadUrl: (userId, id) => (
    `/api/admin/files/${encodeURIComponent(userId)}/${encodeURIComponent(id)}/download`
  ),
};
