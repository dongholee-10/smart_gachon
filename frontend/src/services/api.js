import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export default api;

// ─────────────────────────────────────────────
// 🔧 Mock 모드 설정
// 백엔드 /analyze, /results, /report 완성되면
// useMock = false 로만 바꾸면 실제 API로 전환됨!
// ─────────────────────────────────────────────
export const useMock = true;

export const mockAnalyze = async (text) => {
  await new Promise((r) => setTimeout(r, 1200));
  const isHighRisk = /횡령|압수|소송|조사|기소|구속/.test(text);
  const isMediumRisk = /하락|적자|감소|우려|손실|부진/.test(text);
  const score = isHighRisk
    ? Math.floor(Math.random() * 20) + 78
    : isMediumRisk
    ? Math.floor(Math.random() * 20) + 45
    : Math.floor(Math.random() * 30) + 10;
  const risk_level = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  return {
    id: Date.now(),
    score,
    risk_level,
    risk_factors: isHighRisk
      ? ['법적 분쟁', '경영진 리스크', '규제 위반']
      : isMediumRisk
      ? ['실적 하락', '재무 불안정']
      : ['일반 뉴스'],
    sentiment: {
      positive: isHighRisk ? 0.03 : isMediumRisk ? 0.15 : 0.6,
      neutral: isHighRisk ? 0.07 : isMediumRisk ? 0.3 : 0.3,
      negative: isHighRisk ? 0.9 : isMediumRisk ? 0.55 : 0.1,
    },
    reasoning: isHighRisk
      ? 'FinBERT가 강한 부정적 어조를 감지했으며, Rule-based 엔진이 법적 분쟁 키워드를 Red Flag로 분류했습니다. 경영진 리스크가 주가에 장기적 악영향을 미칠 것으로 판단됩니다.'
      : isMediumRisk
      ? 'FinBERT가 중간 수준의 부정적 어조를 감지했습니다. 실적 관련 리스크 요인이 발견되어 주의가 필요합니다.'
      : '뉴스 텍스트에서 유의미한 위험 신호가 발견되지 않았습니다. 낮은 위험 수준으로 판단됩니다.',
  };
};

export const mockReport = async (result) => {
  await new Promise((r) => setTimeout(r, 1000));
  return {
    summary: result.reasoning,
    recommendation:
      result.risk_level === 'High'
        ? '즉각적인 리스크 검토가 필요합니다. 해당 종목에 대한 신규 투자는 자제하고 기존 포지션 점검을 권장합니다.'
        : result.risk_level === 'Medium'
        ? '중간 수준의 리스크가 감지되었습니다. 추가 정보 확인 후 신중한 투자 판단을 권장합니다.'
        : '현재 뉴스 기준으로 낮은 위험 수준입니다. 시장 변화에 지속적인 모니터링을 권장합니다.',
  };
};