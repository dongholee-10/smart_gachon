import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchReport } from '../services/api';

const RiskGauge = ({ score }) => {
  const pct = Math.min(Math.max(score ?? 0, 0), 100);
  const color = pct >= 70 ? '#e74c3c' : pct >= 40 ? '#f39c12' : '#27ae60';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>0</span>
        <span className="font-bold" style={{ color }}>{pct}점</span>
        <span>100</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-4 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1 text-slate-400">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
};

const SentimentBar = ({ positive = 0, neutral = 0, negative = 0 }) => (
  <div className="space-y-3">
    {[
      { label: '긍정', value: positive, color: 'bg-green-400' },
      { label: '중립', value: neutral, color: 'bg-slate-300' },
      { label: '부정', value: negative, color: 'bg-red-400' },
    ].map(({ label, value, color }) => (
      <div key={label} className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-8">{label}</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`${color} h-3 rounded-full transition-all duration-700`}
            style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs font-bold text-slate-600 dark:text-slate-300">
          {Math.round((value ?? 0) * 100)}%
        </span>
      </div>
    ))}
  </div>
);

const RiskTag = ({ label }) => (
  <span className="mr-2 mb-2 inline-block rounded-md border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
    {label}
  </span>
);

const factorLabel = (f) => {
  if (typeof f === 'string') return f;
  if (f?.category && f?.keyword) return `${f.category} · ${f.keyword}`;
  return f?.keyword || f?.category || '';
};

function Analysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const passedResult = location.state?.result || null;

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState(null);

  const fallbackResult = {
    id: 0,
    news_title: '홈에서 뉴스를 클릭하여 분석을 시작하세요.',
    title: '홈에서 뉴스를 클릭하여 분석을 시작하세요.',
    score: 0,
    risk_score: 0,
    risk_level: 'Low',
    risk_factors: [],
    sentiment: { positive: 0, neutral: 1, negative: 0 },
    reasoning: '분석 결과가 없습니다. 홈 화면에서 뉴스를 클릭하여 분석해주세요.',
  };

  const result = passedResult || fallbackResult;
  const score = result.score ?? result.risk_score ?? 0;
  const newsTitle = result.news_title ?? result.title;
  const reasoning = result.reasoning ?? result.explanation;

  const getRiskStyle = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'high') return { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900/70', text: 'text-red-600 dark:text-red-300', badge: 'bg-red-600' };
    if (l === 'medium') return { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-900/70', text: 'text-orange-500 dark:text-orange-300', badge: 'bg-orange-500' };
    return { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-900/70', text: 'text-green-600 dark:text-green-300', badge: 'bg-green-600' };
  };

  const handleGenerateReport = async () => {
    if (!result.id) return;
    setIsGeneratingReport(true);
    setReport(null);
    try {
      const data = await fetchReport(result.id);
      setReport(data);
    } catch (error) {
      console.error('리포트 생성 실패:', error);
      alert(error.response?.data?.detail || '리포트 생성에 실패했습니다.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const style = getRiskStyle(result.risk_level);

  return (
    <div className="page-shell max-w-4xl py-10 lg:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          onClick={() => navigate('/')}
          className="secondary-button w-fit rounded-lg px-4 py-2 text-sm font-bold"
        >
          홈으로
        </button>
        <div>
          <h2 className="section-title text-3xl">
            Explainable Risk Report
          </h2>
          <p className="muted-copy mt-1 text-sm">AI 분석 결과를 기반으로 한 투자 위험 리포트</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className={`rounded-xl border p-6 ${style.border} ${style.bg}`}>
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <span className={`text-xs font-black uppercase tracking-normal ${style.text}`}>
                위험 수준
              </span>
              <p className={`text-4xl font-black mt-1 ${style.text}`}>
                {result.risk_level || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-6xl font-black ${style.text}`}>{score}</span>
              <span className={`text-lg ${style.text}`}>점</span>
            </div>
          </div>
          <RiskGauge score={score} />
        </div>

        <div className="surface-panel rounded-xl p-6">
          <h4 className="mb-2 text-xs font-black uppercase text-slate-400 tracking-normal">
            원본 뉴스
          </h4>
          <p className="text-lg font-bold text-slate-800 dark:text-white">{newsTitle || '뉴스 제목 없음'}</p>
          {result.news_link && (
            <a
              href={result.news_link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-300"
            >
              원문 보기
            </a>
          )}
        </div>

        {result.sentiment && (
          <div className="surface-panel rounded-xl p-6">
            <h4 className="mb-4 text-xs font-black uppercase text-slate-400 tracking-normal">
              FinBERT 감성 분석
            </h4>
            <SentimentBar
              positive={result.sentiment.positive}
              neutral={result.sentiment.neutral}
              negative={result.sentiment.negative}
            />
          </div>
        )}

        {result.risk_factors?.length > 0 && (
          <div className="surface-panel rounded-xl p-6">
            <h4 className="mb-3 text-xs font-black uppercase text-slate-400 tracking-normal">
              탐지된 위험 요소
            </h4>
            <div>
              {result.risk_factors.map((f, i) => (
                <RiskTag key={i} label={factorLabel(f)} />
              ))}
            </div>
          </div>
        )}

        <div className="surface-panel rounded-xl p-6">
          <h4 className="mb-3 text-xs font-black uppercase text-slate-400 tracking-normal">
            LLM Reasoning
          </h4>
          <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{reasoning}</p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport || !passedResult || !result.id}
          className="primary-button w-full rounded-lg py-4 font-black"
        >
          {isGeneratingReport ? '리포트 생성 중' : '종합 리포트 생성'}
        </button>

        {report && (
          <div className="rounded-xl border-2 border-slate-900 bg-slate-50 p-6 dark:border-slate-600 dark:bg-slate-900">
            <h4 className="mb-4 text-xs font-black uppercase text-slate-400 tracking-normal">
              종합 리스크 리포트
            </h4>
            {report.summary && (
              <div className="mb-4">
                <p className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">요약</p>
                <p className="whitespace-pre-line leading-relaxed text-slate-800 dark:text-white">{report.summary}</p>
              </div>
            )}
            {report.recommendation && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/70 dark:bg-yellow-950/30">
                <p className="mb-1 text-sm font-semibold text-yellow-700 dark:text-yellow-300">투자 권고</p>
                <p className="text-yellow-900 text-sm leading-relaxed">{report.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Analysis;
