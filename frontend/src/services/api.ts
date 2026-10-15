import axios from 'axios';

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Local dev uses the Vite proxy (/api) so cookies stay same-origin; production
// talks to the API host directly with its credentials-mode cookies.
const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  '/api';

export const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

export const getSessionToken = (): string => getCookie('access_token') ?? '';

export const getRefreshToken = (): string =>
  getCookie('refresh_token') ?? localStorage.getItem('refresh_token') ?? '';

export const getCsrfToken = (): string =>
  getCookie('csrf_token') ?? sessionStorage.getItem('csrf_token') ?? '';

export const setCsrfToken = (token: string) => {
  if (token) sessionStorage.setItem('csrf_token', token);
};

export const clearSession = () => {
  sessionStorage.removeItem('csrf_token');
};

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = getSessionToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    const method = (config.method || 'get').toLowerCase();
    if (
      method !== 'get' &&
      method !== 'head' &&
      method !== 'options' &&
      !config.headers.has('X-CSRF-Token')
    ) {
      const csrf = getCsrfToken();
      if (csrf) config.headers.set('X-CSRF-Token', csrf);
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.delete('Content-Type');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

const redirectToLogin = () => {
  clearSession();
  const go = () => {
    window.location.href = '/login';
  };
  // A revoked/expired session must also clear the auth cookies server-side
  // (especially the readable csrf_token). If they survive, the next page load
  // re-detects a session, 401s, and bounces back here in an infinite loop.
  if (getCsrfToken()) {
    api.post('/auth/logout').catch(() => {}).finally(go);
    setTimeout(go, 1500);
    return;
  }
  go();
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isLoginRequest = originalRequest.url?.includes('/auth/login');
    // The access/refresh cookies are httpOnly so JS can't read them; the
    // non-httpOnly csrf_token (cookie or sessionStorage) is the only
    // JS-readable marker that a session exists.
    const hasSession = !!getCsrfToken();

    // A 401 on the login endpoint means bad credentials, not an expired token.
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest && hasSession) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.set('Authorization', `Bearer ${token}`);
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // The httpOnly refresh cookie authenticates this call; no token body needed.
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          undefined,
          { withCredentials: true }
        );
        const newToken = data?.data?.accessToken as string | undefined;
        if (!newToken) throw new Error('Refresh failed');

        if (data?.data?.csrfToken) setCsrfToken(data.data.csrfToken);
        processQueue(null, newToken);
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Network-level failure (backend not running / restarting)
    if (!error.response) {
      return Promise.reject(
        new Error('Cannot reach the server. Please make sure the API server is running, then try again.')
      );
    }

    return Promise.reject(error);
  }
);

export default api;