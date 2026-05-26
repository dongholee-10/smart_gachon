import api from './api';

export const searchStocks = (q, limit = 20) =>
  api.get('/stocks/search', { params: { q, limit } }).then((r) => r.data);

export const fetchTrendingStocks = (limit = 8) =>
  api.get('/stocks/trending', { params: { limit } }).then((r) => r.data);

export const fetchStockQuote = (ticker) =>
  api.get(`/stocks/quote/${ticker}`).then((r) => r.data);
