/**
 * Paramount Charters FMS — services/api.js
 * Centralised Axios instance + all API call helpers
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT token to every request ────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh token on 401 ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login:         (data)  => api.post('/auth/login/', data),
  register:      (data)  => api.post('/auth/register/', data),
  me:            ()      => api.get('/auth/me/'),
  updateProfile: (data)  => api.patch('/auth/update_profile/', data),
  logout:        (data)  => api.post('/auth/logout/', data),
};

// ── Dashboard ─────────────────────────────────────────────────────
export const dashboardAPI = {
  get:           (months = 12) => api.get(`/dashboard/?months=${months}`),
  client:        ()            => api.get('/client/dashboard/'),
  pilot:         ()            => api.get('/pilot/dashboard/'),
};

// ── Airports ──────────────────────────────────────────────────────
export const airportAPI = {
  list:    (search = '') => api.get(`/airports/?search=${search}`),
  get:     (id)          => api.get(`/airports/${id}/`),
  create:  (data)        => api.post('/airports/', data),
  update:  (id, data)    => api.patch(`/airports/${id}/`, data),
  delete:  (id)          => api.delete(`/airports/${id}/`),
};

// ── Aircraft ──────────────────────────────────────────────────────
export const aircraftAPI = {
  list:      (params = {}) => api.get('/aircraft/', { params }),
  get:       (id)          => api.get(`/aircraft/${id}/`),
  create:    (data)        => api.post('/aircraft/', data),
  update:    (id, data)    => api.patch(`/aircraft/${id}/`, data),
  delete:    (id)          => api.delete(`/aircraft/${id}/`),
  logHours:  (id, hours)   => api.post(`/aircraft/${id}/log_hours/`, { hours }),
  setStatus: (id, status)  => api.patch(`/aircraft/${id}/set_status/`, { status }),
};

// ── Crew ──────────────────────────────────────────────────────────
export const crewAPI = {
  list:      (params = {}) => api.get('/crew/', { params }),
  get:       (id)          => api.get(`/crew/${id}/`),
  create:    (data)        => api.post('/crew/', data),
  update:    (id, data)    => api.patch(`/crew/${id}/`, data),
  delete:    (id)          => api.delete(`/crew/${id}/`),
  myFlights: ()            => api.get('/crew/my_flights/'),
};

// ── Bookings (Admin) ──────────────────────────────────────────────
export const bookingAPI = {
  list:         (params = {}) => api.get('/admin/bookings/', { params }),
  get:          (id)          => api.get(`/admin/bookings/${id}/`),
  create:       (data)        => api.post('/admin/bookings/', data),
  update:       (id, data)    => api.patch(`/admin/bookings/${id}/`, data),
  delete:       (id)          => api.delete(`/admin/bookings/${id}/`),
  setPrice:     (id, data)    => api.post(`/admin/bookings/${id}/set_price/`, data),
  reply:        (id, data)    => api.post(`/admin/bookings/${id}/reply/`, data),
  assignCrew:   (id, data)    => api.patch(`/admin/bookings/${id}/assign_crew/`, data),
  updateStatus: (id, status)  => api.patch(`/admin/bookings/${id}/update_status/`, { status }),
};

// ── Bookings (Public / Client) ────────────────────────────────────
export const publicBookingAPI = {
  create: (data)      => api.post('/bookings/', data),
  track:  (reference) => api.get(`/bookings/track/${reference}/`),
};

// ── Maintenance ───────────────────────────────────────────────────
export const maintenanceAPI = {
  list:     (params = {}) => api.get('/admin/maintenance/', { params }),
  get:      (id)          => api.get(`/admin/maintenance/${id}/`),
  create:   (data)        => api.post('/admin/maintenance/', data),
  update:   (id, data)    => api.patch(`/admin/maintenance/${id}/`, data),
  delete:   (id)          => api.delete(`/admin/maintenance/${id}/`),
  upcoming: ()            => api.get('/admin/maintenance/upcoming/'),
};

// ── Emails ────────────────────────────────────────────────────────
export const emailAPI = {
  list:   (params = {}) => api.get('/admin/emails/', { params }),
  send:   (data)        => api.post('/admin/emails/send/', data),
};

// ── Commission ────────────────────────────────────────────────────
export const commissionAPI = {
  list:   () => api.get('/admin/commission/'),
  create: (data) => api.post('/admin/commission/', data),
};

// ── Users (Admin) ─────────────────────────────────────────────────
export const userAPI = {
  list:         (params = {}) => api.get('/admin/users/', { params }),
  get:          (id)          => api.get(`/admin/users/${id}/`),
  create:       (data)        => api.post('/admin/users/', data),
  update:       (id, data)    => api.patch(`/admin/users/${id}/`, data),
  toggleActive: (id)          => api.post(`/admin/users/${id}/toggle_active/`),
};

// ── Price Calculator ──────────────────────────────────────────────
export const calcAPI = {
  calculate: (data) => api.post('/price-calculator/', data),
};