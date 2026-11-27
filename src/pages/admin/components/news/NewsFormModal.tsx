import React, { useEffect, useRef, useState } from 'react';
import { X, Image as ImageIcon, Loader2, Upload, Send, Pin, ChevronDown, Check } from 'lucide-react';
import { NewsPost, NEWS_CATEGORIES } from '../../../../types';
import { uploadToCloudinary, buildCloudinaryFolder } from '../../../../utils/cloudinary';

export interface NewsFormModalProps {
  isOpen: boolean;
  editingNews: NewsPost | null;
  newsTitle: string;
  setNewsTitle: React.Dispatch<React.SetStateAction<string>>;
  newsThumbnail: string;
  setNewsThumbnail: React.Dispatch<React.SetStateAction<string>>;
  newsCategory: NewsPost['category'];
  setNewsCategory: React.Dispatch<React.SetStateAction<NewsPost['category']>>;
  newsExcerpt: string;
  setNewsExcerpt: React.Dispatch<React.SetStateAction<string>>;
  newsContent: string;
  setNewsContent: React.Dispatch<React.SetStateAction<string>>;
  newsAuthorName: string;
  setNewsAuthorName: React.Dispatch<React.SetStateAction<string>>;
  newsPublishedAt: string;
  setNewsPublishedAt: React.Dispatch<React.SetStateAction<string>>;
  newsIsPinned: boolean;
  setNewsIsPinned: React.Dispatch<React.SetStateAction<boolean>>;
  isUploadingNewsThumb: boolean;
  setIsUploadingNewsThumb: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  notify: (message: string, durationMs?: number) => void;
}

