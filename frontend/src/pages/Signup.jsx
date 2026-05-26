import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupAPI, saveToken, saveUser } from '../services/auth';

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
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-9 text-center">
          <Link to="/login" className="inline-flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black text-[#03c75a]">RED</span>
            <span className="text-4xl font-black text-slate-900">FLAG</span>
          </Link>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            계정을 만들고 리스크 분석을 관리하세요.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">회원가입</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">관심종목과 리스크 리포트를 저장하세요.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="field-input rounded-xl p-4"
              />
            </div>
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
                placeholder="대/소문자·숫자·특수문자 포함 8자 이상"
                className="field-input rounded-xl p-4"
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
                            ? 'text-green-600'
                            : 'text-slate-400'
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
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                className={`field-input rounded-xl p-4 ${
                  passwordsMatch
                    ? 'border-green-500 focus:border-green-500'
                    : passwordsMismatch
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 focus:border-[#03c75a]'
                }`}
              />
              {/* 실시간 일치 여부 — 확인란을 비우면 숨김 */}
              {passwordsMatch && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                  <span>✓</span> 비밀번호가 일치합니다
                </p>
              )}
              {passwordsMismatch && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                  <span>✗</span> 비밀번호가 일치하지 않습니다
                </p>
              )}
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
              {isLoading ? '가입 중' : '회원가입'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-semibold text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-black text-[#03c75a] hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
