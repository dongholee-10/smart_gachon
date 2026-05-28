import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, Legend,
} from 'recharts';
import { compareStocks, searchStocks } from '../services/api';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
const MAX_TICKERS = 4;

const CATEGORY_INFO = {
  legal:      { label: '법적 리스크',  desc: '소송·재판·합의 등 법적 분쟁 관련 단어가 감지됐습니다.' },
  regulatory: { label: '규제 리스크',  desc: '공정위·금감원 조사·제재·벌금 관련 단어가 감지됐습니다.' },
  financial:  { label: '재무 리스크',  desc: '적자·손실·파산·부채 등 재무 악화 관련 단어가 감지됐습니다.' },
  management: { label: '경영 리스크',  desc: 'CEO 사임·횡령·배임·분식회계 관련 단어가 감지됐습니다.' },
  market:     { label: '시장 리스크',  desc: '급락·하락·목표가 하향 등 시장 부정 신호 단어가 감지됐습니다.' },
};

function StockInput({ value, onChange, onRemove, canRemove, color, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (val) => {
    onChange(val);
    clearTimeout(timer.current);
    if (!val.trim()) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const results = await searchStocks(val.trim());
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch { setSuggestions([]); }
    }, 250);
  };

  const select = (name) => {
    onChange(name);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-44 rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          style={{ borderColor: '#e2e8f0', borderLeftColor: color, borderLeftWidth: 3 }}
        />
        {canRemove && (
          <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition text-lg leading-none">×</button>
        )}
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 w-56 rounded-xl border border-slate-100 bg-white shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li
              key={s.ticker}
              onMouseDown={() => select(s.name)}
              className="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50"
            >
              <span className="font-semibold text-slate-800">{s.name}</span>
              <span className="text-xs text-slate-400">{s.ticker} · {s.market}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const riskColor = (level) => {
  const l = (level || '').toLowerCase();
  if (l === 'high') return 'text-red-500';
  if (l === 'medium') return 'text-orange-400';
  return 'text-emerald-500';
};

const riskBg = (level) => {
  const l = (level || '').toLowerCase();
  if (l === 'high') return 'bg-red-50 border-red-200';
  if (l === 'medium') return 'bg-orange-50 border-orange-200';
  return 'bg-emerald-50 border-emerald-200';
};

const avgRisk = (results) => {
  if (!results.length) return 0;
  return Math.round(results.reduce((s, r) => s + (r.risk_score ?? 0), 0) / results.length);
};

const dominantLevel = (results) => {
  if (!results.length) return '-';
  const counts = {};
  results.forEach((r) => { counts[r.risk_level] = (counts[r.risk_level] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

const topFactors = (results) => {
  const freq = {};
  const catMap = {};
  results.forEach((r) =>
    (r.risk_factors || []).forEach((f) => {
      freq[f.keyword] = (freq[f.keyword] || 0) + 1;
      catMap[f.keyword] = f.category;
    })
  );
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw]) => ({ keyword: kw, category: catMap[kw] }));
};

export default function Compare() {
  const [tickers, setTickers] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState(null);
  const [error, setError] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

  const addTicker = () => {
    if (tickers.length < MAX_TICKERS) setTickers([...tickers, '']);
  };
  const removeTicker = (i) => {
    if (tickers.length <= 2) return;
    setTickers(tickers.filter((_, idx) => idx !== i));
  };
  const updateTicker = (i, val) => {
    const next = [...tickers];
    next[i] = val;
    setTickers(next);
  };

  const handleCompare = async () => {
    const valid = tickers.map((t) => t.trim()).filter(Boolean);
    if (valid.length < 2) {
      setError('종목을 2개 이상 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    setComparisons(null);
    try {
      const data = await compareStocks(valid, 5);
      setComparisons(data);
    } catch (e) {
      setError(e.response?.data?.detail || '비교 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = comparisons?.map((c, i) => ({
    name: c.company,
    평균리스크: avgRisk(c.results),
    color: COLORS[i % COLORS.length],
  })) ?? [];

  const radarData = (() => {
    if (!comparisons) return [];
    const allFactors = [...new Map(
      comparisons.flatMap((c) => topFactors(c.results)).map((f) => [f.keyword, f])
    ).values()].slice(0, 6).map((f) => f.keyword);
    return allFactors.map((kw) => {
      const entry = { factor: kw };
      comparisons.forEach((c) => {
        const count = c.results.reduce(
          (s, r) => s + (r.risk_factors || []).filter((f) => f.keyword === kw).length, 0
        );
        entry[c.company] = count;
      });
      return entry;
    });
  })();

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      {/* 헤더 */}
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black tracking-tighter text-slate-900">
          종목 비교
        </h2>
        <p className="mt-2 text-slate-500">
          최대 4개 종목의 최신 뉴스를 동시에 분석해 리스크를 비교합니다.
        </p>
      </div>

      {/* 입력 영역 */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm mb-8">
        <div className="flex flex-wrap gap-3 mb-4">
          {tickers.map((t, i) => (
            <StockInput
              key={i}
              value={t}
              onChange={(val) => updateTicker(i, val)}
              onRemove={() => removeTicker(i)}
              canRemove={tickers.length > 2}
              color={COLORS[i % COLORS.length]}
              placeholder={`종목 ${i + 1} (예: 삼성전자)`}
            />
          ))}
          {tickers.length < MAX_TICKERS && (
            <button
              onClick={addTicker}
              className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-500 transition"
            >
              + 종목 추가
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <button
          onClick={handleCompare}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? '분석 중... (뉴스 수집 + AI 분석)' : '비교 분석 시작'}
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-20 text-slate-400 animate-pulse">
          <p className="text-4xl mb-4">🔍</p>
          <p>각 종목의 최신 뉴스를 수집하고 AI가 분석 중입니다...</p>
        </div>
      )}

      {/* 결과 */}
      {comparisons && !loading && (
        <div className="space-y-8">
          {/* 요약 카드 */}
          <div className={`grid gap-4 grid-cols-${comparisons.length}`} style={{ gridTemplateColumns: `repeat(${comparisons.length}, 1fr)` }}>
            {comparisons.map((c, i) => {
              const avg = avgRisk(c.results);
              const level = dominantLevel(c.results);
              const factors = topFactors(c.results);
              return (
                <div
                  key={c.company}
                  className={`rounded-2xl border p-5 ${riskBg(level)}`}
                  style={{ borderLeftColor: COLORS[i % COLORS.length], borderLeftWidth: 4 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-slate-800">{c.company}</span>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] + '22', color: COLORS[i % COLORS.length] }}
                    >
                      {level.toUpperCase()} RISK
                    </span>
                  </div>
                  <p className={`text-4xl font-black mb-1 ${riskColor(level)}`}>{avg}<span className="text-base font-semibold text-slate-400">점</span></p>
                  <p className="text-xs text-slate-400 mb-3">평균 리스크 점수 · 뉴스 {c.news_count}건 분석</p>
                  {factors.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {factors.map(({ keyword, category }) => {
                        const info = CATEGORY_INFO[category] || {};
                        return (
                          <div key={keyword} className="relative group">
                            <span className="text-xs bg-white/70 border border-slate-200 rounded-full px-2 py-0.5 text-slate-600 cursor-default">
                              {keyword}
                            </span>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl bg-slate-800 px-3 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                              <p className="font-bold mb-0.5">{info.label || category}</p>
                              <p className="text-slate-300 leading-relaxed">{info.desc}</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 막대 차트 */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4">평균 리스크 점수 비교</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`${v}점`, '평균 리스크']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Bar dataKey="평균리스크" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 리스크 요인 분포 */}
          {radarData.length >= 3 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4">리스크 요인 분포</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12 }} />
                  {comparisons.map((c, i) => (
                    <Radar
                      key={c.company}
                      name={c.company}
                      dataKey={c.company}
                      stroke={COLORS[i % COLORS.length]}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : radarData.length > 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-4">리스크 요인 빈도</h3>
              <div className="space-y-3">
                {radarData.map((row) => (
                  <div key={row.factor}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700">{row.factor}</span>
                    </div>
                    <div className="flex gap-2">
                      {comparisons.map((c, i) => (
                        <div key={c.company} className="flex-1">
                          <div className="text-xs text-slate-400 mb-0.5">{c.company}</div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min((row[c.company] || 0) * 20, 100)}%`,
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                            />
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{row[c.company] || 0}건</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 뉴스 목록 */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <h3 className="font-bold text-slate-700 px-6 pt-5 pb-3">분석된 뉴스 목록</h3>
            {comparisons.map((c, i) => (
              <div key={c.company} className="border-t border-slate-100">
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-semibold text-slate-800">{c.company}</span>
                    <span className="text-xs text-slate-400">{c.news_count}건</span>
                  </div>
                  <span className="text-slate-300 text-lg">{openIdx === i ? '▲' : '▼'}</span>
                </button>

                {openIdx === i && (
                  <div className="px-6 pb-4 space-y-3">
                    {c.results.length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">분석 결과가 없습니다.</p>
                    ) : (
                      c.results.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-slate-100 p-4 bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-800 leading-snug">{r.title}</p>
                            <span className={`text-sm font-black flex-shrink-0 ${riskColor(r.risk_level)}`}>
                              {r.risk_score}점
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{r.explanation}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
