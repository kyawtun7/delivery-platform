// client/src/api.js
import axios from 'axios';

// Base URL: from env in production, localhost in dev
const RAW_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Strip any trailing slashes just in case
export const API_BASE = RAW_BASE.replace(/\/+$/, '');

// Axios instance that all components use
export const api = axios.create({
  baseURL: `${API_BASE}/api`
});

// Helper to attach/remove JWT token on all requests
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Optional: keep token in localStorage for refresh
    window.localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    window.localStorage.removeItem('token');
  }
}
