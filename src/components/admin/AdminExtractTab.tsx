import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Upload,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Layers,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { QuestionSubject } from '../../types';
import { SUBJECTS_DATA, CHAPTERS_DATA } from '../../data/admissionData';
import { runAdminAiExtractApi } from '../../services/api';

interface AdminExtractTabProps {
  onExtractionComplete: () => void;
  onNavigateToDrafts: () => void;
}

const AI_EXTRACTION_MODELS = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router',
    badge: 'ডিফল্ট • ফ্রি অটো রাউটার',
    desc: 'সর্বোচ্চ ফ্রি মডেলের মধ্য থেকে স্বয়ংক্রিয়ভাবে উপযুক্ত মডেল নির্বাচন করে',
    recommendedFor: 'all',
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
    name: 'NVIDIA Nemotron 70B (Free)',
    badge: 'উচ্চ যুক্তি ও গণিত',
    desc: 'জটিল ফিজিক্স, কেমিস্ট্রি ম্যাথ ও ল্যাটেক্স সমীকরণ সঠিকভাবে প্রসেস করতে আদর্শ',
    recommendedFor: 'questions',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Meta Llama 3.3 70B (Free)',
    badge: 'উচ্চ নির্ভুলতা',
    desc: 'বাংলা ব্যাকরণ, সাধারণ জ্ঞান এবং দীর্ঘ চ্যাপ্টার সামারি তৈরির জন্য চমৎকার',
    recommendedFor: 'topics',
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B (Free)',
    badge: 'কঠোর JSON স্ট্রাকচার',
    desc: 'শতভাগ নিখুঁত ও সঠিক JSON স্কিমা ফরম্যাট ডেলিভারিতে পারদর্শী',
    recommendedFor: 'all',
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Google Gemini 2.0 Flash (Free)',
    badge: 'ছবি ও মাল্টিমোডাল',
    desc: 'প্রশ্নপত্রের ছবি বা হাতের লেখার নোট থেকে নির্ভুল ডেটা নিষ্কাশন করতে পারে',
    recommendedFor: 'image',
  },
];

