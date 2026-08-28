import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Quote,
  Lightbulb,
  Pin,
  ArrowRight,
  ExternalLink,
  Zap,
  Megaphone,
  Globe,
} from 'lucide-react';
import { WikiConceptModal } from './WikiConceptModal';
import {
  CarouselItem,
  CarouselSettings,
  CarouselTheme,
  CarouselTextSize,
  CarouselItemType,
} from '../types';
import {
  subscribeKnowledgeCarousel,
  DEFAULT_CAROUSEL_SETTINGS,
} from '../services/firebase';
import { fetchKnowledgeSnippets } from '../services/api';
import MathText from './MathText';

// Fallback snippets in case Firebase is empty or offline
const FALLBACK_ITEMS: CarouselItem[] = [
  {
    id: 'fb_1',
    type: 'quote',
    content_bn: 'কঠিন পরিশ্রম কখনো ব্যর্থ হয় না। ঢাকা বিশ্ববিদ্যালয়ের লাল বাসে চড়ার স্বপ্ন পূরণ তোমার হাতেই!',
    theme: 'blue_royal',
    textSize: 'normal',
    active: true,
    customDuration: 7,
  },
  {
    id: 'fb_2',
    type: 'formula',
    title_bn: 'পদার্থবিজ্ঞান ১ম পত্র — কাজ-শক্তি উপপাদ্য',
    content_bn: 'কাজ-শক্তি উপপাদ্য (Work-Energy Theorem): কৃতকাজ গতিশক্তির পরিবর্তনের সমান।',
    content_latex: '$W = \\Delta E_k = \\frac{1}{2}m(v^2 - u^2)$',
    subject_id: 'physics_1',
    theme: 'emerald_green',
    textSize: 'normal',
    active: true,
    customDuration: 8,
  },
  {
    id: 'fb_3',
    type: 'gk',
    title_bn: 'ঢাকা বিশ্ববিদ্যালয় ভর্তি স্পেশাল',
    content_bn: 'ঢাকা বিশ্ববিদ্যালয়ের প্রতিষ্ঠাকাল ও প্রথম উপাচার্যের নাম কী?',
    answer_bn: '১৯২১ সালের ১ জুলাই; প্রথম উপাচার্য স্যার পি. জে. হার্টগ।',
    subject_id: 'gk',
    theme: 'purple_violet',
    textSize: 'normal',
    active: true,
    customDuration: 7,
  },
  {
    id: 'fb_4',
    type: 'concept',
    title_bn: 'রসায়ন ১ম পত্র — pH ট্রিকস',
    content_bn: 'pH নো-ক্যালকুলেটর ট্র্যাপ: $[H^+] = 2 \\times 10^{-3}$ M হলে, $pH = 3 - \\log_{10}(2) = 3 - 0.3010 = 2.70$। এই শর্টকাট DU "ক" ইউনিটে দ্রুত গণনায় কাজে লাগে।',
    subject_id: 'chemistry_1',
    theme: 'amber_gold',
    textSize: 'normal',
    active: true,
    customDuration: 9,
  },
];

export const THEME_STYLES: Record<
  CarouselTheme,
  {
    wrapper: string;
    badgeBg: string;
    glow1: string;
    glow2: string;
    btnStyle: string;
  }
