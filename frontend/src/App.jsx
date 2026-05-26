import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Community from './pages/Community';
import Watchlist from './pages/Watchlist';
import { getUser, removeToken, removeUser } from './services/auth';

// 로그인 안 했으면 /login 으로 리다이렉트
function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// 한국 표준시(KST) 기준 현재 시각이 밤(18~05시)인지 여부.
// 시스템 타임존과 무관하게 항상 Asia/Seoul 로 평가한다.
const isNightInKorea = () => {
  const hourString = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const hour = parseInt(hourString, 10);
  return Number.isNaN(hour) ? false : hour < 6 || hour >= 18;
};

function App() {
  // 사용자가 토글한 적이 있으면 그 값을 따르고, 아니면 KST 시간대로 자동 결정.
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return isNightInKorea();
  });
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // 매 분 KST 시간대 점검 — 사용자가 수동 토글한 적이 없을 때만 자동 갱신한다.
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('theme-manual') === '1') return;
      const next = isNightInKorea();
      setDark((curr) => (curr === next ? curr : next));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    removeToken();
    removeUser();
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-white transition-colors duration-300 dark:bg-slate-900">
        {/* 네비게이션 — 로그인 상태일 때만 표시 */}
        {user && (
          <nav className="sticky top-0 z-40 border-b border-lime-200/80 bg-white/90 text-slate-900 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/82 dark:text-white">
            <div className="page-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#03c75a] text-sm font-black text-white dark:bg-emerald-400 dark:text-slate-950">
                  RF
                </span>
                <div>
                  <h1 className="text-lg font-black leading-tight tracking-normal">RED FLAG</h1>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-slate-400">
                    Stock Risk Intelligence
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <Link to="/" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">Dashboard</Link>
                <Link to="/analysis" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">Risk Analysis</Link>
                <Link to="/watchlist" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">관심종목</Link>
                <Link to="/community" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">커뮤니티</Link>

                {/* 유저 이름 */}
                <span className="rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-xs text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  {user.name || user.email}
                </span>

                {/* 로그아웃 */}
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                >
                  로그아웃
                </button>

                {/* 다크모드 토글 — 수동 변경 시 KST 자동 모드를 비활성화 */}
                <button
                  onClick={() => {
                    localStorage.setItem('theme-manual', '1');
                    setDark(!dark);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  title={dark ? '라이트 모드' : '다크 모드'}
                >
                  {dark ? 'L' : 'D'}
                </button>
              </div>
            </div>
          </nav>
        )}

        <main className="min-h-screen">
          <Routes>
            {/* 인증 페이지 */}
            <Route path="/login" element={
              user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
            } />
            <Route path="/signup" element={
              user ? <Navigate to="/" replace /> : <Signup onLogin={handleLogin} />
            } />

            {/* 보호된 페이지 */}
            <Route path="/" element={
              <PrivateRoute user={user}><Home /></PrivateRoute>
            } />
            <Route path="/analysis" element={
              <PrivateRoute user={user}><Analysis /></PrivateRoute>
            } />
            <Route path="/watchlist" element={
              <PrivateRoute user={user}><Watchlist /></PrivateRoute>
            } />
            <Route path="/community" element={
              <PrivateRoute user={user}><Community /></PrivateRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
