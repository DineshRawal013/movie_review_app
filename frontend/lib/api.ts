import axios from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const csrf = Cookies.get('csrf_token');
  if (csrf && config.method !== 'get') {
    config.headers['x-csrf-token'] = csrf;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: any = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && original.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (err) {
        processQueue(err, null);
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  logout: () => api.post('/auth/logout'),
};

export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (data: { displayName?: string }) => api.patch('/users/me', data),
  deleteMe: () => api.delete('/users/me'),
};

export const moviesApi = {
  list: (params?: { page?: number; limit?: number; genreId?: number; search?: string }) =>
    api.get('/movies', { params }),
  trending: (params?: { page?: number }) => api.get('/movies/trending', { params }),
  search: (q: string, page = 1) => api.get('/movies/search', { params: { q, page } }),
  get: (id: number) => api.get(`/movies/${id}`),
};

export const reviewsApi = {
  list: (movieId: number, params?: { page?: number; limit?: number }) =>
    api.get(`/movies/${movieId}/reviews`, { params }),
  create: (movieId: number, data: { body: string }) =>
    api.post(`/movies/${movieId}/reviews`, data),
  update: (id: string, data: { body?: string }) =>
    api.put(`/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  flag: (id: string, reason: string) => api.post(`/reviews/${id}/flag`, { reason }),
  unflag: (id: string) => api.delete(`/reviews/${id}/flag`),
};

export const ratingsApi = {
  get: (movieId: number) => api.get(`/movies/${movieId}/rating`),
  upsert: (movieId: number, value: number) => api.put(`/movies/${movieId}/rating`, { value }),
  delete: (movieId: number) => api.delete(`/movies/${movieId}/rating`),
};

export const adminApi = {
  flaggedReviews: (params?: { page?: number }) =>
    api.get('/admin/reviews/flagged', { params }),
  hideReview: (id: string) => api.post(`/admin/reviews/${id}/hide`),
  restoreReview: (id: string) => api.post(`/admin/reviews/${id}/restore`),
  deleteReview: (id: string) => api.delete(`/admin/reviews/${id}`),
  listUsers: (params?: { page?: number }) => api.get('/admin/users', { params }),
  setRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),
};
