import { useEffect, useState } from 'react';

/**
 * 리스크 점수 게이지 — 0 → score 까지 1.2초 동안 ease-out 카운트업,
 * 게이지 바는 같은 시간 동안 width 가 차오름, level 이 High 면 경고 배지가 펄스.
 *
 * Props:
 *  - score: 0~100
 *  - level: 'Low' | 'Medium' | 'High'
 *  - size: 'sm' (인라인 카드용) | 'lg' (상세 페이지용)
 *  - showWarning: High 등급 시 경고 배지 노출 (기본 true)
 */
export default function AnimatedRiskGauge({ score = 0, level = 'Low', size = 'lg', showWarning = true }) {
  const target = Math.max(0, Math.min(100, Number(score) || 0));
  const [displayed, setDisplayed] = useState(0);
  const [filled, setFilled] = useState(false); // 마운트 후 한 tick 뒤에 true → CSS transition 발동

  // 카운트업: requestAnimationFrame + easeOutCubic
  useEffect(() => {
    let raf;
    let startTs = null;
    const duration = 1200;
    const fromValue = 0;

    const tick = (now) => {
      if (startTs === null) startTs = now;
      const t = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(fromValue + (target - fromValue) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // 마운트 시 width 0% → 다음 프레임에 target% 로 → CSS transition 이 부드럽게 채움
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, [target]);

  const levelLower = (level || '').toLowerCase();
  const isHigh = levelLower === 'high';
  const isMedium = levelLower === 'medium';

  // 색·아이콘 매핑 — 점수 자체보다 'level' 에 따라 가는 게 임계값 변경에도 안전
  const accent = isHigh
    ? '#dc2626' // red-600
    : isMedium
    ? '#f59e0b' // amber-500
    : '#10b981'; // emerald-500

  const trackHeightClass = size === 'sm' ? 'h-2' : 'h-3.5';
  const scoreTextClass = size === 'sm' ? 'text-xl' : 'text-3xl';

  return (
    <div className="w-full">
      {/* 점수 표시 + High 경고 배지 */}
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span
            className={`${scoreTextClass} font-black tabular-nums transition-colors`}
            style={{ color: accent }}
          >
            {Math.round(displayed)}
          </span>
          <span className="text-xs font-bold text-slate-400">/ 100</span>
        </div>
        {showWarning && isHigh && (
          <span
            className="animate-pulse rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-700"
            role="status"
            aria-live="polite"
          >
            ⚠ Red Flag
          </span>
        )}
        {showWarning && isMedium && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
            주의
          </span>
        )}
      </div>

      {/* 게이지 바 (배경 + 차오르는 바 + 임계값 마커) */}
      <div className={`relative w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${trackHeightClass}`}>
        <div
          className={`${trackHeightClass} rounded-full transition-[width] ease-out`}
          style={{
            width: filled ? `${target}%` : '0%',
            backgroundColor: accent,
            transitionDuration: '1200ms',
            boxShadow: isHigh ? '0 0 8px rgba(220,38,38,0.35)' : 'none',
          }}
        />
        {/* 임계값 마커 — 33, 67 위치에 작은 눈금 */}
        <span className="pointer-events-none absolute top-0 h-full w-px bg-slate-300/70 dark:bg-slate-600" style={{ left: '33%' }} />
        <span className="pointer-events-none absolute top-0 h-full w-px bg-slate-300/70 dark:bg-slate-600" style={{ left: '67%' }} />
      </div>

      {/* 하단 라벨 */}
      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );
}
