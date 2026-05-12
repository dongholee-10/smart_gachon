import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { useMock, mockReport } from '../services/api';

// 위험도 게이지 바
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
      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
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

// 감성 분석 바
const SentimentBar = ({ positive = 0, neutral = 0, negative = 0 }) => (
  <div className="space-y-3">
    {[
      { label: '긍정', value: positive, color: 'bg-green-400' },
      { label: '중립', value: neutral, color: 'bg-slate-300' },
      { label: '부정', value: negative, color: 'bg-red-400' },
    ].map(({ label, value, color }) => (
      <div key={label} className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-8">{label}</span>
        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`${color} h-3 rounded-full transition-all duration-700`}
            style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-600 w-10 text-right">
          {Math.round((value ?? 0) * 100)}%
        </span>
      </div>
    ))}
  </div>
);

// 위험 요소 태그
const RiskTag = ({ label }) => (
  <span className="inline-block bg-red-100 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1 rounded-full mr-2 mb-2">
    ⚠ {label}
  </span>
);

function Analysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const passedResult = location.state?.result || null;

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState(null);

  // 더미 데이터 (홈에서 결과 없이 직접 접근 시 폴백)
  const fallbackResult = {
    id: 0,
    news_title: '홈에서 뉴스를 클릭하여 분석을 시작하세요.',
    score: 0,
    risk_level: 'Low',
    risk_factors: [],
    sentiment: { positive: 0, neutral: 1, negative: 0 },
    reasoning: '분석 결과가 없습니다. 홈 화면에서 뉴스를 클릭하여 분석해주세요.',
  };

  const result = passedResult || fallbackResult;

  const getRiskStyle = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'high') return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-600' };
    if (l === 'medium') return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-500', badge: 'bg-orange-500' };
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', badge: 'bg-green-600' };
  };

  // 리포트 생성 (mock or real)
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReport(null);
    try {
      let reportData;
      if (useMock) {
        // 🔧 Mock 모드
        reportData = await mockReport(result);
      } else {
        // ✅ Real 모드: useMock = false 로 바꾸면 여기가 실행됨
        const response = await api.post('/report', {
          result_id: result.id,
          news_title: result.news_title,
          score: result.score,
          risk_level: result.risk_level,
          risk_factors: result.risk_factors,
          reasoning: result.reasoning,
        });
        reportData = response.data;
      }
      setReport(reportData);
    } catch (error) {
      console.error('리포트 생성 실패:', error);
      alert('리포트 생성에 실패했습니다.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const style = getRiskStyle(result.risk_level);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-slate-700 transition-colors text-sm font-semibold"
        >
          ← 홈으로
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            📝 Explainable Risk Report
          </h2>
          <p className="text-slate-500 text-sm mt-1">AI 분석 결과를 기반으로 한 투자 위험 리포트</p>
        </div>
      </div>

      {useMock && (
        <span className="inline-block mb-6 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full font-semibold">
          ⚙ Mock 모드 — 백엔드 /report 연결 전
        </span>
      )}

      <div className="space-y-6">
        {/* 위험 점수 카드 */}
        <div className={`p-6 rounded-2xl border-2 ${style.border} ${style.bg}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className={`text-xs font-bold uppercase tracking-widest ${style.text}`}>
                위험 수준
              </span>
              <p className={`text-4xl font-black mt-1 ${style.text}`}>
                {result.risk_level || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-6xl font-black ${style.text}`}>{result.score}</span>
              <span className={`text-lg ${style.text}`}>점</span>
            </div>
          </div>
          <RiskGauge score={result.score} />
        </div>

        {/* 원본 뉴스 */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            원본 뉴스
          </h4>
          <p className="text-lg font-bold text-slate-800">
            {result.news_title || '뉴스 제목 없음'}
          </p>
          {result.news_link && (
            <a
              href={result.news_link}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-500 hover:text-blue-700 mt-2 inline-block"
            >
              원문 보기 →
            </a>
          )}
        </div>

        {/* 감성 분석 */}
        {result.sentiment && (
          <div className="p-6 rounded-2xl border border-slate-200 bg-white">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              FinBERT 감성 분석
            </h4>
            <SentimentBar
              positive={result.sentiment.positive}
              neutral={result.sentiment.neutral}
              negative={result.sentiment.negative}
            />
          </div>
        )}

        {/* 위험 요소 */}
        {result.risk_factors?.length > 0 && (
          <div className="p-6 rounded-2xl border border-slate-200 bg-white">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              탐지된 위험 요소
            </h4>
            <div>
              {result.risk_factors.map((f, i) => (
                <RiskTag key={i} label={f} />
              ))}
            </div>
          </div>
        )}

        {/* LLM 추론 */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            🤖 LLM Reasoning (AI 판단 근거)
          </h4>
          <p className="text-slate-700 leading-relaxed">{result.reasoning}</p>
        </div>

        {/* 리포트 생성 버튼 */}
        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport || !passedResult}
          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all disabled:opacity-40"
        >
          {isGeneratingReport ? '리포트 생성 중...' : '📄 종합 리포트 생성'}
        </button>

        {/* 생성된 리포트 */}
        {report && (
          <div className="p-6 rounded-2xl border-2 border-slate-900 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              종합 리스크 리포트
            </h4>
            {report.summary && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-600 mb-1">요약</p>
                <p className="text-slate-800 leading-relaxed">{report.summary}</p>
              </div>
            )}
            {report.recommendation && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm font-semibold text-yellow-700 mb-1">💡 투자 권고</p>
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