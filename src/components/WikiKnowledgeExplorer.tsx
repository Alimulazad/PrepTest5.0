import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Search,
  Sparkles,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  X,
  Loader2,
  Atom,
  FlaskConical,
  Calculator,
  Dna,
  Compass,
  RefreshCw,
} from 'lucide-react';
import { fetchWikipediaSummaryApi, WikiSummaryData } from '../services/api';
import { WikiConceptModal } from './WikiConceptModal';

interface SuggestedTopic {
  title: string;
  query: string;
  subject: string;
  icon: 'physics' | 'chemistry' | 'math' | 'biology' | 'gk';
}

const POPULAR_ADMISSION_CONCEPTS: SuggestedTopic[] = [
  { title: 'কার্নো ইঞ্জিন ও চক্র', query: 'কার্নো চক্র', subject: 'পদার্থবিজ্ঞান', icon: 'physics' },
  { title: 'ফটোইলেকট্রিক ক্রিয়া', query: 'আলোকতড়িৎ ক্রিয়া', subject: 'পদার্থবিজ্ঞান', icon: 'physics' },
  { title: 'ডপলার ক্রিয়া', query: 'ডপলার ক্রিয়া', subject: 'পদার্থবিজ্ঞান', icon: 'physics' },
  { title: 'হুকের সূত্র ও স্থিতিস্থাপকতা', query: 'হুকের সূত্র', subject: 'পদার্থবিজ্ঞান', icon: 'physics' },
  { title: 'ফার্মেন্টেশন ও এনজাইম', query: 'গাঁজন', subject: 'রসায়ন', icon: 'chemistry' },
  { title: 'আদর্শ গ্যাস সূত্র', query: 'আদর্শ গ্যাস', subject: 'রসায়ন', icon: 'chemistry' },
  { title: 'পিএইচ স্কেল (pH Scale)', query: 'পিএইচ', subject: 'রসায়ন', icon: 'chemistry' },
  { title: 'ডিএনএ রেপ্লিকেশন', query: 'ডিএনএ প্রতিলিপন', subject: 'জীববিজ্ঞান', icon: 'biology' },
  { title: 'মাইটোসিস কোষ বিভাজন', query: 'মাইটোসিস', subject: 'জীববিজ্ঞান', icon: 'biology' },
  { title: 'ক্যালকুলাস ও ডিফারেনশিয়েশন', query: 'ক্যালকুলাস', subject: 'উচ্চতর গণিত', icon: 'math' },
  { title: 'ঢাকা বিশ্ববিদ্যালয় ইতিহাস', query: 'ঢাকা বিশ্ববিদ্যালয়', subject: 'সাধারণ জ্ঞান', icon: 'gk' },
  { title: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (বুয়েট)', query: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়', subject: 'সাধারণ জ্ঞান', icon: 'gk' },
];

export interface WikiKnowledgeExplorerProps {
  onAskAI?: (conceptTitle: string, queryText?: string) => void;
  className?: string;
}

