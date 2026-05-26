import { useState, useEffect } from 'react';
import { getUser } from '../services/auth';
import {
  useMockCommunity,
  mockGetPosts, mockCreatePost, mockAddComment, mockLikePost,
  getPosts, createPost, addComment, likePost,
} from '../services/community';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

function Community() {
  const user = getUser();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState('');

  // 글쓰기 폼
  const [form, setForm] = useState({ title: '', content: '', ticker: '' });

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const data = useMockCommunity ? await mockGetPosts() : await getPosts();
        setPosts(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return alert('제목과 내용을 입력해주세요.');
    try {
      const post = useMockCommunity
        ? await mockCreatePost({ ...form, author: user?.name || '익명' })
        : await createPost({ ...form, author: user?.name || '익명' });
      setPosts((prev) => [post, ...prev]);
      setForm({ title: '', content: '', ticker: '' });
      setShowForm(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleLike = async (postId) => {
    try {
      useMockCommunity ? await mockLikePost(postId) : await likePost(postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    } catch (e) { console.error(e); }
  };

  const handleAddComment = async (postId) => {
    if (!commentText.trim()) return;
    try {
      const comment = useMockCommunity
        ? await mockAddComment(postId, { author: user?.name || '익명', content: commentText })
        : await addComment(postId, { author: user?.name || '익명', content: commentText });
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      ));
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => ({ ...prev, comments: [...prev.comments, comment] }));
      }
      setCommentText('');
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">
            💬 커뮤니티
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            투자자들과 종목 리스크를 함께 분석하세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all"
        >
          {showForm ? '취소' : '✏️ 글쓰기'}
        </button>
      </div>

      {useMockCommunity && (
        <span className="inline-block mb-6 text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full font-semibold dark:bg-yellow-900/30 dark:text-yellow-400">
          ⚙ Mock 모드 — 백엔드 /community 연결 전
        </span>
      )}

      {/* 글쓰기 폼 */}
      {showForm && (
        <form onSubmit={handleCreatePost} className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">새 글 작성</h3>
          <input
            type="text"
            placeholder="제목"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
          />
          <input
            type="text"
            placeholder="관련 종목 코드 (예: 005930) — 선택사항"
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
          />
          <textarea
            placeholder="내용을 입력해주세요..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition resize-none"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all"
          >
            게시하기
          </button>
        </form>
      )}

      {/* 게시글 목록 */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
          <p className="text-slate-400">첫 번째 글을 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {/* 게시글 헤더 */}
              <div
                className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{post.author}</span>
                    {post.ticker && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                        #{post.ticker}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{post.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                    className="text-xs text-slate-400 hover:text-red-500 transition font-semibold flex items-center gap-1"
                  >
                    ❤️ {post.likes}
                  </button>
                  <span className="text-xs text-slate-400">
                    💬 {post.comments.length}
                  </span>
                </div>
              </div>

              {/* 댓글 섹션 */}
              {selectedPost?.id === post.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900/30">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{post.content}</p>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    댓글 {post.comments.length}개
                  </h4>
                  <div className="space-y-3 mb-4">
                    {post.comments.map((c) => (
                      <div key={c.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{c.author}</span>
                          <span className="text-xs text-slate-400">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{c.content}</p>
                      </div>
                    ))}
                  </div>
                  {/* 댓글 입력 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="댓글을 입력하세요..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition text-sm"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl transition text-sm"
                    >
                      등록
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Community;
