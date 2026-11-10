import axios from 'axios';
import { isTokenExpired, clearAuthSession } from '../utils/token';

// Normalize base URL to handle trailing slashes and ensure /api prefix
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) {
    return '/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const axiosClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const isPublicAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/signup');

    // Never attach Authorization header or cancel requests on public authentication entrypoints
    if (isPublicAuthRoute) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }

    const rawToken = localStorage.getItem('token');
    if (rawToken) {
      if (isTokenExpired(rawToken)) {
        clearAuthSession();
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          sessionStorage.setItem('preppilot_auth_redirect_reason', 'Your session has expired. Please log in again.');
          window.dispatchEvent(new Event('auth:unauthorized'));
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
        return Promise.reject(new axios.Cancel('Session expired. Redirecting to login.'));
      }
      config.headers.Authorization = `Bearer ${rawToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If request was cancelled intentionally due to expired token, suppress redundant notifications
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const userMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.response?.status === 500
        ? 'Internal server error. Please try again later.'
        : error.message || 'An unexpected error occurred. Please try again.');

    error.userMessage = userMessage;

    if (error.response && error.response.status === 401) {
      // Don't trigger unauthorized logout if we're on login or register page already
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        clearAuthSession();
        const reason = error.response?.data?.message || 'Your session has expired. Please log in again.';
        sessionStorage.setItem('preppilot_auth_redirect_reason', reason);
        window.dispatchEvent(new Event('auth:unauthorized'));
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
