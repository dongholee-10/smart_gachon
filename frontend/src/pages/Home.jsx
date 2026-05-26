import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeNews, searchNews, fetchLatestNews } from '../services/api';
import RiskCard from '../components/RiskCard';
import heroImage from '../assets/hero.png';

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
  const navigate = useNavigate();

  useEffect(() => {
    const loadLatestNews = async () => {
      setIsLoading(true);
      try {
        const news = await fetchLatestNews(5);
        setNewsList(news);
      } catch (error) {
        console.error('최신 뉴스 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLatestNews();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return alert('검색어를 입력해주세요!');
    setIsLoading(true);
    setNewsList([]);
    setAnalysisResults({});
    try {
      const news = await searchNews(searchTerm);
      setNewsList(news);
      if (news.length === 0) alert('검색 결과가 없습니다.');
    } catch (error) {
      console.error('뉴스 로드 실패:', error);
      alert(error.response?.data?.detail || '백엔드 서버와 통신할 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
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
    <div className="page-shell py-10 lg:py-14">
      <section className="grid min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <p className="mb-4 text-xs font-black uppercase text-red-600 tracking-normal dark:text-red-400">
            Market Risk Dashboard
          </p>
          <h2 className="section-title text-4xl leading-tight sm:text-5xl lg:text-6xl">
            RED FLAG NEWS
          </h2>
          <p className="muted-copy mt-5 max-w-2xl text-base leading-7 sm:text-lg">
            기업 뉴스의 위험 신호를 검색하고, 감성 분석과 규칙 기반 점수로 빠르게 분류합니다.
          </p>

          <div className="mt-8 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-inner dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="분석할 기업 또는 키워드"
              className="field-input rounded-lg px-4 py-4 text-base"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="primary-button rounded-lg px-7 py-4 text-sm font-black"
            >
              {isLoading ? '검색 중' : '뉴스 검색'}
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl font-black text-slate-950 dark:text-white">{newsList.length}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">뉴스</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl font-black text-red-600">{highRiskCount}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">High Risk</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl font-black text-blue-600">{maxScore}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">최고 점수</p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[300px] border-t border-slate-200 bg-slate-950 dark:border-slate-800 lg:border-l lg:border-t-0">
          <img
            src={heroImage}
            alt=""
            className="absolute right-6 top-8 h-56 w-56 object-contain opacity-95 sm:right-12 sm:h-72 sm:w-72 lg:right-10 lg:top-16"
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <div className="rounded-lg border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p className="text-xs font-black uppercase text-slate-400 tracking-normal">
                Live Workflow
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm font-bold text-white">
                <span className="rounded-md bg-white/10 px-3 py-2 text-center">Search</span>
                <span className="rounded-md bg-white/10 px-3 py-2 text-center">Analyze</span>
                <span className="rounded-md bg-white/10 px-3 py-2 text-center">Report</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {analyzedCount > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <RiskCard title="분석된 뉴스" value={`${analyzedCount}건`} description="클릭하여 분석 완료된 뉴스 수" isHighRisk={false} />
          <RiskCard title="최고 위험 점수" value={`${maxScore}점`} description="분석된 뉴스 중 가장 높은 위험 점수" isHighRisk={maxScore >= 70} />
          <RiskCard title="High Risk 뉴스" value={`${highRiskCount}건`} description="High Risk로 분류된 뉴스 수" isHighRisk={highRiskCount > 0} />
        </div>
      )}

      <section className="mt-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="section-title text-2xl">News Monitor</h3>
            <p className="muted-copy mt-1 text-sm">검색 결과를 선택하면 위험 분석을 시작합니다.</p>
          </div>
          {newsList.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder('latest')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  sortOrder === 'latest'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'secondary-button'
                }`}
              >
                최신순
              </button>
              <button
                onClick={() => setSortOrder('oldest')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  sortOrder === 'oldest'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                    : 'secondary-button'
                }`}
              >
                오래된순
              </button>
              <span className="text-xs font-semibold text-slate-400">총 {newsList.length}건</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {sortedNewsWithIndex.map(({ item, originalIndex }) => {
            const result = analysisResults[originalIndex];
            const analyzing = isAnalyzing === originalIndex;
            const displayScore = result?.score ?? result?.risk_score;

            return (
              <div
                key={item.link || `news-${originalIndex}`}
                onClick={() => handleAnalyze(item, originalIndex)}
                className={`cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                  result
                    ? getRiskBorderColor(result.risk_level)
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black uppercase text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      News {originalIndex + 1}
                    </span>
                    {item.pubDate && (
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
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
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">클릭하여 분석</span>
                    )}
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-black leading-snug text-slate-900 transition-colors hover:text-blue-700 dark:text-white dark:hover:text-blue-300">
                  {stripTags(item.title)}
                </h3>
                <p className="mb-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {stripTags(item.description)}
                </p>

                {result && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-400 tracking-normal">AI 분석 결과</span>
                      <span className={`text-xl font-black ${getRiskTextColor(result.risk_level)}`}>
                        {displayScore}점
                      </span>
                    </div>
                    <p className="mb-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {result.reasoning ?? result.explanation}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/analysis', { state: { result } });
                      }}
                      className="text-xs font-black text-blue-700 transition-colors hover:text-blue-900 dark:text-blue-300"
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
                    className="text-sm font-bold text-slate-400 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
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
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 py-16 text-center dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">기업명을 입력하고 최신 뉴스를 확인하세요.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
