import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginAPI, saveToken, saveUser } from '../services/auth';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await loginAPI({ email, password });

      saveToken(data.access_token);
      saveUser(data.user);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-9 text-center">
          <Link to="/login" className="inline-flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black text-[#03c75a]">RED</span>
            <span className="text-4xl font-black text-slate-900">FLAG</span>
          </Link>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            뉴스 리스크 분석을 시작하세요.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">로그인</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">계정으로 접속해 분석을 이어가세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="field-input rounded-xl p-4"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="field-input rounded-xl p-4"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-[#03c75a] py-4 font-black text-white transition hover:bg-[#02b350] disabled:opacity-50"
            >
              {isLoading ? '로그인 중' : '로그인'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-semibold text-slate-500">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="font-black text-[#03c75a] hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
