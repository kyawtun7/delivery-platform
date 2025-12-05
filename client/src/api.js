import axios from 'axios';

// Strip any trailing slash from env base
const RAW_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
export const API_BASE = RAW_BASE.replace(/\/+$/, '');

export const api = axios.create({
  baseURL: `${API_BASE}/api`
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}
