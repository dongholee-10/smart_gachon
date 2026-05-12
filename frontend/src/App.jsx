import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { getUser, removeToken, removeUser } from './services/auth';

// 로그인 안 했으면 /login 으로 리다이렉트
function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* 네비게이션 — 로그인 상태일 때만 표시 */}
        {user && (
          <nav className="bg-slate-900 dark:bg-slate-950 text-white p-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold tracking-tight">Stock Red Flag API</h1>
              <div className="flex items-center gap-6">
                <Link to="/" className="hover:text-blue-400 transition">Dashboard</Link>
                <Link to="/analysis" className="hover:text-blue-400 transition">Risk Analysis</Link>

                {/* 유저 이름 */}
                <span className="text-sm text-slate-400">
                  👤 {user.name || user.email}
                </span>

                {/* 로그아웃 */}
                <button
                  onClick={handleLogout}
                  className="text-sm text-slate-400 hover:text-red-400 transition font-semibold"
                >
                  로그아웃
                </button>

                {/* 다크모드 토글 */}
                <button
                  onClick={() => setDark(!dark)}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 transition flex items-center justify-center text-lg"
                  title={dark ? '라이트 모드' : '다크 모드'}
                >
                  {dark ? '☀️' : '🌙'}
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;