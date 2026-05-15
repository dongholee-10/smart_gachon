import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ─────────────────────────────────────────────
// Real API helpers
// ─────────────────────────────────────────────

export const searchNews = async (query, display = 10) => {
  const { data } = await api.get('/news', { params: { query, display } });
  return data.news || [];
};

export const analyzeNews = async ({ title, content, text, ticker, news_link }) => {
  const { data } = await api.post('/analyze', { title, content, text, ticker, news_link });
  return data;
};

export const fetchReport = async (resultId) => {
  const { data } = await api.post('/report', { result_id: resultId });
  return data;
};
