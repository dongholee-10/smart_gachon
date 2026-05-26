import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupAPI, saveToken, saveUser } from '../services/auth';
import heroImage from '../assets/hero.png';

// 백엔드 정책과 동일: 8자+ / 대문자 / 소문자 / 숫자 / 특수문자.
const PASSWORD_RULES = [
  { key: 'length', label: '8자 이상', test: (v) => v.length >= 8 },
  { key: 'upper', label: '대문자 포함 (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: '소문자 포함 (a-z)', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: '숫자 포함 (0-9)', test: (v) => /\d/.test(v) },
  {
    key: 'special',
    label: '특수문자 포함 (!@#$ 등)',
    test: (v) => /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(v),
  },
];

const passwordPolicyError = (pw) => {
  const failing = PASSWORD_RULES.filter((r) => !r.test(pw));
  if (failing.length === 0) return null;
  return '비밀번호는 8자 이상이며 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.';
};

function Signup({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const passwordsMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !passwordConfirm.trim()) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await signupAPI({ email, password, name });

      saveToken(data.access_token);
      saveUser(data.user);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message || '회원가입에 실패했습니다.');
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
                Build a cleaner watch over market signals.
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold text-slate-300">
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Search</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Score</span>
              <span className="rounded-md border border-white/10 bg-white/5 px-3 py-3">Track</span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8">
            <p className="text-xs font-black uppercase text-red-600 tracking-normal dark:text-red-400">RED FLAG</p>
            <h2 className="section-title mt-2 text-3xl">회원가입</h2>
            <p className="muted-copy mt-2 text-sm">계정을 만들고 관심종목과 리스크 리포트를 관리하세요.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="field-input rounded-lg p-4"
              />
            </div>
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
                placeholder="대/소문자·숫자·특수문자 포함 8자 이상"
                className="field-input rounded-lg p-4"
              />
              {/* 정책 체크리스트 — 입력하기 시작하면 표시 */}
              {password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li
                        key={rule.key}
                        className={`text-xs flex items-center gap-1.5 ${
                          ok
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <span>{ok ? '✓' : '·'}</span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                className={`field-input rounded-lg p-4 ${
                  passwordsMatch
                    ? 'border-green-500 focus:border-green-500'
                    : passwordsMismatch
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-600 focus:border-blue-500'
                }`}
              />
              {/* 실시간 일치 여부 — 확인란을 비우면 숨김 */}
              {passwordsMatch && (
                <p className="mt-2 text-xs flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <span>✓</span> 비밀번호가 일치합니다
                </p>
              )}
              {passwordsMismatch && (
                <p className="mt-2 text-xs flex items-center gap-1.5 text-red-500 dark:text-red-400">
                  <span>✗</span> 비밀번호가 일치하지 않습니다
                </p>
              )}
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
              {isLoading ? '가입 중' : '회원가입'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
