import api from './api';

// ─────────────────────────────────────────────
// 🔧 Mock 모드 설정
// 백엔드 /auth/login, /auth/signup 완성되면
// useMockAuth = false 로만 바꾸면 실제 API 전환!
// ─────────────────────────────────────────────
export const useMockAuth = true;

// Mock 유저 DB (테스트용)
const MOCK_USERS = [
  { id: 1, email: 'test@test.com', password: '1234', name: '테스트유저' },
];

export const mockLogin = async ({ email, password }) => {
  await new Promise((r) => setTimeout(r, 800));
  const user = MOCK_USERS.find((u) => u.email === email && u.password === password);
  if (!user) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  return {
    access_token: 'mock-jwt-token-' + user.id,
    user: { id: user.id, email: user.email, name: user.name },
  };
};

export const mockSignup = async ({ email, password, name }) => {
  await new Promise((r) => setTimeout(r, 800));
  if (MOCK_USERS.find((u) => u.email === email)) {
    throw new Error('이미 사용 중인 이메일입니다.');
  }
  const newUser = { id: Date.now(), email, password, name };
  MOCK_USERS.push(newUser);
  return {
    access_token: 'mock-jwt-token-' + newUser.id,
    user: { id: newUser.id, email: newUser.email, name: newUser.name },
  };
};

// ─────────────────────────────────────────────
// 실제 API 함수 (useMockAuth = false 시 사용)
// ─────────────────────────────────────────────
export const loginAPI = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data; // { access_token, user }
};

export const signupAPI = async ({ email, password, name }) => {
  const response = await api.post('/auth/signup', { email, password, name });
  return response.data;
};

// ─────────────────────────────────────────────
// 토큰 관리 유틸
// ─────────────────────────────────────────────
export const saveToken = (token) => localStorage.setItem('access_token', token);
export const getToken = () => localStorage.getItem('access_token');
export const removeToken = () => localStorage.removeItem('access_token');
export const saveUser = (user) => localStorage.setItem('user', JSON.stringify(user));
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};
export const removeUser = () => localStorage.removeItem('user');