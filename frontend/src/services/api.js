import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, full_name) => api.post('/auth/register', { email, password, full_name }),
  me: () => api.get('/auth/me'),
};

export const vpcApi = {
  list: () => api.get('/vpcs'),
  create: (name) => api.post('/vpcs', { name }),
  delete: (id) => api.delete(`/vpcs/${id}`),
  getWireguardConfig: (id) => api.get(`/vpcs/${id}/wireguard-config`),
};

export const vpsApi = {
  list: () => api.get('/vps'),
  create: (data) => api.post('/vps', data),
  get: (id) => api.get(`/vps/${id}`),
  getStats: (id) => api.get(`/vps/${id}/stats`),
  action: (id, action) => api.post(`/vps/${id}/action`, { action }),
  getConsole: (id) => api.get(`/vps/${id}/console`),
  delete: (id) => api.delete(`/vps/${id}`),
};

export const domainApi = {
  list: () => api.get('/routes'),
  create: (data) => api.post('/routes', data),
  delete: (id) => api.delete(`/routes/${id}`),
};

export const portApi = {
  list: () => api.get('/ports'),
  create: (data) => api.post('/ports', data),
  delete: (id) => api.delete(`/ports/${id}`),
};

export const billingApi = {
  getSubscription: () => api.get('/billing/subscription'),
  getPlans: () => api.get('/billing/plans'),
  checkout: (plan_id) => api.post('/billing/checkout', { plan_id }),
  simulateActivate: (plan_id) => api.post(`/billing/simulate-activate?plan_id=${plan_id}`),
};

export const adminApi = {
  getStatus: () => api.get('/admin/status'),
};

export default api;
