import axios from 'axios';

const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'https://SocialScravio-backend.onrender.com/api/v1';
  // Fix trailing slashes
  url = url.replace(/\/+$/, '');
  // Ensure it ends with /api/v1 if it's the backend root
  if (url.startsWith('http') && !url.endsWith('/api/v1') && !url.endsWith('/api')) {
    url += '/api/v1';
  } else if (url.endsWith('/api')) {
    url += '/v1';
  }
  return url;
};

const api = axios.create({
  baseURL: getApiUrl(),
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('SocialScravio_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