> = {
  blue_royal: {
    wrapper: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white border-blue-900/30',
    badgeBg: 'bg-blue-400/25 text-blue-100 border-blue-300/30',
    glow1: 'bg-white/10',
    glow2: 'bg-indigo-400/20',
    btnStyle: 'bg-white text-indigo-900 hover:bg-blue-50 shadow-md',
  },
  dark_navy: {
    wrapper: 'bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 text-slate-100 border-blue-800/40 shadow-inner',
    badgeBg: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    glow1: 'bg-blue-500/10',
    glow2: 'bg-indigo-500/15',
    btnStyle: 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20',
  },
  emerald_green: {
    wrapper: 'bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-emerald-50 border-emerald-700/40',
    badgeBg: 'bg-emerald-400/25 text-emerald-100 border-emerald-300/30',
    glow1: 'bg-emerald-400/10',
    glow2: 'bg-teal-400/20',
    btnStyle: 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300 shadow-md font-bold',
  },
  amber_gold: {
    wrapper: 'bg-gradient-to-r from-amber-700 via-orange-800 to-amber-950 text-amber-50 border-amber-600/40',
    badgeBg: 'bg-amber-400/25 text-amber-100 border-amber-300/30',
    glow1: 'bg-amber-400/15',
    glow2: 'bg-orange-400/20',
    btnStyle: 'bg-amber-400 text-amber-950 hover:bg-amber-300 shadow-md font-bold',
  },
  purple_violet: {
    wrapper: 'bg-gradient-to-r from-purple-800 via-indigo-900 to-fuchsia-950 text-purple-50 border-purple-700/40',
    badgeBg: 'bg-purple-400/25 text-purple-100 border-purple-300/30',
    glow1: 'bg-fuchsia-400/15',
    glow2: 'bg-purple-400/20',
    btnStyle: 'bg-purple-300 text-purple-950 hover:bg-purple-200 shadow-md font-bold',
  },
  rose_crimson: {
    wrapper: 'bg-gradient-to-r from-rose-700 via-pink-900 to-rose-950 text-rose-50 border-rose-700/40',
    badgeBg: 'bg-rose-400/25 text-rose-100 border-rose-300/30',
    glow1: 'bg-rose-400/15',
    glow2: 'bg-pink-400/20',
    btnStyle: 'bg-white text-rose-900 hover:bg-rose-50 shadow-md font-bold',
  },
  cyber_cyan: {
    wrapper: 'bg-gradient-to-r from-cyan-900 via-sky-950 to-slate-950 text-cyan-50 border-cyan-500/40 shadow-inner',
    badgeBg: 'bg-cyan-400/25 text-cyan-100 border-cyan-300/30',
    glow1: 'bg-cyan-400/20',
    glow2: 'bg-sky-400/20',
    btnStyle: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-md shadow-cyan-400/20 font-bold',
  },
  sunset_orange: {
    wrapper: 'bg-gradient-to-r from-orange-600 via-rose-600 to-amber-700 text-white border-orange-500/40',
    badgeBg: 'bg-orange-300/30 text-orange-100 border-orange-200/40',
    glow1: 'bg-amber-300/20',
    glow2: 'bg-rose-400/20',
    btnStyle: 'bg-white text-orange-950 hover:bg-amber-50 shadow-md font-bold',
  },
  charcoal_dark: {
    wrapper: 'bg-gradient-to-r from-neutral-900 via-stone-900 to-zinc-950 text-neutral-100 border-neutral-700/50',
    badgeBg: 'bg-neutral-700/60 text-neutral-200 border-neutral-600/40',
    glow1: 'bg-white/5',
    glow2: 'bg-zinc-600/10',
    btnStyle: 'bg-neutral-100 text-neutral-900 hover:bg-white shadow-md font-bold',
  },
};

export const TEXT_SIZE_CLASSES: Record<CarouselTextSize, string> = {
  small: 'text-xs sm:text-sm leading-relaxed',
  normal: 'text-sm sm:text-base leading-relaxed',
  medium: 'text-base sm:text-lg leading-relaxed font-medium',
  large: 'text-lg sm:text-xl leading-relaxed font-bold tracking-tight',
};

