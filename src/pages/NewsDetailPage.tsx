import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, User, Newspaper } from 'lucide-react';
import { NewsPost } from '../types';
import { newsService } from '../services/api';
import { ShareButton } from '../components/common/ShareButton';

const NEWS_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';

/** Định dạng ngày đăng sang chuẩn tiếng Việt: "24 Tháng 10, 2026" */
const formatVietnameseDate = (raw?: string): string => {
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.getMonth() + 1;
  const year = parsed.getFullYear();
  return `${day} Tháng ${month}, ${year}`;
};

export const NewsDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    newsService
      .getNewsById(id)
      .then((data) => {
        setArticle(data && data.title ? data : null);
      })
      .catch(() => {
        setArticle(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="h-9 w-36 bg-slate-800/80 rounded-xl" />
            <div className="h-9 w-24 bg-slate-800/80 rounded-xl" />
          </div>
          <div className="h-6 w-28 bg-slate-800/80 rounded-full" />
          <div className="h-10 w-5/6 bg-slate-800/80 rounded-xl" />
          <div className="h-14 w-full bg-slate-800/60 rounded-2xl" />
          <div className="aspect-video w-full bg-slate-800/70 rounded-3xl" />
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full bg-slate-800/60 rounded" />
            <div className="h-4 w-11/12 bg-slate-800/60 rounded" />
            <div className="h-4 w-4/5 bg-slate-800/60 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-24 px-4 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-orange-400">
          <Newspaper className="w-7 h-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
          Không tìm thấy bài viết
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md">
          Bài viết có thể đã bị xóa hoặc đường dẫn không chính xác.
        </p>
        <Link
          to="/news"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-orange-400 hover:text-orange-300 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại tất cả tin tức</span>
        </Link>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/news/${article.id}`;
  const coverImage = (article.imageUrl || article.image || article.thumbnail || '').trim();
  const formattedDate = formatVietnameseDate(
    article.publishedAt || (article as unknown as { createdAt?: string }).createdAt
  );
  const authorInitial = (article.authorName || '').trim().charAt(0).toUpperCase();
  const paragraphs = (article.content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-10 sm:py-14">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
        {/* 1. BREADCRUMB & HEADER NAVIGATION */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/60 hover:border-orange-500/50 text-xs font-bold text-slate-300 hover:text-orange-400 transition-all"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Tất cả tin tức</span>
          </Link>

          <ShareButton
            url={shareUrl}
            title={article.title}
            text={article.excerpt}
          />
        </div>

        {/* 2. HERO SECTION & EDITORIAL TYPOGRAPHY */}
        <header className="space-y-5">
          {article.category && (
            <div>
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/40 shadow-sm shadow-orange-500/10">
                {article.category}
              </span>
            </div>
          )}

          <h1 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Author & Published Date Meta Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-y border-slate-800/80 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-heading font-black text-sm text-white shadow-md shrink-0">
                {authorInitial ? authorInitial : <User className="w-4 h-4" />}
              </div>
              <div>
                {article.authorName && (
                  <span className="font-bold text-sm text-white block leading-snug">
                    {article.authorName}
                  </span>
                )}
                {article.authorRole && (
                  <span className="text-xs text-slate-400 block">
                    {article.authorRole}
                  </span>
                )}
              </div>
            </div>

            {formattedDate && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
                <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                <time dateTime={article.publishedAt}>{formattedDate}</time>
              </div>
            )}
          </div>
        </header>

        {/* 3. FEATURED IMAGE PRESENTATION */}
        {coverImage && (
          <figure className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
            <img
              src={coverImage}
              alt={article.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = NEWS_FALLBACK_IMAGE;
              }}
              className="w-full aspect-video max-h-[480px] object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0F19]/60 via-transparent to-transparent" />
          </figure>
        )}

        {/* 4. EDITORIAL BODY READING EXPERIENCE */}
        <div className="space-y-6">
          {article.excerpt && article.excerpt.trim() !== article.content.trim() && (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border-l-4 border-orange-500 text-slate-200 font-medium text-base sm:text-lg leading-relaxed">
              {article.excerpt}
            </div>
          )}

          <div className="space-y-5 text-slate-300 text-base sm:text-lg leading-relaxed sm:leading-8 font-normal">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="whitespace-pre-line">{article.content}</p>
            )}
          </div>
        </div>

        {/* 5. ARTICLE FOOTER & CONTINUOUS SHARE BAR */}
        <footer className="pt-8 border-t border-slate-800 space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/40 flex items-center justify-center font-heading font-black text-orange-400 shrink-0">
                {authorInitial ? authorInitial : <User className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Tác giả bài viết
                </span>
                <p className="font-bold text-white text-sm sm:text-base">
                  {article.authorName || 'Ban Biên Tập DVA Volleyball'}
                </p>
                {article.authorRole && (
                  <p className="text-xs text-slate-400">{article.authorRole}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <span className="text-xs text-slate-400 hidden md:inline">
                Chia sẻ bài viết này:
              </span>
              <ShareButton
                url={shareUrl}
                title={article.title}
                text={article.excerpt}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/news"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Xem các tin tức khác</span>
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
};
