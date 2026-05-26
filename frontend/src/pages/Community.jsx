import { useState, useEffect } from 'react';
import { getUser } from '../services/auth';
import {
  useMockCommunity,
  mockGetPosts, mockCreatePost, mockAddComment, mockLikePost,
  getPosts, createPost, updatePost, deletePost, addComment, likePost,
} from '../services/community';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

// 백엔드 PostOut 은 created_at (snake), mock 은 createdAt — 둘 다 수용
const postDate = (post) => post.created_at ?? post.createdAt;
const commentDate = (c) => c.created_at ?? c.createdAt;

function Community() {
  const user = getUser();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState('');

  // 글쓰기 폼
  const [form, setForm] = useState({ title: '', content: '', ticker: '' });

  // 인라인 편집 상태 — 한 번에 한 글만 편집
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', ticker: '' });

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

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditForm({ title: post.title, content: post.content, ticker: post.ticker || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', content: '', ticker: '' });
  };

  const handleUpdatePost = async (postId) => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      return alert('제목과 내용은 비울 수 없습니다.');
    }
    try {
      const updated = await updatePost(postId, {
        title: editForm.title,
        content: editForm.content,
        ticker: editForm.ticker || null,
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      if (selectedPost?.id === postId) setSelectedPost(updated);
      cancelEdit();
    } catch (e) {
      alert(e.response?.data?.detail || '수정에 실패했습니다.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('정말 삭제할까요? 댓글도 함께 사라집니다.')) return;
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPost?.id === postId) setSelectedPost(null);
    } catch (e) {
      alert(e.response?.data?.detail || '삭제에 실패했습니다.');
    }
  };

  // 본인 글 여부 — 백엔드가 PostOut.user_id 노출. mock 에는 user_id 가 없어서 false.
  const isOwner = (post) => user?.id != null && post.user_id === user.id;

  return (
    <div className="page-shell max-w-5xl py-10 lg:py-14">
      {/* 헤더 */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-red-600 tracking-normal dark:text-red-400">Community</p>
          <h2 className="section-title mt-2 text-4xl">
            커뮤니티
          </h2>
          <p className="muted-copy mt-2 text-sm">
            투자자들과 종목 리스크를 함께 분석하세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="primary-button rounded-lg px-6 py-3 font-black"
        >
          {showForm ? '취소' : '글쓰기'}
        </button>
      </div>

      {useMockCommunity && (
        <span className="mb-6 inline-block rounded-md border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-300">
          Mock 모드 — 백엔드 /community 연결 전
        </span>
      )}

      {/* 글쓰기 폼 */}
      {showForm && (
        <form onSubmit={handleCreatePost} className="surface-panel mb-8 space-y-4 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 dark:text-white">새 글 작성</h3>
          <input
            type="text"
            placeholder="제목"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="field-input rounded-lg p-3"
          />
          <input
            type="text"
            placeholder="관련 종목 코드 (예: 005930) — 선택사항"
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value })}
            className="field-input rounded-lg p-3"
          />
          <textarea
            placeholder="내용을 입력해주세요..."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            className="field-input resize-none rounded-lg p-3"
          />
          <button
            type="submit"
            className="primary-button rounded-lg px-8 py-3 font-black"
          >
            게시하기
          </button>
        </form>
      )}

      {/* 게시글 목록 */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 py-20 text-center dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-slate-400">첫 번째 글을 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const owner = isOwner(post);
            const editing = editingId === post.id;

            return (
              <div
                key={post.id}
                className="surface-panel overflow-hidden rounded-xl"
              >
                {/* 편집 모드 */}
                {editing ? (
                  <div className="space-y-3 p-6">
                    <h3 className="font-bold text-slate-900 dark:text-white">글 수정</h3>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="field-input rounded-lg p-3"
                      placeholder="제목"
                    />
                    <input
                      type="text"
                      value={editForm.ticker}
                      onChange={(e) => setEditForm({ ...editForm, ticker: e.target.value })}
                      className="field-input rounded-lg p-3"
                      placeholder="종목 (선택)"
                    />
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      rows={4}
                      className="field-input resize-none rounded-lg p-3"
                      placeholder="내용"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdatePost(post.id)}
                        className="primary-button rounded-lg px-6 py-2 text-sm font-bold"
                      >
                        저장
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="secondary-button rounded-lg px-6 py-2 text-sm font-bold"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 게시글 헤더 */}
                    <div
                      className="cursor-pointer p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">{post.author}</span>
                          {post.ticker && (
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                              #{post.ticker}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{formatDate(postDate(post))}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{post.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{post.content}</p>
                      <div className="flex items-center justify-between gap-4 mt-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                            className="text-xs text-slate-400 hover:text-red-500 transition font-semibold flex items-center gap-1"
                          >
                            Like {post.likes}
                          </button>
                          <span className="text-xs text-slate-400">
                            Comments {post.comments.length}
                          </span>
                        </div>
                        {/* 본인 글만 보이는 수정/삭제 */}
                        {owner && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(post); }}
                              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              수정
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                              className="rounded-md border border-red-300 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 댓글 섹션 */}
                    {selectedPost?.id === post.id && (
                      <div className="border-t border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{post.content}</p>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                          댓글 {post.comments.length}개
                        </h4>
                        <div className="space-y-3 mb-4">
                          {post.comments.map((c) => (
                            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex justify-between mb-1">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{c.author}</span>
                                <span className="text-xs text-slate-400">{formatDate(commentDate(c))}</span>
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
                            className="field-input flex-1 rounded-lg p-3 text-sm"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="primary-button rounded-lg px-5 py-3 text-sm font-bold"
                          >
                            등록
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Community;