export const NewsFormModal: React.FC<NewsFormModalProps> = ({
  isOpen,
  editingNews,
  newsTitle,
  setNewsTitle,
  newsThumbnail,
  setNewsThumbnail,
  newsCategory,
  setNewsCategory,
  newsExcerpt,
  setNewsExcerpt,
  newsContent,
  setNewsContent,
  newsAuthorName,
  setNewsAuthorName,
  newsPublishedAt,
  setNewsPublishedAt,
  newsIsPinned,
  setNewsIsPinned,
  isUploadingNewsThumb,
  setIsUploadingNewsThumb,
  onClose,
  onSubmit,
  notify,
}) => {
  const [isCatOpen, setIsCatOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCatOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCatOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCatOpen]);

  useEffect(() => {
    if (!isOpen) setIsCatOpen(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCategory =
    NEWS_CATEGORIES.find((cat) => cat.id === newsCategory) || NEWS_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="w-[95%] sm:w-full max-w-xl md:max-w-2xl dva-glass-modal shadow-[0_24px_64px_rgba(0,0,0,0.8)] p-4 sm:p-6 text-white space-y-4 max-h-[90dvh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center border-b border-white/10 pb-3 gap-3">
          <div className="min-w-0">
            <h3 className="font-heading font-black text-lg text-white truncate">
              {editingNews ? 'Chỉnh Sửa Bài Viết / Tin Tức' : 'Publish Story / News Article'}
            </h3>
            <p className="text-xs text-slate-400">
              {editingNews ? 'Cập nhật nội dung, danh mục hoặc ảnh bìa bài viết.' : 'Post announcements or match highlights to the public Club Bulletin.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white transition-colors duration-150 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Story / Article Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. DVA Championship Match Recap & MVP Spotlight"
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 dva-glass-input font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div ref={catDropdownRef} className="relative">
              <label className="block text-slate-300 font-semibold mb-1">Category *</label>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isCatOpen}
                onClick={() => setIsCatOpen((prev) => !prev)}
                className="w-full px-3.5 py-2 dva-glass-input flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <span className="truncate font-medium text-white">
                  {selectedCategory?.optionLabel || newsCategory}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                    isCatOpen ? 'rotate-180 text-orange-400' : ''
                  }`}
                />
              </button>
              {isCatOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 p-1.5 rounded-2xl bg-[#0E1118]/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.75)] max-h-60 overflow-y-auto no-scrollbar space-y-0.5"
                >
                  {NEWS_CATEGORIES.map((cat) => {
                    const active = cat.id === newsCategory;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setNewsCategory(cat.id as NewsPost['category']);
                          setIsCatOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 text-left cursor-pointer transition-colors duration-150 ${
                          active
                            ? 'bg-orange-500/20 text-orange-200 border border-orange-500/40'
                            : 'text-slate-200 hover:bg-white/[0.08] border border-transparent'
                        }`}
                      >
                        <span className="truncate">{cat.optionLabel}</span>
                        {active && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Author Name</label>
              <input
                type="text"
                value={newsAuthorName}
                onChange={(e) => setNewsAuthorName(e.target.value)}
                placeholder="Author name"
                className="w-full px-3.5 py-2 dva-glass-input"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Ngày đăng bài (Publish Date)</label>
              <input
                type="date"
                value={newsPublishedAt}
                onChange={(e) => setNewsPublishedAt(e.target.value)}
                className="w-full px-3.5 py-2 dva-glass-input [color-scheme:dark] tabular-nums"
              />
            </div>
          </div>

          {/* PIN TO TOP SWITCH */}
          <label
            htmlFor="news-pin-toggle"
            className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-colors duration-150 cursor-pointer select-none ${
              newsIsPinned
                ? 'bg-orange-500/12 border-orange-500/45'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors duration-150 ${
                  newsIsPinned
                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                    : 'bg-white/[0.05] border-white/12 text-slate-400'
                }`}
              >
                <Pin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-slate-200 font-semibold block text-xs">
                  Ghim bài viết lên đầu trang Tất cả (Pin to Top)
                </span>
                <span className="text-[11px] text-slate-400">
                  Bài viết được ghim sẽ luôn ưu tiên hiển thị ở đầu danh sách tại tab &ldquo;Tất cả bài viết&rdquo;.
                </span>
              </div>
            </div>
            <div className="relative inline-flex items-center shrink-0">
              <input
                id="news-pin-toggle"
                type="checkbox"
                checked={newsIsPinned}
                onChange={(e) => setNewsIsPinned(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5.5 bg-white/15 border border-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-transform after:duration-150 peer-checked:bg-orange-500 peer-checked:border-orange-400" />
            </div>
          </label>

          {/* COVER / THUMBNAIL PHOTO */}
          <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/10 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <label className="text-slate-200 font-semibold block text-xs">
                  Cover Image / Thumbnail (Cloudinary CDN or Link)
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  Folder: {buildCloudinaryFolder('news', newsCategory)} (Preset: dva_sports)
                </span>
              </div>
              {newsThumbnail && (
                <button
                  type="button"
                  onClick={() => setNewsThumbnail('')}
                  className="h-7 px-2.5 rounded-full bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-semibold text-rose-300 cursor-pointer transition-colors duration-150"
                >
                  Clear Image
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 h-14 rounded-xl bg-white/[0.05] border border-white/12 overflow-hidden flex items-center justify-center shrink-0">
                {newsThumbnail ? (
                  <img
                    src={newsThumbnail}
                    alt="News preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <label className={`h-8 px-3.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors duration-150 ${
                  isUploadingNewsThumb
                    ? 'bg-white/[0.04] text-slate-400 border-white/10 cursor-wait'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border-white/12 cursor-pointer'
                }`}>
                  {isUploadingNewsThumb ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                      <span>Uploading to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-orange-400" />
                      <span>Upload Cover Image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingNewsThumb}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsUploadingNewsThumb(true);
                        try {
                          const res = await uploadToCloudinary(file, 'news', newsCategory);
                          const uploadedUrl = res.secure_url || res.url;
                          setNewsThumbnail(uploadedUrl);
                          notify(`Đã tải ảnh bìa tin tức lên thư mục Cloud: ${res.folder}`, 3500);
                        } catch (err) {
                          console.error('News thumb upload error:', err);
                        } finally {
                          setIsUploadingNewsThumb(false);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </label>

                <input
                  type="url"
                  placeholder="Or paste direct image URL (Unsplash / Cloudinary / Imgur)..."
                  value={newsThumbnail}
                  onChange={(e) => setNewsThumbnail(e.target.value)}
                  className="w-full px-3 py-1.5 dva-glass-input text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Short Excerpt / Teaser</label>
            <input
              type="text"
              value={newsExcerpt}
              onChange={(e) => setNewsExcerpt(e.target.value)}
              placeholder="Brief 1-2 sentence preview for cards..."
              className="w-full px-3.5 py-2 dva-glass-input"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Full Article / Story Content *</label>
            <textarea
              rows={6}
              required
              value={newsContent}
              onChange={(e) => setNewsContent(e.target.value)}
              placeholder="Write the full story details, match sets, key highlights, quotes..."
              className="w-full px-3.5 py-2.5 dva-glass-input leading-relaxed font-sans"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/12 text-slate-300 hover:text-white font-semibold cursor-pointer transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 bg-gradient-to-r from-[#B91C1C] via-[#EA580C] to-[#F97316] rounded-full text-white font-bold cursor-pointer hover:brightness-110 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_rgba(249,115,22,0.3)] inline-flex items-center gap-1.5 transition-colors duration-150"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{editingNews ? 'Lưu Thay Đổi Bài Viết' : 'Publish Story Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
