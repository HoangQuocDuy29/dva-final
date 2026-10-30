import React from 'react';
import { X, Image as ImageIcon, Loader2, Upload, Send } from 'lucide-react';
import { NewsPost } from '../../../../types';
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
  isUploadingNewsThumb,
  setIsUploadingNewsThumb,
  onClose,
  onSubmit,
  notify,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-[95%] sm:w-full max-w-xl md:max-w-2xl bg-[#161F30] rounded-2xl sm:rounded-3xl border border-slate-700 p-4 sm:p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-heading font-black text-lg text-white">
              {editingNews ? 'Chỉnh Sửa Bài Viết / Tin Tức' : 'Publish Story / News Article'}
            </h3>
            <p className="text-xs text-slate-400">
              {editingNews ? 'Cập nhật nội dung, danh mục hoặc ảnh bìa bài viết.' : 'Post announcements or match highlights to the public Club Bulletin.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
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
              className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category *</label>
              <select
                value={newsCategory}
                onChange={(e) => setNewsCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="TOURNAMENT">TOURNAMENT (Giải đấu & Trận đấu)</option>
                <option value="TECHNIQUE">TECHNIQUE (Kỹ thuật & Biomechanics)</option>
                <option value="TRYOUT">TRYOUT (Tuyển chọn & Tryout)</option>
                <option value="CLUB_EVENT">CLUB_EVENT (Hoạt động CLB)</option>
                <option value="TACTICAL">TACTICAL (Chiến thuật & Kỹ thuật)</option>
                <option value="COMMUNITY">COMMUNITY (Cộng đồng & Hoạt động)</option>
                <option value="PARTNERSHIP">PARTNERSHIP (Tài trợ & Đối tác)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Author Name</label>
              <input
                type="text"
                value={newsAuthorName}
                onChange={(e) => setNewsAuthorName(e.target.value)}
                placeholder="Author name"
                className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>
          </div>

          {/* COVER / THUMBNAIL PHOTO */}
          <div className="bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-slate-200 font-semibold block text-xs">
                  Cover Image / Thumbnail (Cloudinary CDN or Link)
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  Folder: {buildCloudinaryFolder('news', newsCategory)} (Preset: dva_sports)
                </span>
              </div>
              {newsThumbnail && (
                <button
                  type="button"
                  onClick={() => setNewsThumbnail('')}
                  className="text-[10px] text-red-400 hover:underline cursor-pointer"
                >
                  Clear Image
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 h-14 rounded-xl bg-[#161F30] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
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

              <div className="flex-1 space-y-2">
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  isUploadingNewsThumb 
                    ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait' 
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
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
                  className="w-full px-3 py-1.5 bg-[#161F30] border border-slate-700 rounded-xl text-white outline-none text-xs font-mono"
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
              className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
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
              className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-red-500 leading-relaxed font-sans"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl text-white font-bold cursor-pointer hover:brightness-110 shadow-lg shadow-red-950 flex items-center gap-1.5"
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
