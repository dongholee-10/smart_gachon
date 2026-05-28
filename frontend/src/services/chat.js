import api from './api';
import { getToken } from './auth';

const enc = encodeURIComponent;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const listChatMessages = (ticker) =>
  api.get(`/chat/stocks/${enc(ticker)}/messages`).then((r) => r.data);

export const sendChatMessage = (ticker, message) =>
  api.post(`/chat/stocks/${enc(ticker)}/messages`, { message }).then((r) => r.data);

export const clearChatHistory = (ticker) =>
  api.delete(`/chat/stocks/${enc(ticker)}/messages`).then(() => true);

/**
 * SSE 스트리밍으로 AI 응답을 받는다.
 * @param {string} ticker
 * @param {string} message
 * @param {(token: string) => void} onToken  - 글자가 올 때마다 호출
 * @param {(id: number) => void}   onDone   - 완료 시 저장된 메시지 ID
 * @param {(err: string) => void}  onError
 */
export const streamChatMessage = async (ticker, message, onToken, onDone, onError) => {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${BASE_URL}/chat/stocks/${enc(ticker)}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
  } catch (e) {
    onError('서버에 연결할 수 없습니다.');
    return;
  }

  if (!response.ok) {
    try {
      const err = await response.json();
      onError(err.detail || '스트리밍 실패');
    } catch {
      onError('스트리밍 실패');
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.token !== undefined) onToken(data.token);
        if (data.done) onDone(data.id);
        if (data.error) onError(data.error);
      } catch { /* malformed chunk, skip */ }
    }
  }
};
