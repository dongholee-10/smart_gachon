import api from './api';

// ─────────────────────────────────────────────
// 🔧 Mock 모드
// 백엔드 /watchlist 완성되면 useMockWatchlist = false
// ─────────────────────────────────────────────
export const useMockWatchlist = true;

let MOCK_WATCHLIST = [
  { id: 1, ticker: '005930', name: '삼성전자', memo: '반도체 업황 모니터링', addedAt: '2026-05-01T00:00:00Z' },
  { id: 2, ticker: '000660', name: 'SK하이닉스', memo: 'HBM 수요 확인 중', addedAt: '2026-05-05T00:00:00Z' },
];

export const mockGetWatchlist = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return [...MOCK_WATCHLIST];
};

export const mockAddWatchlist = async ({ ticker, name, memo }) => {
  await new Promise((r) => setTimeout(r, 500));
  if (MOCK_WATCHLIST.find((w) => w.ticker === ticker)) {
    throw new Error('이미 관심종목에 추가된 종목입니다.');
  }
  const item = { id: Date.now(), ticker, name, memo: memo || '', addedAt: new Date().toISOString() };
  MOCK_WATCHLIST.push(item);
  return item;
};

export const mockDeleteWatchlist = async (id) => {
  await new Promise((r) => setTimeout(r, 400));
  MOCK_WATCHLIST = MOCK_WATCHLIST.filter((w) => w.id !== id);
};

export const mockUpdateMemo = async (id, memo) => {
  await new Promise((r) => setTimeout(r, 400));
  const item = MOCK_WATCHLIST.find((w) => w.id === id);
  if (item) item.memo = memo;
  return item;
};

// ─────────────────────────────────────────────
// 실제 API (useMockWatchlist = false 시 사용)
// ─────────────────────────────────────────────
export const getWatchlist = () => api.get('/watchlist').then((r) => r.data);
export const addWatchlist = (data) => api.post('/watchlist', data).then((r) => r.data);
export const deleteWatchlist = (id) => api.delete(`/watchlist/${id}`).then((r) => r.data);
export const updateMemo = (id, memo) => api.patch(`/watchlist/${id}`, { memo }).then((r) => r.data);