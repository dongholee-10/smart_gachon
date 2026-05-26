import { useEffect, useRef, useState } from 'react';
import { searchStocks } from '../services/stocks';

/**
 * 종목명 자동완성 입력.
 *
 * Props:
 *  - value: 현재 선택된 종목 객체 `{ ticker, name, market }` 또는 null
 *  - onChange(stock | null): 사용자가 항목을 클릭/지웠을 때 호출
 *  - placeholder
 *  - allowClear: true 면 X 버튼 노출 (기본 true)
 *  - autoFocus
 *
 * 사용:
 *   <StockAutocomplete value={selected} onChange={setSelected} />
 *
 * 종목코드는 UI 에 표시만 하고 입력은 받지 않음 — 사용자는 이름으로만 검색.
 */
export default function StockAutocomplete({
  value,
  onChange,
  placeholder = '종목명 검색 (예: 삼성)',
  allowClear = true,
  autoFocus = false,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // 부모가 선택한 종목을 외부에서 비우면 query 도 따라 비움
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  // 입력 시 200ms 디바운스 후 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchStocks(q, 15);
        setResults(data);
      } catch (e) {
        console.error('종목 검색 실패:', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // 외부 클릭 시 dropdown 닫기
  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selectStock = (stock) => {
    onChange?.(stock);
    setQuery(stock.name);
    setOpen(false);
  };

  const clear = () => {
    onChange?.(null);
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value ? value.name : query}
          onChange={(e) => {
            // 사용자가 입력 시작하면 기존 선택 무효화
            if (value) onChange?.(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="field-input w-full rounded-lg p-3 pr-10"
          autoComplete="off"
        />
        {allowClear && (value || query) && (
          <button
            type="button"
            onClick={clear}
            aria-label="입력 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* dropdown */}
      {open && query.trim() && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading && (
            <div className="p-3 text-xs text-slate-400">검색 중...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-slate-400">
              일치하는 종목이 없습니다.
            </div>
          )}
          {!loading &&
            results.map((s) => (
              <button
                key={s.ticker}
                type="button"
                onClick={() => selectStock(s)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="font-bold text-slate-800 dark:text-white">
                  {s.name}
                </span>
                <span className="text-xs text-slate-400">
                  {s.market} · {s.ticker}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
