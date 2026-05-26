import api from './api';

export const searchStocks = (q, limit = 20) =>
  api.get('/stocks/search', { params: { q, limit } }).then((r) => r.data);
