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
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">
            ⭐ 관심종목
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            관심 있는 종목을 등록하고 빠르게 리스크를 분석하세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all"
        >
          {showForm ? '취소' : '+ 종목 추가'}
        </button>
      </div>

      {useMockWatchlist && (
        <span className="inline-block mb-6 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full font-semibold dark:bg-yellow-900/30 dark:text-yellow-400">
          ⚙ Mock 모드 — 백엔드 /watchlist 연결 전
        </span>
      )}

      {/* 추가 폼 */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">관심종목 추가</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="종목 코드 (예: 005930)"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
            />
            <input
              type="text"
              placeholder="종목명 (예: 삼성전자)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
            />
          </div>
          <input
            type="text"
            placeholder="메모 (선택사항)"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all"
          >
            추가하기
          </button>
        </form>
      )}

      {/* 종목 리스트 */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">불러오는 중...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
          <p className="text-2xl mb-3">⭐</p>
          <p className="text-slate-400">관심종목을 추가해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((item) => (
            <div
              key={item.id}
              className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
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
                    className="text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 font-bold px-4 py-2 rounded-xl hover:bg-red-100 transition disabled:opacity-50"
                  >
                    {analyzingId === item.id ? '분석 중...' : '🚩 리스크 분석'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-sm text-slate-400 hover:text-red-500 transition font-semibold px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
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
                      className="flex-1 p-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
                    />
                    <button
                      onClick={() => handleSaveMemo(item.id)}
                      className="text-sm bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditMemo((prev) => { const n = { ...prev }; delete n[item.id]; return n; })}
                      className="text-sm text-slate-400 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
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
                      {item.memo || '메모 없음 — 클릭하여 추가'}
                    </p>
                    <span className="text-xs text-slate-300 group-hover:text-slate-500 transition">✏️</span>
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
