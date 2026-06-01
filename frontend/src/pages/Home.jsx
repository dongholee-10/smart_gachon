import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { analyzeNews, searchNews, fetchLatestNews, searchStocks } from '../services/api';
import {
  fetchTrendingStocks, fetchStockHistory, fetchKospiHistory, fetchStockQuote,
} from '../services/stocks';
import { getWatchlist } from '../services/watchlist';
import AnimatedRiskGauge from '../components/AnimatedRiskGauge';

// 백엔드 /stocks/trending 응답이 빌 때 (네이버 API 미연결 등) 보여줄 안전한 fallback.
// 평소엔 실시간 핫 종목으로 자동 교체된다.
const FALLBACK_TRENDING = [
  { name: '삼성전자', ticker: '005930', market: 'KOSPI', article_count: 0 },
  { name: 'SK하이닉스', ticker: '000660', market: 'KOSPI', article_count: 0 },
  { name: '카카오', ticker: '035720', market: 'KOSPI', article_count: 0 },
  { name: 'NAVER', ticker: '035420', market: 'KOSPI', article_count: 0 },
  { name: 'LG에너지솔루션', ticker: '373220', market: 'KOSPI', article_count: 0 },
];

const TOP_DOMESTIC_STOCKS = [
  { name: '삼성전자', ticker: '005930', market: 'KOSPI', symbol: '삼' },
  { name: 'SK하이닉스', ticker: '000660', market: 'KOSPI', symbol: 'S' },
  { name: '카카오', ticker: '035720', market: 'KOSPI', symbol: '카' },
  { name: 'NAVER', ticker: '035420', market: 'KOSPI', symbol: 'N' },
  { name: 'LG에너지솔루션', ticker: '373220', market: 'KOSPI', symbol: 'L' },
];

const formatPrice = (value) => {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('ko-KR');
};

const formatChange = (quote) => {
  if (!quote) return '전일 종가 대비 등락';
  const sign = quote.change > 0 ? '+' : '';
  return `${sign}${formatPrice(quote.change)}원 (${sign}${Number(quote.change_pct).toFixed(2)}%)`;
};

const formatDate = (pubDate) => {
  if (!pubDate) return '';
  try {
    return new Date(pubDate).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return pubDate;
  }
};

