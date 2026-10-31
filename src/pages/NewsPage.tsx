import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Calendar,
  Pin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NewsPost, NEWS_CATEGORIES, User as UserType } from '../types';
import { newsService } from '../services/api';
import { ShareButton } from '../components/common/ShareButton';
import { formatEnglishDate } from '../utils/date';

interface NewsPageProps {
  currentUser: UserType;
}

const NEWS_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';

const ITEMS_PER_PAGE = 6;

const FILTER_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Articles' },
  ...NEWS_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label })),
];

function getArticleTimestamp(post: NewsPost): number {
  const raw = (post.publishedAt || post.createdAt || '').trim();
  if (!raw) return 0;
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]) - 1;
    const day = Number(ymdMatch[3]);
    return new Date(year, month, day).getTime();
  }
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export const NewsPage: React.FC<NewsPageProps> = ({ currentUser: _currentUser }) => {
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const fetchNews = async () => {
    try {
      const data = await newsService.getNews({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      });
      setNewsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

  // Reset về trang 1 khi đổi danh mục hoặc từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, search]);

  const sortedAndFilteredNews = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();
    const isAllTab = selectedCategory === 'ALL';
    const isSearching = trimmedSearch.length > 0;

    const filtered = newsList.filter((item) => {
      if (!isAllTab && String(item.category).toUpperCase() !== selectedCategory.toUpperCase()) {
        return false;
      }
      if (isSearching) {
        return (
          item.title.toLowerCase().includes(trimmedSearch) ||
          item.excerpt.toLowerCase().includes(trimmedSearch)
        );
      }
      return true;
    });

    // Sorting Engine:
    // - Tab "Tất cả" (không tìm kiếm): Ưu tiên bài ghim (isPinned = true) lên đầu, sau đó sắp xếp publishedAt giảm dần.
    // - Tab Category cụ thể (hoặc khi đang tìm kiếm): Bỏ qua ưu tiên ghim, chỉ sắp xếp thuần túy theo ngày đăng mới nhất -> cũ nhất.
    return [...filtered].sort((a, b) => {
      if (isAllTab && !isSearching) {
        const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
        if (pinDiff !== 0) return pinDiff;
      }
      const dateDiff = getArticleTimestamp(b) - getArticleTimestamp(a);
      if (dateDiff !== 0) return dateDiff;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }, [newsList, selectedCategory, search]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredNews.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedNews = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAndFilteredNews, safeCurrentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) return;
    setCurrentPage(page);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div ref={listTopRef} className="border-b border-slate-800 pb-6 scroll-mt-24">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-950/60 border border-red-800 px-3 py-1 rounded-full">
            DVA Press & Tactical Analysis
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-heading mt-3">
            Club News & Match Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tournament recaps, vertical jump biomechanics, and official club announcements.
          </p>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#111827] border border-slate-800 rounded-2xl w-full lg:w-auto">
            {FILTER_TABS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#111827] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* News Grid (Responsive: 1 col on mobile, 2 cols on tablet, 3 cols on desktop) */}
        {paginatedNews.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-12 text-center space-y-2">
            <p className="text-sm font-bold text-slate-300">No matching articles found</p>
            <p className="text-xs text-slate-500">
              Try switching to &ldquo;All Articles&rdquo; or adjusting your search keywords.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedNews.map((article) => (
              <article
                key={article.id}
                className={`bg-[#161F30] rounded-3xl border overflow-hidden shadow-xl flex flex-col justify-between transition-all group ${
                  article.isPinned && selectedCategory === 'ALL' && !search.trim()
                    ? 'border-orange-500/40 hover:border-orange-500/70'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="relative h-44 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-6 flex flex-col justify-between text-white overflow-hidden">
                    <img
                      src={article.imageUrl || article.image || article.thumbnail || NEWS_FALLBACK_IMAGE}
                      alt={article.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = NEWS_FALLBACK_IMAGE;
                      }}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/30" />
                    <div className="relative z-10 flex items-center justify-between gap-2 w-full">
                      <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-black text-[10px] uppercase">
                        {NEWS_CATEGORIES.find((c) => c.id === article.category)?.label || article.category}
                      </span>
                      {article.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/90 text-white font-black text-[10px] uppercase tracking-wider shadow-md backdrop-blur-sm">
                          <Pin className="w-3 h-3" />
                          <span>PINNED</span>
                        </span>
                      )}
                    </div>
                    <div className="relative z-10">
                      <span className="text-[11px] text-slate-300 flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-orange-400" />
                        <span>{formatEnglishDate(article.publishedAt || article.createdAt)}</span>
                        <span>·</span>
                        <span>{article.readTimeMinutes} min read</span>
                      </span>
                      <h2 className="font-heading font-black text-lg text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
                        <Link to={`/news/${article.id}`}>{article.title}</Link>
                      </h2>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium truncate">{article.authorName}</span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <ShareButton
                      url={`${window.location.origin}/news/${article.id}`}
                      title={article.title}
                      text={article.excerpt}
                      label="Share"
                    />
                    <Link
                      to={`/news/${article.id}`}
                      className="font-bold text-orange-400 hover:underline flex items-center gap-1"
                    >
                      <span>Read Article →</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination Bar (Dark Theme) */}
        {sortedAndFilteredNews.length > 0 && (
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Page <span className="font-bold text-white">{safeCurrentPage}</span> of{' '}
              <span className="font-bold text-white">{totalPages}</span>
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-[#111827] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                  const isActive = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-950/60 border border-red-500/40'
                          : 'bg-[#111827] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-[#111827] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
