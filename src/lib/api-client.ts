import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Deduplicate concurrent token refresh attempts
let refreshPromise: Promise<string> | null = null;

function normalizeIds(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizeIds);
  if (obj !== null && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      if (key === '_id' && !('id' in record)) {
        result['id'] = record._id;
      }
      result[key] = normalizeIds(record[key]);
    }
    return result;
  }
  return obj;
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = normalizeIds(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            const { data } = await axios.post(
              `${apiClient.defaults.baseURL}/auth/refresh`,
              { refreshToken }
            );
            const newAccess = data.data.accessToken;
            const newRefresh = data.data.refreshToken;
            localStorage.setItem('accessToken', newAccess);
            if (newRefresh) {
              localStorage.setItem('refreshToken', newRefresh);
            }
            return newAccess;
          })();
        }
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