// pubDate 파싱이 실패하면 NaN이 나오는데, NaN 끼리 비교하면 sort가 무작위로 보일 수 있다.
// 실패 시 가장 오래된 것(0)으로 처리해 항상 결정적 순서가 나오게 한다.
const toTimestamp = (pubDate) => {
  if (!pubDate) return 0;
  const t = new Date(pubDate).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const stripTags = (html) => (html || '').replace(/<[^>]+>/g, '');

function StockMiniChart({ data, title = '3개월 주가', unit = '원' }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="stock-mini-empty">
        주가 그래프를 불러올 수 없습니다.
      </div>
    );
  }

  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? first;
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const lineColor = changePct >= 0 ? '#ef4444' : '#2563eb';

  return (
    <div className="stock-mini-chart">
      <div className="stock-mini-head">
        <span>{title}</span>
        <strong className={changePct >= 0 ? 'text-red-500' : 'text-blue-600'}>
          {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
        </strong>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString()}${unit}`, '종가']}
              labelFormatter={(label) => label}
              contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="close" stroke={lineColor} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(null);
  const [newsList, setNewsList] = useState([]);
  const [analysisResults, setAnalysisResults] = useState({});
  const [sortOrder, setSortOrder] = useState('latest');
  const [trending, setTrending] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [priceHistory, setPriceHistory] = useState({});
  const [spotlightStock, setSpotlightStock] = useState(null);
  const [kospiHistory, setKospiHistory] = useState(null);
  const [topQuotes, setTopQuotes] = useState({});
  const [showTopStocks, setShowTopStocks] = useState(false);
  const searchRef = useRef(null);
  const suggestTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchInput = (val) => {
    setSearchTerm(val);
    clearTimeout(suggestTimer.current);
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const results = await searchStocks(val.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
    }, 250);
  };

  const selectSuggestion = (stock) => {
    setSearchTerm(stock.name);
    setSelectedStock(stock);
    setSuggestions([]);
    setShowSuggestions(false);
    runSearch(stock.name, stock);
  };

  // 사용자가 관심종목을 설정해뒀으면 그 종목들의 뉴스를 우선 노출.
  // 비어 있거나 토큰 없으면 일반 최신 뉴스 fallback.
  const [newsSource, setNewsSource] = useState('latest'); // 'watchlist' | 'latest'
  const [watchlistTickerNames, setWatchlistTickerNames] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const loadInitialNews = async () => {
      setIsLoading(true);
      try {
        const watchlist = await getWatchlist().catch(() => []);
        const names = Array.isArray(watchlist) ? watchlist.map((w) => w.name).filter(Boolean) : [];
        if (cancelled) return;

        if (names.length > 0) {
          // 종목별로 병렬 검색 후 합쳐서 pubDate 내림차순 정렬, 중복 제거
          setWatchlistTickerNames(names);
          setNewsSource('watchlist');
          const results = await Promise.allSettled(names.slice(0, 5).map((n) => searchNews(n, 4)));
          const merged = [];
          const seen = new Set();
          for (const r of results) {
            if (r.status !== 'fulfilled') continue;
            for (const item of r.value) {
              if (!item.link || seen.has(item.link)) continue;
              seen.add(item.link);
              merged.push(item);
            }
          }
          merged.sort((a, b) => toTimestamp(b.pubDate) - toTimestamp(a.pubDate));
          if (!cancelled) setNewsList(merged.slice(0, 10));
        } else {
          // watchlist 없거나 로그인 안 됨 → 기존 최신 뉴스
          setNewsSource('latest');
          const news = await fetchLatestNews(5);
          if (!cancelled) setNewsList(news);
        }
      } catch (error) {
        console.error('첫 화면 뉴스 로드 실패:', error);
        if (!cancelled) {
          try {
            const news = await fetchLatestNews(5);
            if (!cancelled) setNewsList(news);
          } catch (_) {}
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadInitialNews();
    return () => { cancelled = true; };
  }, []);

  // 핫 종목 — 네이버 검색 결과 많은 순. 첫 호출이 5~10초 걸릴 수 있어 useEffect 분리.
  useEffect(() => {
    let cancelled = false;
    fetchTrendingStocks(8)
      .then((list) => {
        if (cancelled) return;
        setTrending(list.length > 0 ? list : FALLBACK_TRENDING);
      })
      .catch((e) => {
        console.error('trending 로드 실패:', e);
        if (!cancelled) setTrending(FALLBACK_TRENDING);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchKospiHistory()
      .then((history) => {
        if (!cancelled) setKospiHistory(history);
      })
      .catch(() => {
        if (!cancelled) setKospiHistory([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    TOP_DOMESTIC_STOCKS.forEach((stock) => {
      fetchStockQuote(stock.ticker)
        .then((quote) => {
          if (cancelled) return;
          setTopQuotes((prev) => ({ ...prev, [stock.ticker]: quote }));
        })
        .catch(() => {
          if (cancelled) return;
          setTopQuotes((prev) => ({ ...prev, [stock.ticker]: null }));
        });
    });
    return () => { cancelled = true; };
  }, []);

  const resolveStock = async (query, preferred = null) => {
    if (preferred?.ticker) return preferred;
    try {
      const results = await searchStocks(query);
      return results.find((s) => s.name === query || s.ticker === query) || results[0] || null;
    } catch {
      return null;
    }
  };

  const loadStockHistory = (stock) => {
    if (!stock?.ticker || priceHistory[stock.ticker]) return;
    fetchStockHistory(stock.ticker)
      .then((history) => setPriceHistory((prev) => ({ ...prev, [stock.ticker]: history })))
      .catch(() => setPriceHistory((prev) => ({ ...prev, [stock.ticker]: [] })));
  };

  const runSearch = async (term, stock = null) => {
    const query = term.trim();
    if (!query) return alert('검색어를 입력해주세요!');
    setSearchTerm(query);
    const resolvedStock = await resolveStock(query, stock);
    setSelectedStock(resolvedStock);
    setSpotlightStock(resolvedStock);
    loadStockHistory(resolvedStock);
    setIsLoading(true);
    setNewsList([]);
    setAnalysisResults({});
    try {
      const news = await searchNews(query);
      setNewsList(news);
      if (news.length === 0) alert('검색 결과가 없습니다.');
    } catch (error) {
      console.error('뉴스 로드 실패:', error);
      alert(error.response?.data?.detail || '백엔드 서버와 통신할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    await runSearch(searchTerm);
  };

  const sortedNewsWithIndex = [...newsList]
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const diff = toTimestamp(b.item.pubDate) - toTimestamp(a.item.pubDate);
      return sortOrder === 'latest' ? diff : -diff;
    });

  const handleAnalyze = async (item, index) => {
    if (analysisResults[index]) {
      navigate('/analysis', { state: { result: analysisResults[index] } });
      return;
    }
    setIsAnalyzing(index);
    try {
      const title = stripTags(item.title);
      const content = stripTags(item.description);
      const result = await analyzeNews({
        title,
        content,
        ticker: selectedStock?.ticker || searchTerm,
        news_link: item.link,
      });
      setAnalysisResults((prev) => ({ ...prev, [index]: result }));
      loadStockHistory(selectedStock);
    } catch (error) {
      console.error('분석 실패:', error);
      alert(error.response?.data?.detail || '분석 요청에 실패했습니다.');
    } finally {
      setIsAnalyzing(null);
    }
  };

  const getRiskBorderColor = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'high') return 'border-red-300';
    if (l === 'medium') return 'border-orange-300';
    return 'border-green-300';
  };

  const getRiskTextColor = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'high') return 'text-red-500';
    if (l === 'medium') return 'text-orange-400';
    return 'text-green-500';
  };

  const getRiskBadge = (level) => {
    const l = (level || '').toLowerCase();
    const style = {
      high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300',
      medium: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-300',
      low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300',
    };
    return (
      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${style[l] || style.low}`}>
        {(level || '').toUpperCase()} RISK
      </span>
    );
  };

  return (
    <div className="page-shell py-8 lg:py-10">
      <section className="home-hero-stage">
        <button
          type="button"
          className="top-stocks-toggle"
          onClick={() => setShowTopStocks((open) => !open)}
          aria-expanded={showTopStocks}
          aria-controls="top-stocks-panel"
        >
          {showTopStocks ? 'TOP 주식 닫기' : '국내 TOP 주식'}
        </button>

        <aside
          id="top-stocks-panel"
          className={`top-stocks-panel ${showTopStocks ? 'is-open' : ''}`}
          aria-label="국내 TOP 주식"
        >
          <div className="top-stocks-head">
            <div>
              <p>국내 시장</p>
              <strong>국내 TOP 주식</strong>
              <span>전일 종가 대비 등락</span>
            </div>
            <em>KRW</em>
          </div>

          <div className="top-stocks-list">
            {TOP_DOMESTIC_STOCKS.map((stock) => {
              const quote = topQuotes[stock.ticker];
              const directionClass = quote?.direction === 'down'
                ? 'is-down'
                : quote?.direction === 'up'
                  ? 'is-up'
                  : '';
              return (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => runSearch(stock.name, stock)}
                  className="top-stock-row"
                  disabled={isLoading}
                >
                  <span className="top-stock-symbol">{stock.symbol}</span>
                  <span className="top-stock-meta">
                    <strong>{stock.name}</strong>
                    <em>{stock.market} · {stock.ticker}</em>
                  </span>
                  <span className="top-stock-price">
                    <strong>{quote ? `${formatPrice(quote.price)}원` : '—'}</strong>
                    <em className={directionClass}>{formatChange(quote)}</em>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="market-hero">
          <div className="market-hero-main">
            <div className="brand-hero">
              <p className="brand-kicker">Stock Risk Intelligence</p>
              <div className="brand-title" aria-label="RED FLAG">
                <span className="brand-title-red">RED</span>
                <span className="brand-title-flag">FLAG</span>
              </div>
              <p className="brand-subtitle">
                기업 뉴스 흐름을 읽고 리스크 신호를 빠르게 확인하세요.
              </p>
            </div>

            <div className="hero-control-panel">
              <div ref={searchRef} className="hero-search relative">
                <div className="hero-search-box">
                  <span className="hero-search-icon">⌕</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setShowSuggestions(false); handleSearch(); } }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="기업명 또는 종목명 검색 (예: 삼성전자)"
                    className="hero-search-input"
                  />
                  <button
                    onClick={() => { setShowSuggestions(false); handleSearch(); }}
                    disabled={isLoading}
                    className="hero-search-button"
                  >
                    {isLoading ? '검색 중' : '분석 검색'}
                  </button>
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                    {suggestions.map((s) => (
                      <li
                        key={s.ticker}
                        onMouseDown={() => selectSuggestion(s)}
                        className="flex cursor-pointer items-center justify-between px-6 py-3 text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="text-xs text-slate-400">{s.ticker} · {s.market}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="hero-trending">
                <div className="hero-trending-label">Trending by news volume</div>
                <div className="hero-trending-list">
                  {(trending.length > 0 ? trending : FALLBACK_TRENDING).slice(0, 6).map((stock) => (
                    <button
                      key={stock.ticker}
                      onClick={() => runSearch(stock.name)}
                      disabled={isLoading}
                      className="hero-chip"
                      title={stock.article_count > 0 ? `기사 ${stock.article_count.toLocaleString()}건` : ''}
                    >
                      <span>{stock.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {newsSource === 'watchlist' && watchlistTickerNames.length > 0 && !searchTerm && (
              <div className="watchlist-news-pill">
                <span>관심종목 뉴스 표시 중</span>
                <span>·</span>
                <strong>{watchlistTickerNames.slice(0, 5).join(', ')}</strong>
              </div>
            )}

          </div>

          <aside className="market-hero-panel">
            {spotlightStock?.ticker ? (
              <div className="market-radar stock-spotlight">
                <div className="radar-header">
                  <div>
                    <p>Price Monitor</p>
                    <strong>{spotlightStock.name}</strong>
                  </div>
                  <span>{spotlightStock.ticker}</span>
                </div>
                <StockMiniChart data={priceHistory[spotlightStock.ticker]} />
                <p className="radar-caption">뉴스 분석과 함께 최근 3개월 주가 흐름을 확인합니다.</p>
              </div>
            ) : (
              <div className="market-radar stock-spotlight">
                <div className="radar-header">
                  <div>
                    <p>Market Index</p>
                    <strong>KOSPI</strong>
                  </div>
                  <span>^KS11</span>
                </div>
                {kospiHistory === null ? (
                  <div className="stock-mini-empty">KOSPI 지수 로딩 중</div>
                ) : (
                  <StockMiniChart data={kospiHistory} title="3개월 KOSPI 지수" unit="pt" />
                )}
                <div className="chart-empty-examples">
                  {(trending.length > 0 ? trending : FALLBACK_TRENDING).slice(0, 3).map((stock) => (
                    <button
                      key={stock.ticker}
                      onClick={() => runSearch(stock.name, stock)}
                      disabled={isLoading}
                    >
                      {stock.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">뉴스</h3>
              <p className="muted-copy mt-1 text-sm">뉴스를 선택하면 AI 위험 분석을 시작합니다.</p>
            </div>
            {newsList.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortOrder('latest')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    sortOrder === 'latest'
                      ? 'bg-[#03c75a] text-white'
                      : 'secondary-button'
                  }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => setSortOrder('oldest')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    sortOrder === 'oldest'
                      ? 'bg-[#03c75a] text-white'
                      : 'secondary-button'
                  }`}
                >
                  오래된순
                </button>
                <span className="text-xs font-semibold text-slate-400">총 {newsList.length}건</span>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {sortedNewsWithIndex.map(({ item, originalIndex }) => {
              const result = analysisResults[originalIndex];
              const analyzing = isAnalyzing === originalIndex;
              const displayScore = result?.score ?? result?.risk_score;

              return (
                <div
                  key={item.link || `news-${originalIndex}`}
                  onClick={() => handleAnalyze(item, originalIndex)}
                  className={`cursor-pointer bg-white py-5 transition ${
                    result
                      ? 'border-l-4 pl-4 ' + getRiskBorderColor(result.risk_level)
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-md bg-lime-50 px-2 py-1 text-xs font-black uppercase text-emerald-700">
                        뉴스 {originalIndex + 1}
                      </span>
                      {item.pubDate && (
                        <span className="text-xs font-semibold text-slate-400">
                          {formatDate(item.pubDate)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {result && getRiskBadge(result.risk_level)}
                      {analyzing && (
                        <span className="text-xs font-semibold text-slate-400">분석 중</span>
                      )}
                      {!result && !analyzing && (
                        <span className="text-xs font-semibold text-slate-400">클릭하여 분석</span>
                      )}
                    </div>
                  </div>

                  <h3 className="mb-2 text-lg font-black leading-snug text-slate-900 transition-colors hover:text-emerald-700">
                    {stripTags(item.title)}
                  </h3>
                  <p className="mb-3 text-sm leading-6 text-slate-500">
                    {stripTags(item.description)}
                  </p>

                  {result && (
                    <div className="mt-4 rounded-lg border border-lime-200 bg-lime-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-400 tracking-normal">AI 분석 결과</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${getRiskTextColor(result.risk_level)}`}>
                          {result.risk_level} Risk
                        </span>
                      </div>
                      <AnimatedRiskGauge
                        score={displayScore}
                        level={result.risk_level}
                        size="sm"
                      />
                      <p className="mt-3 mb-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {result.reasoning ?? result.explanation}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/analysis', { state: { result } });
                        }}
                        className="text-xs font-black text-emerald-700 transition-colors hover:text-emerald-900"
                      >
                        상세 리포트 보기
                      </button>
                    </div>
                  )}

                  {!result && !analyzing && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                    className="text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      원문 보기
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {!isLoading && newsList.length === 0 && (
            <div className="rounded-xl border border-dashed border-lime-300 bg-white py-16 text-center">
              <p className="text-sm font-semibold text-emerald-600">기업명을 입력하고 최신 뉴스를 확인하세요.</p>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">실시간 핫 종목</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">네이버 뉴스 기사 많은 순</p>
            <div className="mt-4 space-y-3">
              {(trending.length > 0 ? trending : FALLBACK_TRENDING).slice(0, 5).map((stock, index) => (
                <button
                  key={stock.ticker}
                  onClick={() => runSearch(stock.name)}
                  disabled={isLoading}
                  className="flex w-full items-center justify-between gap-3 text-left text-sm font-bold text-slate-700 transition hover:text-[#03c75a]"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-center text-[#03c75a]">{index + 1}</span>
                    {stock.name}
                  </span>
                  {stock.article_count > 0 && (
                    <span className="text-xs font-semibold text-slate-400">
                      {stock.article_count.toLocaleString()}건
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-lime-200 bg-[#f8fff4] p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">분석 흐름</h3>
            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
              <p>1. 기업 뉴스 검색</p>
              <p>2. 뉴스 클릭 후 위험 점수 산출</p>
              <p>3. 상세 리포트에서 판단 근거 확인</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default Home;
