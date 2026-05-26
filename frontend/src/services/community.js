import api from './api';

// ─────────────────────────────────────────────
// 🔧 Mock 모드
// 백엔드 /community 완성되면 useMockCommunity = false
// ─────────────────────────────────────────────
export const useMockCommunity = true;

let MOCK_POSTS = [
  {
    id: 1,
    author: '김투자',
    title: '삼성전자 최근 뉴스 어떻게 보시나요?',
    content: '최근 반도체 업황 회복 신호가 보이는데 다들 어떻게 생각하시나요?',
    ticker: '005930',
    likes: 12,
    comments: [
      { id: 1, author: '박주식', content: '저도 긍정적으로 보고 있어요!', createdAt: '2026-05-10T10:00:00Z' },
    ],
    createdAt: '2026-05-10T09:00:00Z',
  },
  {
    id: 2,
    author: '이분석',
    title: 'SK하이닉스 Red Flag 떴는데 매도해야 할까요?',
    content: 'AI가 High Risk로 분류했는데 여러분 의견이 궁금합니다.',
    ticker: '000660',
    likes: 8,
    comments: [],
    createdAt: '2026-05-11T14:00:00Z',
  },
];

export const mockGetPosts = async () => {
  await new Promise((r) => setTimeout(r, 600));
  return [...MOCK_POSTS].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const mockCreatePost = async ({ author, title, content, ticker }) => {
  await new Promise((r) => setTimeout(r, 600));
  const post = {
    id: Date.now(),
    author,
    title,
    content,
    ticker: ticker || '',
    likes: 0,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  MOCK_POSTS.unshift(post);
  return post;
};

export const mockAddComment = async (postId, { author, content }) => {
  await new Promise((r) => setTimeout(r, 400));
  const post = MOCK_POSTS.find((p) => p.id === postId);
  if (!post) throw new Error('게시글을 찾을 수 없습니다.');
  const comment = { id: Date.now(), author, content, createdAt: new Date().toISOString() };
  post.comments.push(comment);
  return comment;
};

export const mockLikePost = async (postId) => {
  await new Promise((r) => setTimeout(r, 300));
  const post = MOCK_POSTS.find((p) => p.id === postId);
  if (post) post.likes += 1;
  return post;
};

// ─────────────────────────────────────────────
// 실제 API (useMockCommunity = false 시 사용)
// ─────────────────────────────────────────────
export const getPosts = () => api.get('/community/posts').then((r) => r.data);
export const createPost = (data) => api.post('/community/posts', data).then((r) => r.data);
export const addComment = (postId, data) => api.post(`/community/posts/${postId}/comments`, data).then((r) => r.data);
export const likePost = (postId) => api.post(`/community/posts/${postId}/like`).then((r) => r.data);