export const KnowledgeCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CarouselItem[]>(FALLBACK_ITEMS);
  const [settings, setSettings] = useState<CarouselSettings>(DEFAULT_CAROUSEL_SETTINGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeWikiConcept, setActiveWikiConcept] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to Live Firebase Realtime Database
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeKnowledgeCarousel((data) => {
      if (!isMounted) return;

      if (data.settings) {
        setSettings(data.settings);
      }

      // Filter only active items
      const activeItems = (data.items || []).filter((item) => item.active !== false);

      if (activeItems.length > 0) {
        setItems(activeItems);
      } else {
        // If Firebase is empty, attempt initial API fetch or fallback
        fetchKnowledgeSnippets().then((apiData) => {
          if (!isMounted) return;
          if (apiData && apiData.length > 0) {
            const mapped: CarouselItem[] = apiData.map((snip, idx) => ({
              id: snip.id || `api_${idx}`,
              type: snip.type || 'concept',
              title_bn: snip.title_bn,
              content_bn: snip.content_bn,
              content_latex: snip.content_latex,
              answer_bn: snip.answer_bn,
              subject_id: snip.subject_id,
              theme: snip.theme || 'blue_royal',
              textSize: snip.textSize || 'normal',
              customDuration: snip.customDuration || 0,
              actionButton: snip.actionButton,
              pinned: Boolean(snip.pinned),
              active: true,
            }));
            setItems(mapped);
          } else {
            setItems(FALLBACK_ITEMS);
          }
        }).catch(() => {
          if (isMounted) setItems(FALLBACK_ITEMS);
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Safe bounds check for currentIndex
  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  // Current item and effective duration
  const currentItem = items[currentIndex] || FALLBACK_ITEMS[0];
  const effectiveThemeKey: CarouselTheme = currentItem.theme || settings.defaultTheme || 'blue_royal';
  const themeStyle = THEME_STYLES[effectiveThemeKey] || THEME_STYLES.blue_royal;
  const effectiveTextSize: CarouselTextSize = currentItem.textSize || settings.defaultTextSize || 'normal';
  const textSizeClass = TEXT_SIZE_CLASSES[effectiveTextSize] || TEXT_SIZE_CLASSES.normal;

  // Exact duration for this specific slide (custom vs global setting)
  const itemDurationSeconds =
    currentItem.customDuration && currentItem.customDuration > 0
      ? currentItem.customDuration
      : settings.intervalSeconds || 7;

  // 2. Dynamic Auto-advance Timer
  useEffect(() => {
    if (items.length === 0 || !settings.autoPlay || (isPaused && settings.pauseOnHover)) {
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setShowAnswer(false); // reset answer toggle
    }, itemDurationSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, currentIndex, itemDurationSeconds, settings.autoPlay, isPaused, settings.pauseOnHover]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setShowAnswer(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setShowAnswer(false);
  };

  // Handle action button click
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = currentItem.actionButton;
    if (!btn || !btn.enabled || !btn.link) return;

    if (btn.isExternal || btn.link.startsWith('http')) {
      window.open(btn.link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(btn.link);
    }
  };

  // Type badge styling & icon
  const getTypeBadge = (type: CarouselItemType) => {
    switch (type) {
      case 'quote':
        return {
          label: 'অনুপ্রেরণা',
          icon: Sparkles,
          bg: 'bg-amber-400/25 text-amber-100 border-amber-300/30',
        };
      case 'formula':
        return {
          label: 'সূত্র ও গণিত',
          icon: BookOpen,
          bg: 'bg-emerald-400/25 text-emerald-100 border-emerald-300/30',
        };
      case 'gk':
        return {
          label: 'সাধারণ জ্ঞান',
          icon: BrainCircuit,
          bg: 'bg-purple-400/25 text-purple-100 border-purple-300/30',
        };
      case 'concept':
        return {
          label: 'কনসেপ্ট নোট',
          icon: GraduationCap,
          bg: 'bg-cyan-400/25 text-cyan-100 border-cyan-300/30',
        };
      case 'shortcut':
        return {
          label: 'শর্টকাট ট্রিকস',
          icon: Zap,
          bg: 'bg-yellow-400/25 text-yellow-100 border-yellow-300/30',
        };
      case 'announcement':
        return {
          label: 'জরুরি ঘোষণা',
          icon: Megaphone,
          bg: 'bg-rose-400/25 text-rose-100 border-rose-300/30',
        };
      default:
        return {
          label: 'স্মার্ট নোট',
          icon: Lightbulb,
          bg: 'bg-white/20 text-white border-white/30',
        };
    }
  };

  const badgeInfo = getTypeBadge(currentItem.type);
  const BadgeIcon = badgeInfo.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative overflow-hidden rounded-2xl ${themeStyle.wrapper} p-4 sm:p-5 shadow-md min-h-[175px] flex flex-col justify-between select-none transition-colors duration-500`}
    >
      {/* Decorative background glow */}
      <div className={`absolute -top-10 -right-10 w-44 h-44 ${themeStyle.glow1} rounded-full blur-2xl pointer-events-none`} />
      <div className={`absolute -bottom-8 -left-8 w-36 h-36 ${themeStyle.glow2} rounded-full blur-xl pointer-events-none`} />

      {/* Top Bar: Type Badge, Title, Pinned Indicator & Nav Buttons */}
      <div className="relative z-10 flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {settings.showBadge && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-xs shadow-xs ${badgeInfo.bg}`}
            >
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{badgeInfo.label}</span>
            </div>
          )}

          {currentItem.pinned && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
              <Pin className="w-2.5 h-2.5 fill-amber-300" />
              <span>পিন করা</span>
            </div>
          )}

          {/* Quick Wiki Concept Trigger Button */}
          {currentItem.type !== 'quote' && (
            <button
              type="button"
              onClick={() => {
                const topicQuery =
                  currentItem.title_bn ||
                  (currentItem.content_bn ? currentItem.content_bn.slice(0, 30) : 'পদার্থবিজ্ঞান');
                setActiveWikiConcept(topicQuery);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-xs transition-colors cursor-pointer"
              title="উইকিপিডিয়া থেকে যাচাইকৃত কনসেপ্ট জানুন"
            >
              <Globe className="w-2.5 h-2.5 text-emerald-300" />
              <span>উইকি তথ্য</span>
            </button>
          )}

          <span className="text-[10px] text-white/80 font-mono font-semibold">
            {currentIndex + 1} / {items.length}
          </span>
        </div>

        {/* Prev / Next Buttons */}
        {settings.showNavButtons && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer backdrop-blur-xs shadow-xs"
              title="পূর্ববর্তী"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer backdrop-blur-xs shadow-xs"
              title="পরবর্তী"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Main Content with Motion Animated Crossfade */}
      <div className="relative z-10 flex-1 flex flex-col justify-center my-1 min-h-[85px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id + '-' + currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full space-y-2"
          >
            {/* Optional Title */}
            {currentItem.title_bn && (
              <h4 className="text-xs sm:text-sm font-bold text-white/90 flex items-center gap-1.5 tracking-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                {currentItem.title_bn}
              </h4>
            )}

            {/* Quote Type */}
            {currentItem.type === 'quote' && (
              <div className="flex items-start gap-3">
                <Quote className="w-7 h-7 text-amber-300/80 shrink-0 transform -scale-x-100" />
                <p className={`${textSizeClass} italic leading-relaxed text-white/95`}>
                  {currentItem.content_bn}
                </p>
              </div>
            )}

            {/* Formula Type */}
            {currentItem.type === 'formula' && (
              <div className="space-y-1.5">
                <p className={`${textSizeClass} font-semibold text-white/95`}>
                  {currentItem.content_bn}
                </p>
                {currentItem.content_latex && (
                  <div className="p-2.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/20 text-white overflow-x-auto shadow-inner">
                    <MathText
                      text={currentItem.content_latex}
                      className="text-white text-center font-mono !text-white [&_*]:!text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* GK Question Type */}
            {currentItem.type === 'gk' && (
              <div
                onClick={() => setShowAnswer(!showAnswer)}
                className="cursor-pointer group space-y-2 p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`${textSizeClass} font-bold text-white leading-snug`}>
                    <span className="text-purple-300 font-extrabold mr-1">প্রশ্ন:</span>
                    {currentItem.content_bn}
                  </p>

                  <div className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-purple-200 bg-purple-900/40 px-2.5 py-0.5 rounded-full border border-purple-300/30">
                    {showAnswer ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>লুকান</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>উত্তর দেখুন</span>
                      </>
                    )}
                  </div>
                </div>

                {showAnswer && currentItem.answer_bn && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 border-t border-white/20 text-xs sm:text-sm font-semibold text-amber-200 flex items-start gap-1.5"
                  >
                    <span className="font-bold text-emerald-300 shrink-0">উত্তর:</span>
                    <span>{currentItem.answer_bn}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Concept / Shortcut / Announcement / General Type */}
            {currentItem.type !== 'quote' && currentItem.type !== 'formula' && currentItem.type !== 'gk' && (
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                <MathText
                  text={currentItem.content_bn}
                  className={`${textSizeClass} leading-relaxed text-white font-medium [&_*]:!text-white`}
                />
                {currentItem.content_latex && (
                  <div className="mt-2 p-2 rounded-lg bg-black/25 border border-white/20 text-center">
                    <MathText
                      text={currentItem.content_latex}
                      className="text-white font-mono [&_*]:!text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Optional Action Button */}
            {currentItem.actionButton?.enabled && currentItem.actionButton.text && (
              <div className="pt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleActionClick}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    currentItem.actionButton.variant === 'glass'
                      ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md'
                      : currentItem.actionButton.variant === 'outline'
                      ? 'bg-transparent hover:bg-white/10 text-white border border-white/40'
                      : themeStyle.btnStyle
                  }`}
                >
                  <span>{currentItem.actionButton.text}</span>
                  {currentItem.actionButton.isExternal ? (
                    <ExternalLink className="w-3 h-3" />
                  ) : (
                    <ArrowRight className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Progress / Pagination Dots */}
      {settings.showProgressDots && items.length > 1 && (
        <div className="relative z-10 flex items-center justify-center gap-1.5 pt-1">
          {items.slice(0, 15).map((snippet, idx) => (
            <button
              key={snippet.id + '-' + idx}
              onClick={() => {
                setCurrentIndex(idx);
                setShowAnswer(false);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'w-6 bg-white shadow-xs'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
              title={`আইটেম ${idx + 1}`}
            />
          ))}
          {items.length > 15 && (
            <span className="text-[9px] text-white/60 font-mono">+{items.length - 15}</span>
          )}
        </div>
      )}

      {/* Wikipedia Verified Concept Modal */}
      {activeWikiConcept && (
        <WikiConceptModal
          isOpen={Boolean(activeWikiConcept)}
          onClose={() => setActiveWikiConcept(null)}
          conceptQuery={activeWikiConcept}
        />
      )}
    </div>
  );
};

export default KnowledgeCarousel;
