import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  GraduationCap,
  Lightbulb,
  Zap,
  Megaphone,
  Plus,
  Trash2,
  Edit3,
  Pin,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sliders,
  Clock,
  Palette,
  Type,
  Link,
  RotateCcw,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Layers,
  HelpCircle,
  Quote,
} from 'lucide-react';
import {
  CarouselItem,
  CarouselSettings,
  CarouselTheme,
  CarouselTextSize,
  CarouselItemType,
} from '../../types';
import {
  subscribeKnowledgeCarousel,
  saveCarouselSettings,
  saveCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
  toggleCarouselItemStatus,
  toggleCarouselItemPin,
  seedDefaultCarouselToFirebase,
  DEFAULT_CAROUSEL_SETTINGS,
} from '../../services/firebase';
import { INITIAL_KNOWLEDGE_SNIPPETS } from '../../data/admissionData';
import { THEME_STYLES, TEXT_SIZE_CLASSES } from '../KnowledgeCarousel';
import MathText from '../MathText';
import { useToast } from '../../context/ToastContext';

const THEME_OPTIONS: { id: CarouselTheme; name: string; gradient: string; previewBg: string }[] = [
  {
    id: 'blue_royal',
    name: 'রয়েল ব্লু (ডিফল্ট)',
    gradient: 'from-blue-700 via-indigo-700 to-indigo-800',
    previewBg: 'bg-indigo-600',
  },
  {
    id: 'dark_navy',
    name: 'ডিপ নেভি ব্ল্যাক',
    gradient: 'from-slate-900 via-slate-950 to-blue-950',
    previewBg: 'bg-slate-900 border border-blue-800',
  },
  {
    id: 'emerald_green',
    name: 'এমারেল্ড গ্রীন',
    gradient: 'from-emerald-800 via-teal-900 to-emerald-950',
    previewBg: 'bg-emerald-700',
  },
  {
    id: 'amber_gold',
    name: 'গোল্ডেন অ্যাম্বার',
    gradient: 'from-amber-700 via-orange-800 to-amber-950',
    previewBg: 'bg-amber-600',
  },
  {
    id: 'purple_violet',
    name: 'পার্পল ভায়োলেট',
    gradient: 'from-purple-800 via-indigo-900 to-fuchsia-950',
    previewBg: 'bg-purple-700',
  },
  {
    id: 'rose_crimson',
    name: 'ক্রিমসন রোজ',
    gradient: 'from-rose-700 via-pink-900 to-rose-950',
    previewBg: 'bg-rose-700',
  },
  {
    id: 'cyber_cyan',
    name: 'সাইবার সায়ান',
    gradient: 'from-cyan-900 via-sky-950 to-slate-950',
    previewBg: 'bg-cyan-700',
  },
  {
    id: 'sunset_orange',
    name: 'সানসেট ওরেঞ্জ',
    gradient: 'from-orange-600 via-rose-600 to-amber-700',
    previewBg: 'bg-orange-600',
  },
  {
    id: 'charcoal_dark',
    name: 'মিনিমাল চারকোল',
    gradient: 'from-neutral-900 via-stone-900 to-zinc-950',
    previewBg: 'bg-neutral-800 border border-neutral-700',
  },
];

const ITEM_TYPES: { id: CarouselItemType; label: string; icon: any; color: string }[] = [
  { id: 'concept', label: 'কনসেপ্ট নোট', icon: GraduationCap, color: 'text-cyan-400' },
  { id: 'formula', label: 'সূত্র ও গণিত', icon: BookOpen, color: 'text-emerald-400' },
  { id: 'gk', label: 'সাধারণ জ্ঞান / প্রশ্ন-উত্তর', icon: BrainCircuit, color: 'text-purple-400' },
  { id: 'quote', label: 'অনুপ্রেরণামূলক বাক্য', icon: Sparkles, color: 'text-amber-400' },
  { id: 'shortcut', label: 'শর্টকাট ট্রিকস', icon: Zap, color: 'text-yellow-400' },
  { id: 'announcement', label: 'জরুরি ঘোষণা', icon: Megaphone, color: 'text-rose-400' },
];

