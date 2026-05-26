import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginAPI, saveToken, saveUser } from '../services/auth';
import heroImage from '../assets/hero.png';

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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden bg-slate-950 p-10 text-white lg:block">
          <img src={heroImage} alt="" className="absolute right-8 top-10 h-52 w-52 object-contain opacity-90" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-black uppercase text-red-300 tracking-normal">RED FLAG</p>
              <h1 className="mt-4 max-w-sm text-4xl font-black leading-tight">
                Market risk intelligence for faster decisions.
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold text-slate-300">
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">News</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Signal</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Report</span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8">
            <p className="text-xs font-black uppercase text-red-600 tracking-normal dark:text-red-400">RED FLAG</p>
            <h2 className="section-title mt-2 text-3xl">로그인</h2>
            <p className="muted-copy mt-2 text-sm">계정으로 접속해 뉴스 리스크 분석을 이어가세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="field-input rounded-lg p-4"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="field-input rounded-lg p-4"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="primary-button mt-2 w-full rounded-lg py-4 font-black"
            >
              {isLoading ? '로그인 중' : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