export const WikiKnowledgeExplorer: React.FC<WikiKnowledgeExplorerProps> = ({
  onAskAI,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSearchResult, setActiveSearchResult] = useState<WikiSummaryData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Bookmarked wiki concepts (saved in localStorage)
  const [savedConcepts, setSavedConcepts] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('jachai_saved_wiki_concepts');
      return stored ? JSON.parse(stored) : ['কার্নো চক্র', 'আলোকতড়িৎ ক্রিয়া', 'আদর্শ গ্যাস'];
    } catch {
      return ['কার্নো চক্র', 'আলোকতড়িৎ ক্রিয়া'];
    }
  });

  const toggleSaveConcept = (concept: string) => {
    setSavedConcepts((prev) => {
      const updated = prev.includes(concept)
        ? prev.filter((c) => c !== concept)
        : [...prev, concept];
      try {
        localStorage.setItem('jachai_saved_wiki_concepts', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save to localStorage', e);
      }
      return updated;
    });
  };

  const filteredSuggestions = useMemo(() => {
    return POPULAR_ADMISSION_CONCEPTS.filter((item) => {
      const matchSubject = selectedSubject === 'all' || item.subject === selectedSubject;
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchQuery;
    });
  }, [selectedSubject, searchQuery]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await fetchWikipediaSummaryApi(query);
      if (result) {
        setActiveSearchResult(result);
        setSelectedConcept(result.title);
        setIsModalOpen(true);
      } else {
        setSearchError(`"${query}" বিষয়ে উইকিপিডিয়ায় কোনো সরাসরি আর্টিকেল পাওয়া যায়নি।`);
      }
    } catch (err) {
      setSearchError('উইকিপিডিয়া অনুসন্ধানকালে নেটওয়ার্ক সমস্যা হয়েছে।');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenConcept = (query: string) => {
    setSelectedConcept(query);
    setActiveSearchResult(null);
    setIsModalOpen(true);
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-indigo-500/20 relative overflow-hidden ${className}`}
    >
      {/* Background Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-inner">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Verified Knowledge Hub
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 text-[10px] font-semibold border border-emerald-400/20">
                Wikipedia RAG
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              উইকি কনসেপ্ট এক্সপ্লোরার
            </h3>
          </div>
        </div>

        <div className="text-xs text-slate-300 max-w-xs sm:text-right">
          ভর্তি পরীক্ষার পদার্থ, রসায়ন ও গণিতের যেকোনো কঠিন কনসেপ্ট এক ক্লিকে যাচাই ও রিভিশন দিন
        </div>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative z-10 mb-4">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="যেকোনো বৈজ্ঞানিক সূত্র বা টপিক সার্চ করুন (যেমন: কার্নো চক্র, ডিএনএ, পিএইচ)..."
            className="w-full pl-11 pr-24 py-3 bg-slate-800/80 border border-slate-700/80 focus:border-emerald-400 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-hidden transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-16 p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">খুঁজুন</span>
          </button>
        </div>
        {searchError && (
          <p className="text-xs text-rose-300 mt-2 font-medium bg-rose-950/40 p-2 rounded-xl border border-rose-800/40">
            {searchError}
          </p>
        )}
      </form>

      {/* Subject Filter Tabs */}
      <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
        {[
          { id: 'all', label: 'সকল বিষয়' },
          { id: 'পদার্থবিজ্ঞান', label: 'পদার্থবিজ্ঞান' },
          { id: 'রসায়ন', label: 'রসায়ন' },
          { id: 'উচ্চতর গণিত', label: 'গণিত' },
          { id: 'জীববিজ্ঞান', label: 'জীববিজ্ঞান' },
          { id: 'সাধারণ জ্ঞান', label: 'জিকে' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedSubject(tab.id)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedSubject === tab.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-xs'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Suggested Topic Chips */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filteredSuggestions.slice(0, 8).map((item, idx) => {
          const isSaved = savedConcepts.includes(item.query);
          return (
            <div
              key={idx}
              className="group relative flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 transition-all cursor-pointer shadow-xs"
              onClick={() => handleOpenConcept(item.query)}
            >
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-emerald-400 font-semibold block truncate">
                  {item.subject}
                </span>
                <span className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors truncate block">
                  {item.title}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSaveConcept(item.query);
                }}
                className="p-1 text-slate-400 hover:text-amber-400 transition-colors shrink-0"
                title={isSaved ? 'সংরক্ষণ মুছে ফেলুন' : 'পড়ার জন্য সংরক্ষণ করুন'}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog for View */}
      {selectedConcept && (
        <WikiConceptModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedConcept(null);
            setActiveSearchResult(null);
          }}
          conceptQuery={selectedConcept}
          initialData={activeSearchResult}
          onAskAIWithConcept={(title) => {
            if (onAskAI) {
              onAskAI(title, `"${title}" সম্পর্কিত মূল সূত্র, শর্ত এবং বিগত বছরের ভর্তি পরীক্ষার শর্টকাট কৌশলগুলো বুঝিয়ে দাও।`);
            }
          }}
        />
      )}
    </div>
  );
};
