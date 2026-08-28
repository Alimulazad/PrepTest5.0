import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, X, BookOpen, Sparkles, Loader2, BookmarkCheck, ArrowRight, Search } from 'lucide-react';
import { fetchWikipediaSummaryApi, WikiSummaryData } from '../services/api';

export interface WikiConceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  conceptQuery: string;
  initialData?: WikiSummaryData | null;
  onAskAIWithConcept?: (conceptTitle: string, extract: string) => void;
}

export const WikiConceptModal: React.FC<WikiConceptModalProps> = ({
  isOpen,
  onClose,
  conceptQuery,
  initialData,
  onAskAIWithConcept,
}) => {
  const [currentQuery, setCurrentQuery] = useState<string>(conceptQuery);
  const [searchInput, setSearchInput] = useState<string>('');
  const [data, setData] = useState<WikiSummaryData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentQuery(conceptQuery);
  }, [conceptQuery]);

  useEffect(() => {
    if (!isOpen || !currentQuery) return;

    // If initialData is passed and matches query, use it
    if (initialData && initialData.title.toLowerCase().includes(currentQuery.toLowerCase())) {
      setData(initialData);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchWikipediaSummaryApi(currentQuery)
      .then((res) => {
        if (!isMounted) return;
        if (res) {
          setData(res);
          setError(null);
        } else {
          setError('উইকিপিডিয়ায় এই টপিকটির কোনো উপযুক্ত সারসংক্ষেপ পাওয়া যায়নি।');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError('উইকিপিডিয়া থেকে তথ্য লোড করতে সমস্যা হয়েছে। আপনার ইন্টারনেট সংযোগ চেক করুন।');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentQuery, initialData]);

  const handleInlineSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCurrentQuery(searchInput.trim());
      setSearchInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/70 dark:border-emerald-800/60">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Wikipedia Verified Knowledge
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {data?.title || conceptQuery}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto grow space-y-4 text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
          {/* Quick in-modal Search bar */}
          <form onSubmit={handleInlineSearch} className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="অন্য কোনো সূত্র বা বিষয় খুঁজুন..."
              className="w-full pl-9 pr-18 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!searchInput.trim() || loading}
              className="absolute right-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              খুঁজুন
            </button>
          </form>

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-semibold animate-pulse">উইকিপিডিয়া থেকে যাচাইকৃত তথ্য লোড হচ্ছে...</p>
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-xs mx-auto">{error}</p>
              {onAskAIWithConcept && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAskAIWithConcept(conceptQuery, '');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI টিউটর থেকে জানুন</span>
                </button>
              )}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              {/* Optional Thumbnail Image */}
              {data.thumbnailUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
                  <img
                    src={data.thumbnailUrl}
                    alt={data.title}
                    referrerPolicy="no-referrer"
                    className="max-h-48 w-auto rounded-xl object-contain"
                  />
                </div>
              )}

              {/* Language Tag Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/70 dark:border-emerald-800/60 flex items-center gap-1">
                  <BookmarkCheck className="w-3 h-3" />
                  <span>{data.lang === 'bn' ? 'বাংলা উইকিপিডিয়া' : 'English Wikipedia (Fallback)'}</span>
                </span>
                {data.description && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 italic truncate">
                    {data.description}
                  </span>
                )}
              </div>

              {/* Main Extract Text */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm sm:text-[15px] leading-relaxed">
                {data.extract}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {data && !loading && (
          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 dark:bg-slate-900/80">
            <a
              href={data.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <span>উইকিপিডিয়ায় সম্পূর্ণ আর্টিকেল</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {onAskAIWithConcept && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAskAIWithConcept(data.title, data.extract);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI ব্যাখ্যা চান?</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
