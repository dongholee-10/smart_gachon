import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeNews, searchNews, fetchLatestNews } from '../services/api';
import RiskCard from '../components/RiskCard';

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
    <div className="max-w-5xl mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter italic">
          RED FLAG NEWS
        </h2>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          실시간 뉴스 데이터를 기반으로 시장의 흐름을 분석합니다.
        </p>
      </div>

      <div className="flex gap-3 mb-10 shadow-2xl rounded-2xl p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="분석할 기업 또는 키워드 (예: 삼성전자)"
          className="flex-1 p-4 text-lg outline-none rounded-xl bg-transparent text-slate-900 dark:text-white placeholder-slate-400"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          {isLoading ? '검색 중...' : '뉴스 검색'}
        </button>
      </div>

      {analyzedCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <RiskCard title="분석된 뉴스" value={`${analyzedCount}건`} description="클릭하여 분석 완료된 뉴스 수" isHighRisk={false} />
          <RiskCard title="최고 위험 점수" value={`${maxScore}점`} description="분석된 뉴스 중 가장 높은 위험 점수" isHighRisk={maxScore >= 70} />
          <RiskCard title="High Risk 뉴스" value={`${highRiskCount}건`} description="High Risk로 분류된 뉴스 수" isHighRisk={highRiskCount > 0} />
        </div>
      )}

      {newsList.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-slate-400 dark:text-slate-500">정렬:</span>
          <button
            onClick={() => setSortOrder('latest')}
            className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${
              sortOrder === 'latest'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => setSortOrder('oldest')}
            className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${
              sortOrder === 'oldest'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            오래된순
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
            총 {newsList.length}건
          </span>
        </div>
      )}

      <div className="space-y-4">
        {sortedNewsWithIndex.map(({ item, originalIndex }) => {
          const result = analysisResults[originalIndex];
          const analyzing = isAnalyzing === originalIndex;
          const displayScore = result?.score ?? result?.risk_score;

          return (
            <div
              key={item.link || `news-${originalIndex}`}
              onClick={() => handleAnalyze(item, originalIndex)}
              className={`p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                result
                  ? getRiskBorderColor(result.risk_level)
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    News {originalIndex + 1}
                  </span>
                  {item.pubDate && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      🕐 {formatDate(item.pubDate)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {result && getRiskBadge(result.risk_level)}
                  {analyzing && (
                    <span className="text-xs text-slate-400 animate-pulse">🔍 분석 중...</span>
                  )}
                  {!result && !analyzing && (
                    <span className="text-xs text-slate-300 dark:text-slate-600">클릭하여 분석 →</span>
                  )}
                </div>
              </div>

              <h3
                className="text-xl font-bold text-slate-800 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                dangerouslySetInnerHTML={{ __html: item.title }}
              />
              <p
                className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />

              {result && (
                <div className="mt-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI 분석 결과</span>
                    <span className={`text-xl font-black ${getRiskTextColor(result.risk_level)}`}>
                      {displayScore}점
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 mb-3">
                    {result.reasoning ?? result.explanation}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/analysis', { state: { result } });
                    }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
                  >
                    상세 리포트 보기 →
                  </button>
                </div>
              )}

              {!result && !analyzing && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  원문 보기 →
                </a>
              )}
            </div>
          );
        })}
      </div>

      {!isLoading && newsList.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
          <p className="text-2xl mb-3">🔍</p>
          <p className="text-slate-400 dark:text-slate-500">기업명을 입력하고 최신 뉴스를 확인하세요.</p>
        </div>
      )}
    </div>
  );
}

export default Home;
