import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2, Pin } from 'lucide-react';
import { NewsPost } from '../../../types';
import { newsService } from '../../../services/api';
import { Pagination } from '../../../components/common/Pagination';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { NewsFormModal } from '../components/news/NewsFormModal';

const NEWS_PAGE_SIZE = 6;

/** Chuyển đổi chuỗi ngày của bài viết sang định dạng YYYY-MM-DD cho input[type="date"] */
const toDateInputValue = (raw?: string): string => {
  if (!raw) return new Date().toISOString().split('T')[0];
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
};

export const NewsTab: React.FC = () => {
  const {
    currentUser,
    isSuperAdmin,
    data: { newsList },
    setData: { setNewsList },
    notify,
  } = useAdminDashboard();

  const [isUploadingNewsThumb, setIsUploadingNewsThumb] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsPost | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsThumbnail, setNewsThumbnail] = useState('');
  const [newsCategory, setNewsCategory] = useState<NewsPost['category']>('TOURNAMENT');
  const [newsExcerpt, setNewsExcerpt] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsAuthorName, setNewsAuthorName] = useState(currentUser.fullName);
  const [newsAuthorRole, setNewsAuthorRole] = useState('Club Administration');
  const [newsPublishedAt, setNewsPublishedAt] = useState(() => toDateInputValue());
  const [newsIsPinned, setNewsIsPinned] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) return;
    if (isUploadingNewsThumb) {
      alert('Vui lòng đợi ảnh tải lên Cloudinary hoàn tất trước khi lưu bài viết.');
      return;
    }
    const resolvedImageUrl =
      newsThumbnail.trim() ||
      editingNews?.imageUrl ||
      editingNews?.image ||
      editingNews?.thumbnail ||
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';
    const resolvedPublishDate =
      newsPublishedAt.trim() ||
      toDateInputValue(editingNews?.publishedAt || editingNews?.createdAt);
    try {
      const payload = {
        title: newsTitle.trim(),
        category: newsCategory,
        imageUrl: resolvedImageUrl,
        image: resolvedImageUrl,
        thumbnail: resolvedImageUrl,
        excerpt: newsExcerpt.trim() || newsContent.trim().substring(0, 150) + '...',
        content: newsContent.trim(),
        authorName: newsAuthorName.trim() || currentUser.fullName,
        authorRole: newsAuthorRole.trim() || 'Club Administration',
        publishedAt: resolvedPublishDate,
        isPinned: Boolean(newsIsPinned),
      };
      if (editingNews) {
        const updated = await newsService.updateNews(editingNews.id, payload);
        setNewsList((prev) =>
          prev.map((n) => (n.id === editingNews.id ? { ...n, ...payload, ...updated } : n))
        );
        notify(`Đã cập nhật bài viết "${newsTitle}"!`, 3500);
      } else {
        const created = await newsService.createNews(payload);
        setNewsList([created, ...newsList]);
        notify(`Đã xuất bản bài viết mới "${newsTitle}"!`, 3500);
      }
      setIsNewsModalOpen(false);
      setEditingNews(null);
      setNewsTitle('');
      setNewsThumbnail('');
      setNewsExcerpt('');
      setNewsContent('');
      setNewsPublishedAt(toDateInputValue());
      setNewsIsPinned(false);
    } catch (e) {
      alert('Lỗi lưu bài viết');
    }
  };

  const handleDeleteNews = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài viết "${title}"?`)) return;
    try {
      await newsService.deleteNews(id);
      setNewsList((prev) => prev.filter((n) => n.id !== id));
      notify(`Đã xóa bài viết "${title}".`, 3000);
    } catch (e) {
      alert('Error deleting news story');
    }
  };

  const safePage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, Math.ceil(newsList.length / NEWS_PAGE_SIZE))
  );
  const paginatedNews = newsList.slice(
    (safePage - 1) * NEWS_PAGE_SIZE,
    safePage * NEWS_PAGE_SIZE
  );

  return (
    <>
      <div className="dva-glass-panel rounded-3xl p-4 sm:p-6 space-y-5 dva-content-reveal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <h3 className="font-bold text-base text-white">Club Bulletin & Story Publishing</h3>
            <p className="text-xs text-slate-400">
              Publish tournament announcements, tryout updates, tactical guides, or community stories.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingNews(null);
              setNewsTitle('');
              setNewsThumbnail('');
              setNewsCategory('TOURNAMENT');
              setNewsExcerpt('');
              setNewsContent('');
              setNewsAuthorName(currentUser.fullName);
              setNewsAuthorRole('Club Administration');
              setNewsPublishedAt(toDateInputValue());
              setNewsIsPinned(false);
              setIsNewsModalOpen(true);
            }}
            className="h-9 px-4 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] hover:brightness-110 text-white font-bold text-xs rounded-full inline-flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] cursor-pointer shrink-0 transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Story</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedNews.map((story) => (
            <div
              key={story.id}
              className={`p-5 rounded-2xl border bg-white/[0.03] hover:bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between space-y-4 transition-colors duration-150 ${
                story.isPinned
                  ? 'border-orange-500/40 hover:border-orange-400/60'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-2.5">
                {(story.imageUrl || story.image || story.thumbnail) && (
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 mb-2">
                    <img
                      src={story.imageUrl || story.image || story.thumbnail}
                      alt={story.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/15 text-rose-300 border border-rose-500/35">
                      {story.category}
                    </span>
                    {story.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/15 text-orange-300 border border-orange-500/35">
                        <Pin className="w-3 h-3" />
                        <span>Pinned</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0 tabular-nums">{story.publishedAt}</span>
                </div>

                <h4 className="font-heading font-black text-base text-white line-clamp-2">
                  {story.title}
                </h4>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {story.excerpt || story.content}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2 text-xs">
                <div className="text-[11px] text-slate-400 truncate min-w-0">
                  By <strong className="text-white">{story.authorName}</strong>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to={`/news/${story.id}`}
                    target="_blank"
                    className="h-8 px-3 rounded-full bg-orange-500/12 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 font-bold text-[11px] inline-flex items-center transition-colors duration-150"
                  >
                    Read
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNews(story);
                      setNewsTitle(story.title);
                      setNewsCategory(story.category);
                      setNewsThumbnail(story.imageUrl || story.image || story.thumbnail || '');
                      setNewsExcerpt(story.excerpt || '');
                      setNewsContent(story.content);
                      setNewsAuthorName(story.authorName);
                      setNewsAuthorRole(story.authorRole || 'Club Administration');
                      setNewsPublishedAt(toDateInputValue(story.publishedAt || story.createdAt));
                      setNewsIsPinned(Boolean(story.isPinned));
                      setIsNewsModalOpen(true);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-orange-300 rounded-full bg-white/[0.05] hover:bg-orange-500/15 border border-white/12 hover:border-orange-500/35 cursor-pointer transition-colors duration-150"
                    title="Chỉnh sửa bài viết"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteNews(story.id, story.title)}
                      className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-300 rounded-full bg-white/[0.05] hover:bg-rose-500/15 border border-white/12 hover:border-rose-500/35 cursor-pointer transition-colors duration-150"
                      title="Delete story"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Pagination
          currentPage={safePage}
          totalItems={newsList.length}
          pageSize={NEWS_PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="articles"
        />
      </div>

      <NewsFormModal
        isOpen={isNewsModalOpen}
        editingNews={editingNews}
        newsTitle={newsTitle}
        setNewsTitle={setNewsTitle}
        newsThumbnail={newsThumbnail}
        setNewsThumbnail={setNewsThumbnail}
        newsCategory={newsCategory}
        setNewsCategory={setNewsCategory}
        newsExcerpt={newsExcerpt}
        setNewsExcerpt={setNewsExcerpt}
        newsContent={newsContent}
        setNewsContent={setNewsContent}
        newsAuthorName={newsAuthorName}
        setNewsAuthorName={setNewsAuthorName}
        newsPublishedAt={newsPublishedAt}
        setNewsPublishedAt={setNewsPublishedAt}
        newsIsPinned={newsIsPinned}
        setNewsIsPinned={setNewsIsPinned}
        isUploadingNewsThumb={isUploadingNewsThumb}
        setIsUploadingNewsThumb={setIsUploadingNewsThumb}
        onClose={() => {
          setIsNewsModalOpen(false);
          setEditingNews(null);
        }}
        onSubmit={handleSaveNews}
        notify={notify}
      />
    </>
  );
};
