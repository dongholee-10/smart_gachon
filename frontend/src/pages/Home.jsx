import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeNews, searchNews, fetchLatestNews, searchStocks } from '../services/api';
import { fetchTrendingStocks } from '../services/stocks';
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

  const selectSuggestion = (name) => {
    setSearchTerm(name);
    setSuggestions([]);
    setShowSuggestions(false);
    runSearch(name);
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

  const runSearch = async (term) => {
    const query = term.trim();
    if (!query) return alert('검색어를 입력해주세요!');
    setSearchTerm(query);
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
        ticker: searchTerm,
        news_link: item.link,
      });
      setAnalysisResults((prev) => ({ ...prev, [index]: result }));
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

  const analyzedValues = Object.values(analysisResults);
  const analyzedCount = analyzedValues.length;
  const maxScore = analyzedCount > 0 ? Math.max(...analyzedValues.map((r) => r.score ?? r.risk_score ?? 0)) : 0;
  const highRiskCount = analyzedValues.filter((r) => r.risk_level?.toLowerCase() === 'high').length;

  return (
    <div className="page-shell py-8 lg:py-10">
      <section className="mx-auto max-w-4xl text-center">
        <div className="pt-3">
          <div className="mx-auto flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black leading-none text-[#03c75a] sm:text-6xl">RED</span>
            <span className="text-5xl font-black leading-none text-slate-900 sm:text-6xl">FLAG</span>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">
            뉴스 검색부터 위험 분석까지 한 번에 확인하세요.
          </p>
        </div>

        <div ref={searchRef} className="relative mx-auto mt-8 max-w-3xl">
          <div className="flex items-center rounded-full border-2 border-[#03c75a] bg-white px-5 py-2 shadow-[0_6px_18px_rgba(3,199,90,0.12)]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setShowSuggestions(false); handleSearch(); } }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="기업명 또는 종목명 검색 (예: 삼성전자)"
              className="min-w-0 flex-1 border-0 bg-transparent px-2 py-4 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => { setShowSuggestions(false); handleSearch(); }}
              disabled={isLoading}
              className="h-11 rounded-full bg-[#03c75a] px-7 text-sm font-black text-white transition hover:bg-[#02b350] disabled:opacity-50"
            >
              {isLoading ? '검색 중' : '검색'}
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-100 bg-white shadow-xl overflow-hidden">
              {suggestions.map((s) => (
                <li
                  key={s.ticker}
                  onMouseDown={() => selectSuggestion(s.name)}
                  className="flex cursor-pointer items-center justify-between px-6 py-3 text-sm hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className="text-xs text-slate-400">{s.ticker} · {s.market}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mx-auto mt-4 max-w-3xl text-xs font-bold uppercase tracking-widest text-slate-400">
          핫 종목 · 네이버 뉴스 기사 많은 순
        </div>
        <div className="mx-auto mt-2 grid max-w-3xl grid-cols-4 gap-3 text-center text-sm font-bold sm:grid-cols-8">
          {(trending.length > 0 ? trending : FALLBACK_TRENDING).map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => runSearch(stock.name)}
              disabled={isLoading}
              className="group flex flex-col items-center gap-2 text-slate-600 transition hover:text-[#03c75a]"
              title={stock.article_count > 0 ? `기사 ${stock.article_count.toLocaleString()}건` : ''}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lime-200 bg-[#f5fff1] text-base font-black text-[#03c75a] transition group-hover:border-[#03c75a] group-hover:bg-white">
                {stock.name.slice(0, 1)}
              </span>
              <span className="text-xs">{stock.name}</span>
            </button>
          ))}
        </div>

        {newsSource === 'watchlist' && watchlistTickerNames.length > 0 && !searchTerm && (
          <div className="mx-auto mt-7 inline-flex max-w-3xl items-center gap-2 rounded-full border border-lime-200 bg-lime-50 px-4 py-2 text-xs font-bold text-emerald-700">
            <span>관심종목 뉴스 표시 중</span>
            <span className="text-emerald-500">·</span>
            <span className="font-semibold">{watchlistTickerNames.slice(0, 5).join(', ')}</span>
          </div>
        )}

        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-3 text-sm font-bold text-slate-500">
          <span>뉴스 {newsList.length}건</span>
          <span className="text-slate-300">|</span>
          {analyzedCount > 0 ? (
            <>
              <span className={highRiskCount > 0 ? 'text-red-500' : ''}>
                High Risk {highRiskCount}건
              </span>
              <span className="text-slate-300">|</span>
              <span className={maxScore >= 70 ? 'text-red-500' : maxScore >= 40 ? 'text-orange-400' : ''}>
                최고 점수 {maxScore}점
              </span>
            </>
          ) : (
            <span className="text-slate-400 font-normal">뉴스를 클릭하면 AI가 위험도를 분석합니다</span>
          )}
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                      : 'hover:bg-[#fbfff9]'
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
