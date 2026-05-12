import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ІНТЕРЦЕПТОР ЗАПИТІВ — додаємо токен
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sto_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ІНТЕРЦЕПТОР ВІДПОВІДЕЙ
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sto_token');
      localStorage.removeItem('sto_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ЗГРУПОВАНІ API-МЕТОДИ

/* Аутентифікація */
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

/* Довідник послуг та запчастин */
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

/* Наряди-замовлення */
export const appointmentsAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  delete: (id) => api.delete(`/appointments/${id}`),
  update: (id, data) => api.put(`/appointments/${id}`, data),
};

/* Користувачі (для форм адміна) */
export const usersAPI = {
  getAll:      (role) => api.get('/users', { params: role ? { role } : {} }),
  getClients:  ()     => api.get('/users', { params: { role: 'client' } }),
  getMechanics:()     => api.get('/users', { params: { role: 'mechanic' } }),
  update:      (id, data) => api.put(`/users/${id}`, data),
  delete:      (id)       => api.delete(`/users/${id}`),
};

export default api;