import axios from 'axios';

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

export const loginAPI = async ({ email, password }) => {
  try {
    const { data } = await authApi.post('/auth/login', { email, password });
    return data; // { access_token, token_type, user }
  } catch (err) {
    throw new Error(err.response?.data?.detail || '로그인에 실패했습니다.');
  }
};

export const signupAPI = async ({ email, password, name }) => {
  try {
    const { data } = await authApi.post('/auth/signup', { email, password, name });
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || '회원가입에 실패했습니다.');
  }
};

// ─────────────────────────────────────────────
// Token storage helpers
// ─────────────────────────────────────────────
export const saveToken = (token) => localStorage.setItem('access_token', token);
export const getToken = () => localStorage.getItem('access_token');
export const removeToken = () => localStorage.removeItem('access_token');
export const saveUser = (user) => localStorage.setItem('user', JSON.stringify(user));
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};
export const removeUser = () => localStorage.removeItem('user');
