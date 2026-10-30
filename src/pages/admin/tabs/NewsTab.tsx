import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { NewsPost } from '../../../types';
import { newsService } from '../../../services/api';
import { useAdminDashboard } from '../context/AdminDashboardContext';
import { NewsFormModal } from '../components/news/NewsFormModal';

export const NewsTab: React.FC = () => {
  const {
    currentUser,
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

  return (
    <>
      <div className="bg-[#161F30] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
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
              setIsNewsModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Story</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newsList.map((story) => (
            <div
              key={story.id}
              className="p-5 rounded-2xl border border-slate-800 bg-[#0E1524] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                {(story.imageUrl || story.image || story.thumbnail) && (
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 mb-2">
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
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-950 text-red-400 border border-red-800">
                    {story.category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">{story.publishedAt}</span>
                </div>

                <h4 className="font-heading font-black text-base text-white line-clamp-2">
                  {story.title}
                </h4>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {story.excerpt || story.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="text-[11px] text-slate-400">
                  By <strong className="text-white">{story.authorName}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/news/${story.id}`}
                    target="_blank"
                    className="text-orange-400 hover:underline font-bold text-[11px]"
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
                      setIsNewsModalOpen(true);
                    }}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer transition-colors"
                    title="Chỉnh sửa bài viết"
                  >
                    <Edit3 className="w-4 h-4 text-orange-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNews(story.id, story.title)}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-300 rounded-xl bg-slate-800/80 hover:bg-red-950/80 cursor-pointer transition-colors"
                    title="Delete story"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
