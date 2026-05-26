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
    <div className="page-shell py-8 lg:py-10">
      <section className="mx-auto max-w-4xl text-center">
        <div className="pt-6">
          <div className="mx-auto flex items-end justify-center gap-1">
            <span className="text-6xl font-black leading-none text-[#03c75a] sm:text-7xl">R</span>
            <span className="pb-2 text-4xl font-black leading-none text-[#03c75a] sm:text-5xl">ED</span>
            <span className="pb-2 text-4xl font-black leading-none text-slate-900 dark:text-white sm:text-5xl">FLAG</span>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">
            뉴스 검색부터 위험 분석까지 한 번에 확인하세요.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl items-center rounded-full border-2 border-[#03c75a] bg-white px-5 py-2 shadow-[0_4px_16px_rgba(3,199,90,0.18)] dark:bg-slate-900">
          <span className="mr-3 text-2xl font-black text-[#03c75a]">N</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="검색어를 입력하세요"
            className="min-w-0 flex-1 border-0 bg-transparent px-2 py-4 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="h-11 rounded-full bg-[#03c75a] px-7 text-sm font-black text-white transition hover:bg-[#02b350] disabled:opacity-50"
          >
            {isLoading ? '검색 중' : '검색'}
          </button>
        </div>

        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-4 gap-3 text-center text-sm font-bold sm:grid-cols-8">
          {['삼성전자', 'SK하이닉스', 'AI', '반도체', '실적', '증시', '규제', '소송'].map((keyword) => (
            <button
              key={keyword}
              onClick={() => setSearchTerm(keyword)}
              className="group flex flex-col items-center gap-2 text-slate-600 transition hover:text-[#03c75a]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lime-200 bg-[#f5fff1] text-base font-black text-[#03c75a] transition group-hover:border-[#03c75a] group-hover:bg-white">
                {keyword.slice(0, 1)}
              </span>
              <span className="text-xs">{keyword}</span>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-r border-slate-100 p-4 dark:border-slate-800">
            <p className="text-2xl font-black text-[#03c75a]">{newsList.length}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">수집 뉴스</p>
          </div>
          <div className="border-r border-slate-100 p-4 dark:border-slate-800">
            <p className="text-2xl font-black text-red-600">{highRiskCount}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">High Risk</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-black text-[#03c75a]">{maxScore}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">최고 점수</p>
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

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">뉴스</h3>
            <p className="muted-copy mt-1 text-sm">뉴스를 선택하면 AI 위험 분석을 시작합니다.</p>
          </div>
          {newsList.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder('latest')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  sortOrder === 'latest'
                    ? 'bg-[#03c75a] text-white dark:bg-emerald-400 dark:text-slate-950'
                    : 'secondary-button'
                }`}
              >
                최신순
              </button>
              <button
                onClick={() => setSortOrder('oldest')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  sortOrder === 'oldest'
                    ? 'bg-[#03c75a] text-white dark:bg-emerald-400 dark:text-slate-950'
                    : 'secondary-button'
                }`}
              >
                오래된순
              </button>
              <span className="text-xs font-semibold text-slate-400">총 {newsList.length}건</span>
            </div>
          )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedNewsWithIndex.map(({ item, originalIndex }) => {
            const result = analysisResults[originalIndex];
            const analyzing = isAnalyzing === originalIndex;
            const displayScore = result?.score ?? result?.risk_score;

            return (
              <div
                key={item.link || `news-${originalIndex}`}
                onClick={() => handleAnalyze(item, originalIndex)}
                className={`cursor-pointer bg-white py-5 transition dark:bg-slate-900 ${
                  result
                    ? 'border-l-4 pl-4 ' + getRiskBorderColor(result.risk_level)
                    : 'hover:bg-[#fbfff9]'
                }`}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-lime-50 px-2 py-1 text-xs font-black uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      뉴스 {originalIndex + 1}
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

                <h3 className="mb-2 text-lg font-black leading-snug text-slate-900 transition-colors hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                  {stripTags(item.title)}
                </h3>
                <p className="mb-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {stripTags(item.description)}
                </p>

                {result && (
                  <div className="mt-4 rounded-lg border border-lime-200 bg-lime-50/70 p-4 dark:border-slate-700 dark:bg-slate-800">
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
                      className="text-xs font-black text-emerald-700 transition-colors hover:text-emerald-900 dark:text-emerald-300"
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
                    className="text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-800 dark:text-emerald-300"
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
            <div className="rounded-xl border border-dashed border-lime-300 bg-white/80 py-16 text-center dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">기업명을 입력하고 최신 뉴스를 확인하세요.</p>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-black text-slate-900 dark:text-white">실시간 인기 검색</h3>
            <div className="mt-4 space-y-3">
              {['삼성전자', '반도체 실적', 'AI 주식', '코스피 전망', '규제 리스크'].map((keyword, index) => (
                <button
                  key={keyword}
                  onClick={() => setSearchTerm(keyword)}
                  className="flex w-full items-center gap-3 text-left text-sm font-bold text-slate-700 transition hover:text-[#03c75a] dark:text-slate-300"
                >
                  <span className="w-5 text-center text-[#03c75a]">{index + 1}</span>
                  {keyword}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-lime-200 bg-[#f8fff4] p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-black text-slate-900 dark:text-white">분석 흐름</h3>
            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
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
