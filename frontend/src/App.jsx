import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import Compare from './pages/Compare';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Community from './pages/Community';
import Watchlist from './pages/Watchlist';
import Chat from './pages/Chat';
import { getUser, removeToken, removeUser } from './services/auth';
import { getWatchlist } from './services/watchlist';
import { listChatMessages, streamChatMessage } from './services/chat';
import { searchStocks } from './services/api';

// 로그인 안 했으면 /login 으로 리다이렉트
function PrivateRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FloatingChat({ user }) {
  const [open, setOpen] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [stock, setStock] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  // 종목 검색
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchTimer = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getWatchlist().then(setWatchlist).catch(() => {});
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 검색 자동완성
  const handleSearchQ = (val) => {
    setSearchQ(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { setSearchResults(await searchStocks(val.trim())); }
      catch { setSearchResults([]); }
    }, 250);
  };

  const selectStock = async (item) => {
    setStock({ ticker: item.ticker, name: item.name });
    setSearchQ('');
    setSearchResults([]);
    setMessages([]);
    setError('');
    try { setMessages(await listChatMessages(item.ticker)); } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || isSending || !stock) return;
    const streamId = `stream-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-${streamId}`, role: 'user', content: text },
      { id: streamId, role: 'assistant', content: '', streaming: true },
    ]);
    setInput('');
    setIsSending(true);
    setError('');
    await streamChatMessage(
      stock.ticker, text,
      (token) => setMessages((prev) => prev.map((m) => m.id === streamId ? { ...m, content: m.content + token } : m)),
      (savedId) => { setMessages((prev) => prev.map((m) => m.id === streamId ? { ...m, id: savedId, streaming: false } : m)); setIsSending(false); },
      (err) => { setError(err); setMessages((prev) => prev.filter((m) => !String(m.id).includes(streamId))); setIsSending(false); },
    );
  };

  if (!user) return null;

  // 검색 결과 우선, 없으면 관심종목
  const listToShow = searchQ.trim()
    ? searchResults
    : watchlist.map((w) => ({ ticker: w.ticker, name: w.name, _watchlist: true }));

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="mb-2 flex w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ height: 500 }}>

          {/* 헤더 */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              {stock && (
                <button onClick={() => setStock(null)} className="text-slate-400 hover:text-slate-700 text-base leading-none pr-1">←</button>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#03c75a]">AI Agent</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {stock ? stock.name : 'Stock Agent'}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
          </div>

          {/* ── 종목 선택 화면 ── */}
          {!stock && (
            <>
              {/* 검색창 */}
              <div ref={searchRef} className="shrink-0 border-b border-slate-100 px-3 py-2">
                <input
                  value={searchQ}
                  onChange={(e) => handleSearchQ(e.target.value)}
                  placeholder="종목 검색 (예: 삼성전자)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#03c75a]"
                  autoFocus
                />
              </div>

              {/* 종목 목록 */}
              <div className="flex-1 overflow-y-auto">
                {!searchQ && watchlist.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
                    <p className="text-sm text-slate-400">위 검색창에 종목명을 입력하거나</p>
                    <p className="text-sm text-slate-400">관심종목을 추가해보세요.</p>
                  </div>
                ) : listToShow.length === 0 && searchQ ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">검색 결과가 없습니다.</p>
                ) : (
                  <ul>
                    {!searchQ && <li className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">관심종목</li>}
                    {listToShow.map((item) => (
                      <li key={item.ticker}>
                        <button
                          onClick={() => selectStock(item)}
                          className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-sm transition hover:bg-slate-50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f5fff1] text-sm font-black text-[#03c75a]">
                            {item.name[0]}
                          </span>
                          <span className="flex-1 text-left font-semibold text-slate-800">{item.name}</span>
                          <span className="text-xs text-slate-400">{item.ticker}</span>
                          <span className="text-xs text-[#03c75a]">대화 →</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ── 채팅 화면 ── */}
          {stock && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && !isSending && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <p className="text-2xl">💬</p>
                    <p className="text-xs text-slate-400 px-4 leading-relaxed">
                      <span className="font-bold text-slate-600">{stock.name}</span> Agent에게<br/>
                      무엇이든 질문해보세요
                    </p>
                    <div className="mt-2 space-y-1">
                      {['지금 매수 타이밍일까?', '최근 리스크 요인 뭐야?', '실적 전망 어때?'].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); inputRef.current?.focus(); }}
                          className="block w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-[#03c75a] hover:text-[#03c75a] transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 ${m.role === 'user' ? 'bg-[#03c75a] text-white' : 'bg-slate-100 text-slate-800'}`}>
                      <p className="whitespace-pre-wrap">
                        {m.content || (m.streaming ? '' : '…')}
                        {m.streaming && <span className="ml-0.5 inline-block h-3.5 w-0.5 bg-slate-400 align-middle animate-pulse" />}
                      </p>
                    </div>
                  </div>
                ))}
                {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="shrink-0 border-t border-slate-100 flex gap-2 p-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                  placeholder={`${stock.name}에 대해 질문하기…`}
                  disabled={isSending}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#03c75a] disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="shrink-0 rounded-xl bg-[#03c75a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#02b350] disabled:opacity-40"
                >
                  {isSending ? '…' : '전송'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#03c75a] text-white shadow-lg transition hover:bg-[#02b350] hover:scale-105 active:scale-95"
        title="AI Agent 대화"
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
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
                <Link to="/compare" className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-lime-50 hover:text-emerald-700">종목 비교</Link>
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

        <FloatingChat user={user} />
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
            <Route path="/compare" element={
              <PrivateRoute user={user}><Compare /></PrivateRoute>
            } />
            <Route path="/watchlist" element={
              <PrivateRoute user={user}><Watchlist /></PrivateRoute>
            } />
            <Route path="/community" element={
              <PrivateRoute user={user}><Community /></PrivateRoute>
            } />
            <Route path="/chat/:ticker" element={
              <PrivateRoute user={user}><Chat /></PrivateRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
