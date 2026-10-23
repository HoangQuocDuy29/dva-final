import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, ArrowLeft, Share2, Check } from 'lucide-react';
import { NewsPost } from '../types';
import { newsService } from '../services/api';

const NEWS_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80';

export const NewsDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      newsService.getNewsById(id).then((data) => {
        setArticle(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-20 text-center text-slate-500">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Article not found</h2>
        <Link to="/news" className="text-orange-400 underline text-sm">Return to News Archive</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <Link
          to="/news"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Articles</span>
        </Link>

        <article className="bg-[#161F30] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-8 sm:p-12 text-white space-y-5 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 bg-red-600 text-white font-black text-xs rounded-lg uppercase tracking-wider">
                {article.category}
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span>{article.publishedAt}</span>
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>{article.readTimeMinutes} min read</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-heading text-white leading-tight">
              {article.title}
            </h1>

            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-700 flex items-center justify-center font-bold text-white shadow">
                  {article.authorName[0]}
                </div>
                <div>
                  <span className="font-bold text-white block">{article.authorName}</span>
                  <span className="text-slate-400 text-[11px]">{article.authorRole}</span>
                </div>
              </div>

              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied' : 'Share Story'}</span>
              </button>
            </div>
          </div>

          <div className="w-full h-64 sm:h-96 bg-slate-950 border-b border-slate-800 overflow-hidden">
            <img
              src={article.imageUrl || article.image || article.thumbnail || NEWS_FALLBACK_IMAGE}
              alt={article.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = NEWS_FALLBACK_IMAGE;
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-8 pb-4 text-slate-300 font-medium text-base border-b border-slate-800/80 bg-[#0E1524] leading-relaxed italic">
            "{article.excerpt}"
          </div>

          <div className="p-8 sm:p-12 text-slate-200 leading-relaxed space-y-4 text-sm whitespace-pre-line font-normal">
            {article.content}
          </div>

          <div className="p-8 bg-[#0E1524] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              Published by DVA Volleyball Club Communications & Coaching Staff.
            </div>
            <Link
              to="/services/court-booking"
              className="font-bold text-orange-400 hover:underline"
            >
              Experience the tournament Taraflex courts →
            </Link>
          </div>

        </article>

      </div>
    </div>
  );
};
