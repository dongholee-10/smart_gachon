import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useMockWatchlist,
  mockGetWatchlist, mockAddWatchlist, mockDeleteWatchlist, mockUpdateMemo,
  getWatchlist, addWatchlist, deleteWatchlist, updateMemo,
} from '../services/watchlist';
import { analyzeNews } from '../services/api';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return ''; }
};

function Watchlist() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: '', name: '', memo: '' });
  const [editMemo, setEditMemo] = useState({}); // id -> memo 편집 상태
  const [analyzingId, setAnalyzingId] = useState(null);

  useEffect(() => {
    const fetchList = async () => {
      setIsLoading(true);
      try {
        const data = useMockWatchlist ? await mockGetWatchlist() : await getWatchlist();
        setList(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchList();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.ticker.trim() || !form.name.trim()) return alert('종목 코드와 종목명을 입력해주세요.');
    if (list.some((item) => item.ticker === form.ticker.trim())) {
      return alert('이미 등록된 관심종목입니다.');
    }
    
    try {
      const item = useMockWatchlist
        ? await mockAddWatchlist(form)
        : await addWatchlist(form);
      setList((prev) => [...prev, item]);
      setForm({ ticker: '', name: '', memo: '' });
      setShowForm(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('관심종목에서 삭제할까요?')) return;
    try {
      useMockWatchlist ? await mockDeleteWatchlist(id) : await deleteWatchlist(id);
      setList((prev) => prev.filter((w) => w.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleSaveMemo = async (id) => {
    const memo = editMemo[id];
    if (memo === undefined) return;
    try {
      useMockWatchlist ? await mockUpdateMemo(id, memo) : await updateMemo(id, memo);
      setList((prev) => prev.map((w) => w.id === id ? { ...w, memo } : w));
      setEditMemo((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) { console.error(e); }
  };

  // 관심종목 바로 분석
  const handleAnalyze = async (item) => {
    setAnalyzingId(item.id);
    try {
      const result = await analyzeNews({
        title: `${item.name} (${item.ticker}) 분석`,
        content: item.memo || `${item.name} ${item.ticker}`,
        text: `${item.name} ${item.ticker} ${item.memo || ''}`,
        ticker: item.ticker,
      });
      navigate('/analysis', { state: { result } });
    } catch (e) {
      alert(e.response?.data?.detail || '분석 요청에 실패했습니다.');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="page-shell max-w-5xl py-10 lg:py-14">
      {/* 헤더 */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-red-600 tracking-normal dark:text-red-400">Watchlist</p>
          <h2 className="section-title mt-2 text-4xl">
            관심종목
          </h2>
          <p className="muted-copy mt-2 text-sm">
            관심 있는 종목을 등록하고 빠르게 리스크를 분석하세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="primary-button rounded-lg px-6 py-3 font-black"
        >
          {showForm ? '취소' : '종목 추가'}
        </button>
      </div>

      {useMockWatchlist && (
        <span className="mb-6 inline-block rounded-md border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-300">
          Mock 모드 — 백엔드 /watchlist 연결 전
        </span>
      )}

      {/* 추가 폼 */}
      {showForm && (
        <form onSubmit={handleAdd} className="surface-panel mb-8 space-y-4 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 dark:text-white">관심종목 추가</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="종목 코드 (예: 005930)"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              className="field-input rounded-lg p-3"
            />
            <input
              type="text"
              placeholder="종목명 (예: 삼성전자)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field-input rounded-lg p-3"
            />
          </div>
          <input
            type="text"
            placeholder="메모 (선택사항)"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="field-input rounded-lg p-3"
          />
          <button
            type="submit"
            className="primary-button rounded-lg px-8 py-3 font-black"
          >
            추가하기
          </button>
        </form>
      )}

      {/* 종목 리스트 */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">불러오는 중...</div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 py-20 text-center dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-slate-400">관심종목을 추가해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((item) => (
            <div
              key={item.id}
              className="surface-panel rounded-xl p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-black text-slate-900 dark:text-white">{item.name}</span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono">
                        {item.ticker}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">추가일: {formatDate(item.addedAt)}</span>
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAnalyze(item)}
                    disabled={analyzingId === item.id}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
                  >
                    {analyzingId === item.id ? '분석 중' : '리스크 분석'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 메모 */}
              <div className="mt-4">
                {editMemo[item.id] !== undefined ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editMemo[item.id]}
                      onChange={(e) => setEditMemo((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="field-input flex-1 rounded-lg p-2 text-sm"
                    />
                    <button
                      onClick={() => handleSaveMemo(item.id)}
                      className="primary-button rounded-lg px-4 py-2 text-sm font-bold"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditMemo((prev) => { const n = { ...prev }; delete n[item.id]; return n; })}
                      className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => setEditMemo((prev) => ({ ...prev, [item.id]: item.memo }))}
                  >
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {item.memo || '메모 없음 - 클릭하여 추가'}
                    </p>
                    <span className="text-xs text-slate-300 transition group-hover:text-slate-500">Edit</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Watchlist;
