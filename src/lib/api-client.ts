import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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

const REFRESH_EXCLUDED_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/logout',
  '/auth/register',
  '/auth/register-teacher',
  '/auth/register-student',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
]);

function getRequestPath(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url, apiClient.defaults.baseURL).pathname;
  } catch {
    return url.split('?')[0] ?? '';
  }
}

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

function shouldNormalizeResponseData(data: unknown, responseType?: unknown): boolean {
  if (!data) return false;
  if (responseType === 'blob' || responseType === 'arraybuffer') return false;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return false;
  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) return false;
  return true;
}

apiClient.interceptors.response.use(
  (response) => {
    if (shouldNormalizeResponseData(response.data, response.config.responseType)) {
      response.data = normalizeIds(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestPath = getRequestPath(originalRequest.url);
    const shouldSkipRefresh = REFRESH_EXCLUDED_AUTH_PATHS.has(requestPath);

    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const { data } = await axios.post(
              `${apiClient.defaults.baseURL}/auth/refresh`,
              undefined,
              { withCredentials: true },
            );
            const payload = data?.data ?? data;
            const newAccess = payload?.accessToken ?? payload?.access_token;
            const newRefresh = payload?.refreshToken ?? payload?.refresh_token;
            if (!newAccess) {
              throw new Error('Token refresh did not return an access token');
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem('accessToken', newAccess);
              if (newRefresh) {
                localStorage.setItem('refreshToken', newRefresh);
              }
            }
            return newAccess;
          })();
        }
        const newAccessToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          if (window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
        return Promise.reject(error);
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
