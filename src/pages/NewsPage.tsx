import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Clock, 
  ArrowRight, 
  Calendar
} from 'lucide-react';
import { NewsPost, User as UserType } from '../types';
import { newsService } from '../services/api';

interface NewsPageProps {
  currentUser: UserType;
}

const NEWS_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';

export const NewsPage: React.FC<NewsPageProps> = ({ currentUser }) => {
  const [newsList, setNewsList] = useState<NewsPost[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOURNAMENT');

  const fetchNews = async () => {
    try {
      const data = await newsService.getNews({
        category: selectedCategory,
      });
      setNewsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

  const filteredNews = newsList.filter((item) => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.excerpt.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
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

        {/* Filter Bar & Search (All articles removed) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 p-1 bg-[#161F30] border border-slate-800 rounded-xl w-full sm:w-auto">
            {[
              { id: 'TOURNAMENT', label: 'Giải Đấu & Trận Đấu' },
              { id: 'TECHNIQUE', label: 'Kỹ Thuật & Biomechanics' },
              { id: 'TRYOUT', label: 'Tuyển Chọn & Tryout' },
              { id: 'CLUB_EVENT', label: 'Hoạt Động CLB' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#161F30] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredNews.map((article) => (
            <article
              key={article.id}
              className="bg-[#161F30] rounded-3xl border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
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
                  <span className="relative z-10 px-2.5 py-0.5 rounded bg-red-600 text-white font-black text-[10px] uppercase self-start">
                    {article.category}
                  </span>
                  <div className="relative z-10">
                    <span className="text-[11px] text-slate-300 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-400" />
                      <span>{article.publishedAt}</span>
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

              <div className="p-6 pt-0 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{article.authorName}</span>
                <Link
                  to={`/news/${article.id}`}
                  className="font-bold text-orange-400 hover:underline flex items-center gap-1"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>

      </div>
    </div>
  );
};
