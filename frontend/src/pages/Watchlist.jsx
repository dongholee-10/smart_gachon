import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useMockWatchlist,
  mockGetWatchlist, mockAddWatchlist, mockDeleteWatchlist, mockUpdateMemo,
  getWatchlist, addWatchlist, deleteWatchlist, updateMemo,
} from '../services/watchlist';
import { analyzeNews } from '../services/api';
import StockAutocomplete from '../components/StockAutocomplete';

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
  const [selectedStock, setSelectedStock] = useState(null); // {ticker, name, market}
  const [memo, setMemo] = useState('');
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
    if (!selectedStock) return alert('드롭다운에서 종목을 선택해주세요.');
    if (list.some((item) => item.ticker === selectedStock.ticker)) {
      return alert('이미 등록된 관심종목입니다.');
    }

    try {
      const payload = { ticker: selectedStock.ticker, name: selectedStock.name, memo };
      const item = useMockWatchlist
        ? await mockAddWatchlist(payload)
        : await addWatchlist(payload);
      setList((prev) => [...prev, item]);
      setSelectedStock(null);
      setMemo('');
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
    <div className="page-shell max-w-5xl py-8 lg:py-10">
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-[#03c75a] tracking-normal">Watchlist</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            관심종목
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            관심 있는 종목을 등록하고 빠르게 리스크를 분석하세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-[#03c75a] px-6 py-3 text-sm font-black text-white transition hover:bg-[#02b350]"
        >
          {showForm ? '취소' : '종목 추가'}
        </button>
      </div>

      {useMockWatchlist && (
        <span className="mb-5 inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          데모 데이터 사용 중
        </span>
      )}

      {/* 추가 폼 */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">관심종목 추가</h3>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500">
              종목 검색
            </label>
            <StockAutocomplete
              value={selectedStock}
              onChange={setSelectedStock}
              placeholder="종목명 검색 (예: 삼성)"
            />
            {selectedStock && (
              <p className="mt-2 text-xs text-slate-400">
                선택됨: <span className="font-bold text-slate-700">{selectedStock.name}</span>{' '}
                <span className="font-mono">({selectedStock.market} · {selectedStock.ticker})</span>
              </p>
            )}
          </div>
          <input
            type="text"
            placeholder="메모 (선택사항)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="field-input rounded-lg p-3"
          />
          <button
            type="submit"
            disabled={!selectedStock}
            className="rounded-xl bg-[#03c75a] px-8 py-3 text-sm font-black text-white transition hover:bg-[#02b350] disabled:opacity-50"
          >
            추가하기
          </button>
        </form>
      )}

      {/* 종목 리스트 */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">불러오는 중...</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <p className="text-slate-400">관심종목을 추가해보세요!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {list.map((item) => (
            <div
              key={item.id}
              className="border-b border-slate-100 p-5 last:border-b-0"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl font-black text-slate-900">{item.name}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>추가일 {formatDate(item.addedAt)}</span>
                    <button
                      onClick={() => setEditMemo((prev) => ({ ...prev, [item.id]: item.memo }))}
                      className="font-bold text-[#03c75a] hover:text-[#02a84b]"
                    >
                      메모 수정
                    </button>
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleAnalyze(item)}
                    disabled={analyzingId === item.id}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 transition hover:border-[#03c75a] hover:bg-lime-50 disabled:opacity-50"
                  >
                    {analyzingId === item.id ? '분석 중' : '리스크 분석'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-xl px-3 py-2 text-sm font-bold text-slate-400 transition hover:bg-slate-50 hover:text-red-500"
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
                      className="rounded-lg bg-[#03c75a] px-4 py-2 text-sm font-bold text-white"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditMemo((prev) => { const n = { ...prev }; delete n[item.id]; return n; })}
                      className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-100"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    {item.memo || '메모 없음'}
                  </p>
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
