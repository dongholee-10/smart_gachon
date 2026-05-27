import api from './api';

const enc = encodeURIComponent;

export const listChatMessages = (ticker) =>
  api.get(`/chat/stocks/${enc(ticker)}/messages`).then((r) => r.data);

export const sendChatMessage = (ticker, message) =>
  api.post(`/chat/stocks/${enc(ticker)}/messages`, { message }).then((r) => r.data);

export const clearChatHistory = (ticker) =>
  api.delete(`/chat/stocks/${enc(ticker)}/messages`).then(() => true);