export const AdminExtractTab: React.FC<AdminExtractTabProps> = ({
  onExtractionComplete,
  onNavigateToDrafts,
}) => {
  const [extractType, setExtractType] = useState<'questions' | 'topics' | 'knowledge_snippets'>('questions');
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [selectedSubject, setSelectedSubject] = useState<QuestionSubject>('physics_1');
  const [selectedChapter, setSelectedChapter] = useState<string>('phy1_ch1');
  const [selectedModel, setSelectedModel] = useState<string>('openrouter/free');
  const [customModelInput, setCustomModelInput] = useState('');
  
  const [textContent, setTextContent] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [promptNotes, setPromptNotes] = useState('');

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractSuccess, setExtractSuccess] = useState<{
    count: number;
    message: string;
    reasoning?: string;
  } | null>(null);

  // Available chapters for selected subject
  const availableChapters = useMemo(() => {
    return CHAPTERS_DATA.filter((ch) => ch.subject_id === selectedSubject);
  }, [selectedSubject]);

  const handleSubjectChange = (subjectId: QuestionSubject) => {
    setSelectedSubject(subjectId);
    const firstChap = CHAPTERS_DATA.find((ch) => ch.subject_id === subjectId);
    if (firstChap) {
      setSelectedChapter(firstChap.id);
    } else {
      setSelectedChapter('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartExtraction = async () => {
    setExtractError('');
    setExtractSuccess(null);

    if (inputMode === 'text' && !textContent.trim()) {
      setExtractError('অনুগ্রহ করে নিষ্কাশনের জন্য বইয়ের টেক্সট বা প্রশ্নাবলী দিন।');
      return;
    }

    if (inputMode === 'image' && !imageBase64) {
      setExtractError('অনুগ্রহ করে একটি ছবি আপলোড করুন।');
      return;
    }

    setIsExtracting(true);

    const effectiveModel = customModelInput.trim() || selectedModel;

    try {
      const result = await runAdminAiExtractApi({
        content: inputMode === 'text' ? textContent : undefined,
        image: inputMode === 'image' ? imageBase64! : undefined,
        type: extractType,
        subject_id: selectedSubject,
        chapter_id: selectedChapter,
        model: effectiveModel,
        promptNotes: promptNotes.trim(),
      });

      if (result.success) {
        setExtractSuccess({
          count: result.count,
          message: result.message,
          reasoning: result.reasoning,
        });
        setTextContent('');
        setImageBase64(null);
        setImageFileName(null);
        onExtractionComplete();
      } else {
        setExtractError(result.message || 'নিষ্কাশন সম্পন্ন করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setExtractError(err.message || 'এআই নিষ্কাশনে ত্রুটি দেখা দিয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              এআই ডেটা ইনজেকশন পাইপলাইন
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              অটোমেটেড কনটেন্ট এক্সট্রাকশন স্টুডিও
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              কাঁচা বইয়ের পৃষ্ঠা, হ্যান্ডনোট, অতীতের প্রশ্নব্যাংক বা ছবি থেকে স্বয়ংক্রিয়ভাবে সিলেবাস অনুযায়ী এমসিকিউ, টপিক বা সূত্রাবলি নিষ্কাশন করুন।
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 max-w-sm">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-snug">
              <strong>নিরাপত্তা নীতি:</strong> সমস্ত ডেটা প্রথমে পেন্ডিং ড্রাফট কিউতে জমা হবে। অ্যাডমিনের অনুমোদন ছাড়া লাইভ ডেটাবেজে কোনো পরিবর্তন হবে না।
            </p>
          </div>
        </div>
      </div>

      {/* Main Extraction Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Input & Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Type Selector */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <label className="text-sm font-bold text-slate-900 block">
              ১. নিষ্কাশনের ধরন নির্বাচন করুন (Extraction Target)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setExtractType('questions')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  extractType === 'questions'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${extractType === 'questions' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  {extractType === 'questions' && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-slate-900">বহুনির্বাচনী প্রশ্নাবলী (MCQ)</div>
                  <div className="text-xs text-slate-500 mt-0.5">৪টি অপশন, সঠিক উত্তর, ল্যাটেক্স ব্যাখ্যা ও ট্যাগ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExtractType('topics')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  extractType === 'topics'
                    ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${extractType === 'topics' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  {extractType === 'topics' && <Check className="w-4 h-4 text-purple-600" />}
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-slate-900">অধ্যায় ও টপিক (Topics)</div>
                  <div className="text-xs text-slate-500 mt-0.5">সাবটপিক কোড, স্টার রেটিং ও প্রধান সূত্রাবলি</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExtractType('knowledge_snippets')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  extractType === 'knowledge_snippets'
                    ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${extractType === 'knowledge_snippets' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  {extractType === 'knowledge_snippets' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-slate-900">নলেজ স্নপেট ও ফর্মুলা</div>
                  <div className="text-xs text-slate-500 mt-0.5">শর্টকাট চার্ট, ফর্মুলা ট্রিকস ও তথ্য</div>
                </div>
              </button>
            </div>
          </div>

          {/* Subject & Chapter Selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <label className="text-sm font-bold text-slate-900 block">
              ২. বিষয় ও অধ্যায় প্রেক্ষাপট (Subject & Chapter Context)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">বিষয় নির্বাচন করুন</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(e.target.value as QuestionSubject)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white cursor-pointer"
                >
                  {SUBJECTS_DATA.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.bangla_name} ({sub.paper}) - {sub.short_code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">অধ্যায় নির্বাচন করুন</label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white cursor-pointer"
                >
                  {availableChapters.length > 0 ? (
                    availableChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.bangla_name} ({ch.name})
                      </option>
                    ))
                  ) : (
                    <option value="">অধ্যায় পাওয়া যায়নি (কাস্টম)</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Input Source & Content */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 block">
                ৩. উৎস ইনপুট দিন (Source Data)
              </label>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inputMode === 'text' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  টেক্সট বা বইয়ের অনুচ্ছেদ
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('image')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    inputMode === 'image' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  প্রশ্নপত্রের ছবি (OCR)
                </button>
              </div>
            </div>

            {inputMode === 'text' ? (
              <div>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="এখানে বইয়ের পৃষ্ঠা, মডেল টেস্ট প্রশ্নব্যাংক, অথবা অগোছালো প্রশ্ন-উত্তর পেস্ট করুন...&#10;&#10;উদাহরণ:&#10;১. ভেক্টর গুণন সম্পর্কিত প্রশ্ন...&#10;ক) ... খ) ... গ) ... ঘ) ...&#10;উত্তর: খ | ব্যাখ্যা: সামান্তরিক সূত্র..."
                  rows={9}
                  className="w-full p-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-y font-mono leading-relaxed"
                />
                <div className="flex justify-between items-center text-xs text-slate-400 mt-1.5">
                  <span>শব্দ সংখ্যা: {textContent.split(/\s+/).filter(Boolean).length}</span>
                  <span>LaTeX সূত্র যেমন: $E=mc^2$ স্বয়ংক্রিয়ভাবে ফরম্যাট করা হবে</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="question-image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label htmlFor="question-image-upload" className="cursor-pointer block">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      প্রশ্নপত্রের ছবি বা স্ক্যান কপি আপলোড করুন
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG, JPEG (সর্বোচ্চ 10MB) • ক্যামেরা বা গ্যালারি থেকে নির্বাচন করুন
                    </p>
                  </label>
                </div>

                {imageBase64 && (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <img
                      src={imageBase64}
                      alt="Uploaded Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{imageFileName || 'ছবি লোড হয়েছে'}</p>
                      <p className="text-xs text-emerald-700 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> এআই ভিশন মডেল প্রস্তুত
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageBase64(null);
                        setImageFileName(null);
                      }}
                      className="text-xs text-red-600 hover:underline px-2 py-1 cursor-pointer"
                    >
                      বাতিল
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                অ্যাডমিন বিশেষ নির্দেশনা (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={promptNotes}
                onChange={(e) => setPromptNotes(e.target.value)}
                placeholder="যেমন: শুধুমাত্র ঢাবি ও বুয়েটের স্ট্যান্ডার্ড প্রশ্ন আলাদা করুন, শর্টকাট ট্রিকস যুক্ত করুন..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Model Selection & Trigger */}
        <div className="space-y-6">
          {/* Model Selector Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 block">
                ৪. এআই মডেল নির্বাচন
              </label>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ওপেনরাউটার ফ্রি
              </span>
            </div>

            <div className="space-y-2.5">
              {AI_EXTRACTION_MODELS.map((model) => (
                <div
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setCustomModelInput('');
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedModel === model.id && !customModelInput
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/10'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{model.name}</span>
                    {selectedModel === model.id && !customModelInput && (
                      <Check className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                  </div>
                  <span className="inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded mt-1">
                    {model.badge}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{model.desc}</p>
                </div>
              ))}
            </div>

            {/* Custom Model */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                অন্য কোনো ওপেনরাউটার মডেল স্ট্রিং:
              </label>
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder="e.g. anthropic/claude-3.5-sonnet"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              />
            </div>
          </div>

          {/* Action Trigger Box */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-800 shadow-md space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                নিষ্কাশন ও স্টেজিং
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                এআই প্রসেস শেষ হলে সমস্ত ডেটা <strong>পেন্ডিং ড্রাফট কিউতে</strong> যুক্ত হবে।
              </p>
            </div>

            {extractError && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{extractError}</span>
              </div>
            )}

            {extractSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {extractSuccess.message}
                </div>
                <button
                  type="button"
                  onClick={onNavigateToDrafts}
                  className="w-full mt-2 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  পেন্ডিং অনুমোদন কিউতে যান <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartExtraction}
              disabled={isExtracting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  নিষ্কাশন চলছে... অনুগ্রহ করে অপেক্ষা করুন
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  নিষ্কাশন শুরু করুন
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
