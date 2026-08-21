import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const userMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.response?.status === 500
        ? 'Internal server error. Please try again later.'
        : error.message || 'An unexpected error occurred. Please try again.');

    error.userMessage = userMessage;

    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if we're on login page already
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
