import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
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

function App() {
  const [user, setUser] = useState(() => getUser());

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
      <div className="min-h-screen bg-white transition-colors duration-300">
        {/* 네비게이션 — 로그인 상태일 때만 표시 */}
        {user && (
          <nav className="sticky top-0 z-40 border-b border-lime-200/80 bg-white/90 text-slate-900 shadow-sm backdrop-blur-xl">
            <div className="page-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#03c75a] text-sm font-black text-white">
                  RF
                </span>
                <div>
                  <h1 className="text-lg font-black leading-tight tracking-normal">RED FLAG</h1>
                  <p className="text-xs font-semibold text-emerald-700">
                    Stock Risk Intelligence
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <Link to="/" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700">Dashboard</Link>
                <Link to="/watchlist" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700">관심종목</Link>
                <Link to="/community" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700">커뮤니티</Link>

                {/* 유저 이름 */}
                <span className="rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-xs text-emerald-700">
                  {user.name || user.email}
                </span>

                {/* 로그아웃 */}
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  로그아웃
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