export const AdminKnowledgeCarouselTab: React.FC = () => {
  const toast = useToast();
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [settings, setSettings] = useState<CarouselSettings>(DEFAULT_CAROUSEL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal / Form state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<CarouselItemType>('concept');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formLatex, setFormLatex] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTheme, setFormTheme] = useState<CarouselTheme>('blue_royal');
  const [formTextSize, setFormTextSize] = useState<CarouselTextSize>('normal');
  const [formCustomDuration, setFormCustomDuration] = useState<number>(0);
  const [formPinned, setFormPinned] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [formBtnEnabled, setFormBtnEnabled] = useState(false);
  const [formBtnText, setFormBtnText] = useState('');
  const [formBtnLink, setFormBtnLink] = useState('');
  const [formBtnVariant, setFormBtnVariant] = useState<'primary' | 'glass' | 'outline'>('primary');

  // Live preview preview state for answer reveal
  const [previewShowAnswer, setPreviewShowAnswer] = useState(false);

  // 1. Subscribe to Firebase Live RTDB
  useEffect(() => {
    const unsubscribe = subscribeKnowledgeCarousel((data) => {
      setItems(data.items || []);
      if (data.settings) {
        setSettings(data.settings);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Global Settings Change & Save
  const handleUpdateGlobalSettings = async (updates: Partial<CarouselSettings>) => {
    setIsSavingSettings(true);
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await saveCarouselSettings(newSettings);
      toast.success('ক্যারোসেল গ্লোবাল সেটিংস সংরক্ষিত হয়েছে');
    } catch (err: any) {
      toast.error('সেটিংস সংরক্ষণ ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormType('concept');
    setFormTitle('');
    setFormContent('');
    setFormLatex('');
    setFormAnswer('');
    setFormTheme(settings.defaultTheme || 'blue_royal');
    setFormTextSize(settings.defaultTextSize || 'normal');
    setFormCustomDuration(0);
    setFormPinned(false);
    setFormActive(true);
    setFormBtnEnabled(false);
    setFormBtnText('');
    setFormBtnLink('');
    setFormBtnVariant('primary');
    setPreviewShowAnswer(false);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: CarouselItem) => {
    setEditingId(item.id);
    setFormType(item.type || 'concept');
    setFormTitle(item.title_bn || '');
    setFormContent(item.content_bn || '');
    setFormLatex(item.content_latex || '');
    setFormAnswer(item.answer_bn || '');
    setFormTheme(item.theme || settings.defaultTheme || 'blue_royal');
    setFormTextSize(item.textSize || settings.defaultTextSize || 'normal');
    setFormCustomDuration(item.customDuration || 0);
    setFormPinned(Boolean(item.pinned));
    setFormActive(item.active !== false);
    setFormBtnEnabled(Boolean(item.actionButton?.enabled));
    setFormBtnText(item.actionButton?.text || '');
    setFormBtnLink(item.actionButton?.link || '');
    setFormBtnVariant(item.actionButton?.variant || 'primary');
    setPreviewShowAnswer(false);
    setIsModalOpen(true);
  };

  // Save Card (Create or Update)
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      toast.error('অনুগ্রহ করে বিষয়বস্তু / প্রশ্ন লিখুন');
      return;
    }

    setIsSavingItem(true);
    try {
      const payload: Partial<CarouselItem> & { content_bn: string } = {
        id: editingId || undefined,
        type: formType,
        title_bn: formTitle.trim(),
        content_bn: formContent.trim(),
        content_latex: formLatex.trim(),
        answer_bn: formAnswer.trim(),
        theme: formTheme,
        textSize: formTextSize,
        customDuration: Number(formCustomDuration) || 0,
        pinned: formPinned,
        active: formActive,
        actionButton: {
          enabled: formBtnEnabled,
          text: formBtnText.trim(),
          link: formBtnLink.trim(),
          variant: formBtnVariant,
          isExternal: formBtnLink.startsWith('http'),
        },
      };

      await saveCarouselItem(payload);
      toast.success(editingId ? 'কার্ড সফলভাবে আপডেট হয়েছে' : 'নতুন কার্ড যুক্ত হয়েছে');
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error('সংরক্ষণ ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setIsSavingItem(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (item: CarouselItem) => {
    try {
      const nextStatus = item.active === false;
      await toggleCarouselItemStatus(item.id, nextStatus);
      toast.info(nextStatus ? 'কার্ড সক্রিয় করা হয়েছে' : 'কার্ড নিষ্ক্রিয় করা হয়েছে');
    } catch (err: any) {
      toast.error('স্ট্যাটাস পরিবর্তন ব্যর্থ');
    }
  };

  // Toggle Pin Status
  const handleTogglePin = async (item: CarouselItem) => {
    try {
      const nextPin = !item.pinned;
      await toggleCarouselItemPin(item.id, nextPin);
      toast.success(nextPin ? 'কার্ডটি সবার শীর্ষে পিন করা হয়েছে' : 'কার্ডটি আনপিন করা হয়েছে');
    } catch (err: any) {
      toast.error('পিন পরিবর্তন ব্যর্থ');
    }
  };

  // Delete Card
  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই কার্ডটি মুছে ফেলতে চান?')) return;
    try {
      await deleteCarouselItem(id);
      toast.info('কার্ড মুছে ফেলা হয়েছে');
    } catch (err: any) {
      toast.error('মুছতে ব্যর্থ হয়েছে');
    }
  };

  // 1-Click Seed Initial Default Items
  const handleSeedDefaults = async () => {
    if (!window.confirm('অ্যাপের ডিফল্ট ৩০টি কার্ড Firebase-এ সিঙ্ক করবেন? এটি বিদ্যমান তালিকা ওভাররাইট বা সমৃদ্ধ করবে।')) return;
    try {
      setLoading(true);
      await seedDefaultCarouselToFirebase(INITIAL_KNOWLEDGE_SNIPPETS);
      toast.success('ডিফল্ট ৩০টি কার্ড সফলভাবে Firebase-এ সিঙ্ক হয়েছে!');
    } catch (err: any) {
      toast.error('সিঙ্ক ব্যর্থ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered List
  const filteredItems = items.filter((it) => {
    if (typeFilter !== 'all' && it.type !== typeFilter) return false;
    if (statusFilter === 'active' && it.active === false) return false;
    if (statusFilter === 'inactive' && it.active !== false) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (it.content_bn || '').toLowerCase();
      const matchTitle = (it.title_bn || '').toLowerCase();
      const matchLatex = (it.content_latex || '').toLowerCase();
      const matchAnswer = (it.answer_bn || '').toLowerCase();
      return (
        matchText.includes(q) ||
        matchTitle.includes(q) ||
        matchLatex.includes(q) ||
        matchAnswer.includes(q)
      );
    }
    return true;
  });

  // Active Count & Pinned Count
  const activeCount = items.filter((i) => i.active !== false).length;
  const pinnedCount = items.filter((i) => Boolean(i.pinned)).length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">
                নলেজ ক্যারোসেল ম্যানেজার
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Firebase RTDB Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              অ্যাপের হোম স্ক্রিনের স্লাইডার, টাইমার, রঙ, ফন্ট সাইজ ও LaTeX রিয়েল-টাইমে নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {items.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-indigo-400" />
              ডিফল্ট ৩০টি কার্ড সিঙ্ক করুন
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন কার্ড যোগ করুন
          </button>
        </div>
      </div>

      {/* Global Carousel Controls & Settings Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              গ্লোবাল ক্যারোসেল সেটিংস ও টাইমার কন্ট্রোল
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            সকল শিক্ষার্থীর স্ক্রিনে তাৎক্ষণিক কার্যকর
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Timer Interval Speed */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              স্লাইড পরিবর্তন সময় (টাইমার)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="3"
                max="60"
                value={settings.intervalSeconds || 7}
                onChange={(e) =>
                  handleUpdateGlobalSettings({
                    intervalSeconds: Math.max(3, parseInt(e.target.value) || 7),
                  })
                }
                className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-400">সেকেন্ড পর পর</span>
            </div>
            <div className="flex gap-1.5 pt-1">
              {[5, 7, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleUpdateGlobalSettings({ intervalSeconds: sec })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    settings.intervalSeconds === sec
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* 2. Default Global Theme */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              ডিফল্ট ব্যাকগ্রাউন্ড থিম
            </label>
            <select
              value={settings.defaultTheme || 'blue_royal'}
              onChange={(e) =>
                handleUpdateGlobalSettings({
                  defaultTheme: e.target.value as CarouselTheme,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {THEME_OPTIONS.map((th) => (
                <option key={th.id} value={th.id}>
                  {th.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {THEME_OPTIONS.map((th) => (
                <button
                  key={th.id}
                  onClick={() => handleUpdateGlobalSettings({ defaultTheme: th.id })}
                  title={th.name}
                  className={`w-6 h-6 rounded-full shrink-0 transition-transform cursor-pointer ${th.previewBg} ${
                    settings.defaultTheme === th.id
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 3. Default Text Size */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              ডিফল্ট ফন্ট সাইজ
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'small', label: 'ছোট' },
                { id: 'normal', label: 'স্বাভাবিক' },
                { id: 'medium', label: 'মাঝারি' },
                { id: 'large', label: 'বড়' },
              ].map((sz) => (
                <button
                  key={sz.id}
                  onClick={() =>
                    handleUpdateGlobalSettings({
                      defaultTextSize: sz.id as CarouselTextSize,
                    })
                  }
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    settings.defaultTextSize === sz.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Display Toggles */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              ডিসপ্লে ও ইন্টারঅ্যাকশন কন্ট্রোল
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>অটো-প্লে (Auto Play)</span>
              <input
                type="checkbox"
                checked={settings.autoPlay}
                onChange={(e) => handleUpdateGlobalSettings({ autoPlay: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>হোভার করলে থামবে (Pause on Hover)</span>
              <input
                type="checkbox"
                checked={settings.pauseOnHover}
                onChange={(e) => handleUpdateGlobalSettings({ pauseOnHover: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>ক্যাটাগরি ব্যাজ দেখাও</span>
              <input
                type="checkbox"
                checked={settings.showBadge}
                onChange={(e) => handleUpdateGlobalSettings({ showBadge: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
              <span>ন্যাভিগেশন তীর চিহ্ন দেখাও</span>
              <input
                type="checkbox"
                checked={settings.showNavButtons}
                onChange={(e) => handleUpdateGlobalSettings({ showNavButtons: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Metrics & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        {/* Status Metrics Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
            মোট কার্ড: <strong className="text-white ml-1">{items.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-semibold border border-emerald-500/20">
            সক্রিয়: <strong className="text-emerald-400 ml-1">{activeCount}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            পিন করা: <strong className="text-amber-400 ml-1">{pinnedCount}</strong>
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কার্ডের টেক্সট বা ফর্মুলা খুঁজুন..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">সকল ধরন</option>
            {ITEM_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">সকল স্ট্যাটাস</option>
            <option value="active">শুধু সক্রিয়</option>
            <option value="inactive">নিষ্ক্রিয়</option>
          </select>
        </div>
      </div>

      {/* Cards List Grid */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <Sparkles className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400" />
          <p className="text-sm font-semibold">Firebase RTDB থেকে ক্যারোসেল লোড হচ্ছে...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <HelpCircle className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">কোনো ক্যারোসেল কার্ড পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            উপরে "নতুন কার্ড যোগ করুন" বাটনে ক্লিক করে প্রথম কনসেপ্ট বা সূত্র তৈরি করুন অথবা ডিফল্ট কার্ডগুলো সিঙ্ক করুন।
          </p>
          <button
            onClick={handleSeedDefaults}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
          >
            ডিফল্ট ৩০টি কার্ড সিঙ্ক করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item, idx) => {
            const itemTheme = item.theme || settings.defaultTheme || 'blue_royal';
            const themeDef = THEME_OPTIONS.find((t) => t.id === itemTheme) || THEME_OPTIONS[0];

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`rounded-2xl border transition-all flex flex-col justify-between p-4 relative ${
                  item.active !== false
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                    : 'bg-slate-950/60 border-slate-800/50 opacity-60'
                }`}
              >
                {/* Header Tag & Quick Actions */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {ITEM_TYPES.find((t) => t.id === item.type)?.label || item.type}
                    </span>

                    {item.pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Pin className="w-2.5 h-2.5 fill-amber-300" />
                        পিন
                      </span>
                    )}

                    {item.customDuration ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/40">
                        {item.customDuration}s
                      </span>
                    ) : null}
                  </div>

                  {/* Pin & Active Toggle */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePin(item)}
                      title={item.pinned ? 'আনপিন করুন' : 'সবার শীর্ষে পিন করুন'}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        item.pinned
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(item)}
                      title={item.active !== false ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        item.active !== false
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-slate-600 hover:text-emerald-400 hover:bg-slate-800'
                      }`}
                    >
                      {item.active !== false ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Block */}
                <div className="space-y-2 flex-1 my-1">
                  {item.title_bn && (
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">
                      {item.title_bn}
                    </h4>
                  )}

                  <div className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    <MathText text={item.content_bn} />
                  </div>

                  {item.content_latex && (
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs overflow-x-auto font-mono text-center">
                      <MathText text={item.content_latex} />
                    </div>
                  )}

                  {item.answer_bn && (
                    <div className="p-2 rounded-xl bg-purple-950/20 border border-purple-800/30 text-[11px] text-purple-200">
                      <strong className="text-emerald-400 mr-1">উত্তর:</strong>
                      {item.answer_bn}
                    </div>
                  )}
                </div>

                {/* Footer: Theme preview, CTA button indicator, and Edit/Delete */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-3 h-3 rounded-full ${themeDef.previewBg}`}
                      title={`থিম: ${themeDef.name}`}
                    />
                    <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                      {themeDef.name.split(' ')[0]}
                    </span>

                    {item.actionButton?.enabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold truncate max-w-[90px]">
                        🔘 {item.actionButton.text}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="সম্পাদনা করুন"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(item.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL WITH LIVE STUDENT PREVIEW */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {editingId ? 'ক্যারোসেল কার্ড সম্পাদনা করুন' : 'নতুন ক্যারোসেল কার্ড তৈরি করুন'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      LaTeX সমীকরণ, কাস্টম ব্যাকগ্রাউন্ড থিম, টাইমার এবং অ্যাকশন বাটন সহ
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form & Live Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Input Form Controls (7 cols) */}
                <form onSubmit={handleSaveCard} className="lg:col-span-7 space-y-4">
                  {/* Type Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      কার্ডের ক্যাটাগরি / ধরন
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ITEM_TYPES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormType(t.id)}
                            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                              formType === t.id
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{t.label.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      শিরোনাম (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="যেমন: পদার্থবিজ্ঞান ১ম পত্র — কাজ-শক্তি উপপাদ্য"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Main Content (BN & LaTeX supported) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span>মূল বিষয়বস্তু / প্রশ্ন (বাংলা ও $...$ LaTeX সাপোর্টেড)</span>
                      <span className="text-[11px] text-indigo-400 font-mono">আবশ্যক</span>
                    </label>
                    <textarea
                      rows={3}
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="যেমন: pH নো-ক্যালকুলেটর ট্র্যাপ: $[H^+] = 2 \times 10^{-3}$ M হলে, $pH = 3 - \log_{10}(2) = 2.70$"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                      required
                    />
                  </div>

                  {/* LaTeX Math Formula Block (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span>LaTeX সমীকরণ ব্লক (পৃথক ম্যাথ বক্স)</span>
                      <span className="text-[11px] text-slate-500 font-mono">ঐচ্ছিক</span>
                    </label>
                    <input
                      type="text"
                      value={formLatex}
                      onChange={(e) => setFormLatex(e.target.value)}
                      placeholder="যেমন: $W = \Delta E_k = \frac{1}{2}m(v^2 - u^2)$ বা \delta = \frac{2\pi}{\lambda}x"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Answer (For GK or Quiz) */}
                  {formType === 'gk' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        উত্তর / বিশদ ব্যাখ্যা (শিক্ষার্থী 'উত্তর দেখুন' চাপলে দেখতে পাবে)
                      </label>
                      <textarea
                        rows={2}
                        value={formAnswer}
                        onChange={(e) => setFormAnswer(e.target.value)}
                        placeholder="যেমন: ১৯২১ সালের ১ জুলাই; প্রথম উপাচার্য স্যার পি. জে. হার্টগ।"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Theme & Text Size Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        কার্ডের ব্যাকগ্রাউন্ড কালার / থিম
                      </label>
                      <select
                        value={formTheme}
                        onChange={(e) => setFormTheme(e.target.value as CarouselTheme)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {THEME_OPTIONS.map((th) => (
                          <option key={th.id} value={th.id}>
                            {th.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        টেক্সট সাইজ
                      </label>
                      <select
                        value={formTextSize}
                        onChange={(e) => setFormTextSize(e.target.value as CarouselTextSize)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="small">ছোট (Small)</option>
                        <option value="normal">স্বাভাবিক (Normal)</option>
                        <option value="medium">মাঝারি (Medium)</option>
                        <option value="large">বড় (Large Highlight)</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Duration & Pin To Top */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 border border-slate-800/80 rounded-2xl p-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        কাস্টম টাইমার (সেকেন্ড)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={formCustomDuration}
                        onChange={(e) => setFormCustomDuration(parseInt(e.target.value) || 0)}
                        placeholder="0 = গ্লোবাল টাইমার"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        (০ দিলে গ্লোবাল {settings.intervalSeconds || 7}s ব্যবহৃত হবে)
                      </span>
                    </div>

                    <div className="flex flex-col justify-center space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formPinned}
                          onChange={(e) => setFormPinned(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="flex items-center gap-1">
                          <Pin className="w-3.5 h-3.5 text-amber-400" />
                          সবার প্রথমে পিন করুন
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formActive}
                          onChange={(e) => setFormActive(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-emerald-400">সক্রিয় রাখুন (Active)</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Button Configuration */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-indigo-400" />
                        একশন বাটন যুক্ত করুন (Optional Call-to-Action)
                      </span>
                      <input
                        type="checkbox"
                        checked={formBtnEnabled}
                        onChange={(e) => setFormBtnEnabled(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    {formBtnEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            বাটন টেক্সট
                          </label>
                          <input
                            type="text"
                            value={formBtnText}
                            onChange={(e) => setFormBtnText(e.target.value)}
                            placeholder="যেমন: মক পরীক্ষা দাও"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            টার্গেট লিংক / রুট
                          </label>
                          <input
                            type="text"
                            value={formBtnLink}
                            onChange={(e) => setFormBtnLink(e.target.value)}
                            placeholder="যেমন: /exam বা /questions"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            ডিজাইন ভ্যারিয়েন্ট
                          </label>
                          <select
                            value={formBtnVariant}
                            onChange={(e) => setFormBtnVariant(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="primary">Solid High Contrast</option>
                            <option value="glass">Glass Transparent</option>
                            <option value="outline">Outline Border</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit / Cancel Buttons */}
                  <div className="flex gap-2.5 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-2xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingItem}
                      className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingItem ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          সংরক্ষণ হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          {editingId ? 'আপডেট সম্পন্ন করুন' : 'কার্ড সংরক্ষণ করুন'}
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Right: Live Student Card Preview (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      শিক্ষার্থীর স্ক্রিনে লাইভ প্রিভিউ
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Real-time Rendering</span>
                  </div>

                  {/* Render Mock Student Carousel Card */}
                  {(() => {
                    const themeStyle = THEME_STYLES[formTheme] || THEME_STYLES.blue_royal;
                    const textSizeClass = TEXT_SIZE_CLASSES[formTextSize] || TEXT_SIZE_CLASSES.normal;
                    const typeObj = ITEM_TYPES.find((t) => t.id === formType) || ITEM_TYPES[0];
                    const BadgeIcon = typeObj.icon;

                    return (
                      <div
                        className={`relative overflow-hidden rounded-2xl ${themeStyle.wrapper} p-4 sm:p-5 shadow-xl min-h-[220px] flex flex-col justify-between select-none`}
                      >
                        {/* Glows */}
                        <div className={`absolute -top-10 -right-10 w-40 h-40 ${themeStyle.glow1} rounded-full blur-2xl pointer-events-none`} />
                        <div className={`absolute -bottom-8 -left-8 w-32 h-32 ${themeStyle.glow2} rounded-full blur-xl pointer-events-none`} />

                        {/* Top Bar */}
                        <div className="relative z-10 flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                              <BadgeIcon className="w-3 h-3" />
                              <span>{typeObj.label}</span>
                            </div>

                            {formPinned && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                                <Pin className="w-2.5 h-2.5 fill-amber-300" />
                                <span>পিন করা</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="relative z-10 space-y-2 my-auto">
                          {formTitle && (
                            <h4 className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/80"></span>
                              {formTitle}
                            </h4>
                          )}

                          {formType === 'quote' ? (
                            <div className="flex items-start gap-2.5">
                              <Quote className="w-5 h-5 text-amber-300 shrink-0 transform -scale-x-100" />
                              <p className={`${textSizeClass} italic text-white/95 leading-relaxed`}>
                                {formContent || 'অনুপ্রেরণামূলক বাক্য লিখুন...'}
                              </p>
                            </div>
                          ) : formType === 'gk' ? (
                            <div className="space-y-2 p-2.5 rounded-xl bg-white/10 border border-white/20">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`${textSizeClass} font-bold text-white leading-snug`}>
                                  <span className="text-purple-300 font-extrabold mr-1">প্রশ্ন:</span>
                                  {formContent || 'সাধারণ জ্ঞান প্রশ্ন লিখুন...'}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setPreviewShowAnswer(!previewShowAnswer)}
                                  className="shrink-0 text-[10px] font-bold text-purple-200 bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-300/30"
                                >
                                  {previewShowAnswer ? 'লুকান' : 'উত্তর দেখুন'}
                                </button>
                              </div>
                              {previewShowAnswer && formAnswer && (
                                <div className="pt-1.5 border-t border-white/20 text-xs font-semibold text-amber-200">
                                  <span className="font-bold text-emerald-300 mr-1">উত্তর:</span>
                                  {formAnswer}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
                              <MathText
                                text={formContent || 'কনসেপ্ট বা তথ্যের বিবরণ লিখুন...'}
                                className={`${textSizeClass} leading-relaxed text-white font-medium [&_*]:!text-white`}
                              />
                            </div>
                          )}

                          {formLatex && (
                            <div className="p-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/20 text-white overflow-x-auto shadow-inner text-center font-mono">
                              <MathText text={formLatex} className="text-white [&_*]:!text-white" />
                            </div>
                          )}

                          {/* Action Button Preview */}
                          {formBtnEnabled && formBtnText && (
                            <div className="pt-1.5 flex justify-end">
                              <div
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                                  formBtnVariant === 'glass'
                                    ? 'bg-white/20 text-white border border-white/30'
                                    : formBtnVariant === 'outline'
                                    ? 'bg-transparent text-white border border-white/40'
                                    : themeStyle.btnStyle
                                }`}
                              >
                                <span>{formBtnText}</span>
                                <ArrowRight className="w-3 h-3" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Progress Dots Preview */}
                        <div className="relative z-10 flex items-center justify-center gap-1 pt-2">
                          <span className="w-5 h-1.5 rounded-full bg-white shadow-xs" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">💡 LaTeX লেখার নিয়মাবলি:</p>
                    <p>• টেক্সটের ভেতরে ইনলাইন গণিত: <code>{'$F = ma$'}</code> বা <code>{'$pH = 2.70$'}</code></p>
                    <p>• ভগ্নাংশ ও পাওয়ার: <code>{'$\\frac{2\\pi}{\\lambda}$'}</code> এবং <code>{'$x^2 + y^2$'}</code></p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminKnowledgeCarouselTab;
