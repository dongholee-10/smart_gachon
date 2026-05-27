import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { clearChatHistory, listChatMessages, sendChatMessage } from '../services/chat';
import { fetchStockQuote } from '../services/stocks';

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

const formatPrice = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('ko-KR'));

function Chat() {
  const { ticker } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // 라우터 state 로 종목명을 받으면 (예: 관심종목 → 채팅 진입) 즉시 표시.
  // 없으면 quote 호출로 채워 넣음.
  const [stockName, setStockName] = useState(location.state?.name || '');
  const [quote, setQuote] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  // 초기 메시지·시세 동시 로드
  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setIsLoading(true);
    setError('');

    Promise.all([
      listChatMessages(ticker).catch(() => []),
      fetchStockQuote(ticker).catch(() => null),
    ])
      .then(([msgs, q]) => {
        if (cancelled) return;
        setMessages(Array.isArray(msgs) ? msgs : []);
        if (q) {
          setQuote(q);
          if (!stockName) setStockName(q.name || ticker);
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  // 새 메시지 들어오면 아래로 스크롤
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || isSending) return;

    // 낙관적 UI — 사용자 메시지를 즉시 표시 (서버 저장은 백그라운드)
    const optimistic = {
      id: `opt-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setIsSending(true);
    setError('');

    try {
      const assistant = await sendChatMessage(ticker, text);
      // 응답 받으면 전체 히스토리 다시 fetch (서버에 저장된 user_msg 포함)
      const refreshed = await listChatMessages(ticker);
      setMessages(refreshed);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setError(detail || '전송에 실패했습니다.');
      // 낙관적 추가 롤백
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('이 종목과의 대화 기록을 모두 삭제할까요?')) return;
    try {
      await clearChatHistory(ticker);
      setMessages([]);
    } catch (e) {
      alert(e.response?.data?.detail || '삭제에 실패했습니다.');
    }
  };

  const dirColor = quote?.direction === 'up' ? 'text-red-600' : quote?.direction === 'down' ? 'text-blue-600' : 'text-slate-500';
  const dirArrow = quote?.direction === 'up' ? '▲' : quote?.direction === 'down' ? '▼' : '–';

  return (
    <div className="page-shell max-w-3xl py-8 lg:py-10">
      {/* 헤더 */}
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs font-bold text-slate-400 hover:text-slate-700"
          >
            ← 뒤로
          </button>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {stockName || ticker} <span className="text-base font-bold text-slate-400">Agent</span>
          </h2>
          {quote && (
            <p className="mt-1 flex items-baseline gap-2 text-sm">
              <span className="font-black text-slate-800 tabular-nums">{formatPrice(quote.price)}원</span>
              <span className={`${dirColor} font-bold tabular-nums`}>
                {dirArrow} {formatPrice(Math.abs(quote.change))} ({quote.change_pct > 0 ? '+' : ''}{quote.change_pct.toFixed(2)}%)
              </span>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">최근 뉴스 5건과 우리 시스템의 분석 이력을 컨텍스트로 답합니다.</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            대화 비우기
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div
        ref={listRef}
        className="h-[480px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 animate-pulse">불러오는 중…</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-bold text-slate-700">{stockName || ticker} Agent 와 대화를 시작하세요.</p>
            <p className="text-xs text-slate-400">예: "최근 공정위 조사 어떻게 봐야 해?", "지금 매수 타이밍일까?"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    m.role === 'user'
                      ? 'bg-[#03c75a] text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${m.role === 'user' ? 'text-emerald-100' : 'text-slate-400'}`}
                  >
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* 입력 */}
      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`${stockName || ticker} Agent 에게 질문하기…`}
          disabled={isSending}
          className="field-input flex-1 rounded-xl p-3 text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="rounded-xl bg-[#03c75a] px-6 py-3 text-sm font-black text-white transition hover:bg-[#02b350] disabled:opacity-50"
        >
          {isSending ? '...' : '전송'}
        </button>
      </form>
    </div>
  );
}

export default Chat;
