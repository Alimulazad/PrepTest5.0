import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Camera,
  Search,
  X,
  Bot,
  User,
  Loader2,
  ExternalLink,
  ChevronDown,
  Settings,
  Key,
  Check,
  BrainCircuit,
  Zap,
  Trash2,
  ChevronRight,
  CheckSquare,
  StickyNote,
  Copy,
  Calendar,
  Layers,
  Cpu,
  Plus,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Globe,
} from 'lucide-react';
import { ChatMessage, Question, AIModelOption } from '../types';
import {
  askGeminiMentor,
  askGeminiMentorStream,
  solveQuestionFromPhoto,
  fetchAIModelsApi,
  getStoredAIModel,
  setStoredAIModel,
  getStoredOpenRouterKeys,
  setStoredOpenRouterKeys,
  getStoredCustomModelName,
  setStoredCustomModelName,
  fetchChatHistoryApi,
  saveChatMessageApi,
  clearChatHistoryApi,
} from '../services/api';
import {
  signInWithGoogleWorkspace,
  addTaskToGoogleTasks,
  createKeepNotePayload,
  getGoogleAccessToken,
} from '../services/googleWorkspace';
import GoogleCalendarSyncModal from './GoogleCalendarSyncModal';
import { WikiConceptModal } from './WikiConceptModal';
import MathText from './MathText';
import 'katex/dist/katex.min.css';

interface ChorchaAITutorProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: Question | null;
  initialTopicPrompt?: string | null;
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `আসসালামু আলাইকুম! আমি **PrepTest AI**, তোমার ব্যক্তিগত ভার্সিটি ও মেডিকেল অ্যাডমিশন মেন্টর। 🎓\n\nপদার্থবিজ্ঞান, রসায়ন, উচ্চতর গণিত বা জীববিজ্ঞানের যেকোনো জটিল প্রশ্ন, শর্টকাট কৌশল, নো-ক্যালকুলেটর ট্রিকস বা বিগত বছরের প্রশ্ন নিয়ে আমাকে জিজ্ঞেস করতে পারো। এমনকি কোনো প্রশ্নের ছবি আপলোড করলেও আমি নির্ভুল সমাধান ও শর্টকাটসহ বুঝিয়ে দেবো!\n\n💡 *যেকোনো উত্তরের নিচে 'Add to Google Tasks' অথবা 'Save Note to Keep' এ ক্লিক করে সহজে নোট সংরক্ষণ করতে পারবে।*`,
  timestamp: Date.now(),
};

export const ChorchaAITutor: React.FC<ChorchaAITutorProps> = ({
  isOpen,
  onClose,
  initialQuestion,
  initialTopicPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Google Workspace state
  const [taskSavingId, setTaskSavingId] = useState<string | null>(null);
  const [taskSavedIds, setTaskSavedIds] = useState<{ [msgId: string]: boolean }>({});
  const [keepCopiedId, setKeepCopiedId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [activeWikiConcept, setActiveWikiConcept] = useState<string | null>(null);

  // Model selection state
  const [availableModels, setAvailableModels] = useState<AIModelOption[]>([]);
  const [serverConfig, setServerConfig] = useState<{ hasGeminiKey: boolean; hasOpenRouterKey: boolean }>({
    hasGeminiKey: true,
    hasOpenRouterKey: false,
  });
  const [selectedModelId, setSelectedModelId] = useState<string>(getStoredAIModel() || 'openrouter/free');
  const [apiKeysInput, setApiKeysInput] = useState<string>(getStoredOpenRouterKeys().join('\n'));
  const [customModelName, setCustomModelName] = useState<string>(getStoredCustomModelName());
  const [showModelModal, setShowModelModal] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<{ [msgId: string]: boolean }>({});
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch models on mount
  useEffect(() => {
    let isMounted = true;
    fetchAIModelsApi().then((res) => {
      if (!isMounted) return;
      if (res.models && res.models.length > 0) {
        setAvailableModels(res.models);
      }
      if (res.serverConfig) {
        setServerConfig(res.serverConfig);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch persistent chat history from SQLite when opened
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      fetchChatHistoryApi().then((history) => {
        if (!isMounted) return;
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([DEFAULT_WELCOME_MESSAGE]);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  // If passed an initial question or topic prompt from a card
  useEffect(() => {
    if (initialQuestion && isOpen) {
      const questionPrompt = `এই প্রশ্নটি বিশদভাবে শর্টকাট ট্রিকস সহ সমাধান করুন:\nপ্রশ্ন: ${initialQuestion.question_text}\nঅপশন: ক) ${initialQuestion.options.A}, খ) ${initialQuestion.options.B}, গ) ${initialQuestion.options.C}, ঘ) ${initialQuestion.options.D}\nসঠিক উত্তর: ${initialQuestion.correct_ans}\nট্যাগ: ${initialQuestion.tags.join(', ')}`;
      handleSendMessage(questionPrompt);
    } else if (initialTopicPrompt && isOpen) {
      handleSendMessage(initialTopicPrompt);
    }
  }, [initialQuestion, initialTopicPrompt, isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleAddToGoogleTasks = async (msg: ChatMessage) => {
    setTaskSavingId(msg.id);
    try {
      let token = await getGoogleAccessToken();
      if (!token) {
        const authResult = await signInWithGoogleWorkspace();
        if (authResult) {
          token = authResult.accessToken;
        } else {
          throw new Error('Google Authentication required');
        }
      }

      const firstLine = msg.content.split('\n')[0].replace(/[#*`_✅📝🚀⚠️🎯]/g, '').trim();
      const taskTitle =
        firstLine.length > 0 && firstLine.length < 80
          ? `[PrepTest AI] ${firstLine}`
          : `[PrepTest AI এডমিশন নোট] ${new Date().toLocaleDateString()}`;

      const res = await addTaskToGoogleTasks(token, {
        title: taskTitle,
        notes: msg.content,
      });

      if (res.success) {
        setTaskSavedIds((prev) => ({ ...prev, [msg.id]: true }));
        showToast('✅ Google Tasks এ টাস্ক ও শর্টকাট যুক্ত হয়েছে!');
      } else {
        throw new Error(res.error || 'Failed to create task');
      }
    } catch (err: any) {
      console.error('Google Tasks error:', err);
      showToast(`⚠️ টাস্কে যোগ করা সম্ভব হয়নি: ${err.message || 'Google Auth Error'}`);
    } finally {
      setTaskSavingId(null);
    }
  };

  const handleSaveNoteToKeep = async (msg: ChatMessage) => {
    setKeepCopiedId(msg.id);
    try {
      const firstLine = msg.content.split('\n')[0].replace(/[#*`_✅📝🚀⚠️🎯]/g, '').trim();
      const noteTitle =
        firstLine.length > 0 && firstLine.length < 60 ? firstLine : 'PrepTest AI শর্টকাট ও সমাধান নোট';

      const keepData = createKeepNotePayload(noteTitle, msg.content);

      await navigator.clipboard.writeText(keepData.text);
      showToast('📝 নোটটি কপি হয়েছে এবং Google Keep পেজ ওপেন হচ্ছে...');

      window.open('https://keep.google.com/', '_blank');

      setTimeout(() => {
        setKeepCopiedId(null);
      }, 2500);
    } catch (err: any) {
      console.error('Keep error:', err);
      showToast('⚠️ টেক্সট কপি করা যায়নি।');
      setKeepCopiedId(null);
    }
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => {
        setCopiedMsgId(null);
      }, 2000);
    } catch (err) {}
  };

  if (!isOpen) return null;

  const currentModel =
    availableModels.find((m) => m.id === selectedModelId) || {
      id: selectedModelId,
      name:
        selectedModelId === 'custom'
          ? customModelName || 'Custom OpenRouter Model'
          : selectedModelId === 'openrouter/free'
          ? 'Free Models Router'
          : selectedModelId,
      provider: (selectedModelId.includes('/') || selectedModelId === 'custom'
        ? 'openrouter'
        : 'gemini') as 'gemini' | 'openrouter',
      description: 'স্বয়ংক্রিয় ফ্রি ওপেনরাউটার মডেল',
    };

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId);
    setStoredAIModel(modelId);
  };

  const handleSaveApiKeys = (val: string) => {
    setApiKeysInput(val);
    const keys = val
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
    setStoredOpenRouterKeys(keys);
  };

  const handleSaveCustomModelName = (name: string) => {
    setCustomModelName(name);
    setStoredCustomModelName(name);
  };

  const handleClearHistory = async () => {
    if (window.confirm('আপনি কি পূর্ববর্তী সব চ্যাট হিস্ট্রি মুছে ফেলতে চান?')) {
      await clearChatHistoryApi();
      setMessages([DEFAULT_WELCOME_MESSAGE]);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() && !selectedImage) return;

    const userMessageId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    saveChatMessageApi({
      id: userMessageId,
      role: 'user',
      content: text,
    });

    const isExplicitOpenRouter =
      selectedModelId.includes('/') || selectedModelId === 'custom';
    const provider: 'gemini' | 'openrouter' = isExplicitOpenRouter ? 'openrouter' : 'gemini';

    const currentKeys = getStoredOpenRouterKeys();

    try {
      if (selectedImage) {
        setIsProcessingPhoto(true);
        const photoResult = await solveQuestionFromPhoto(selectedImage, 'image/jpeg', {
          provider,
          model: selectedModelId,
          customApiKeys: currentKeys,
          customModelName,
        });
        setSelectedImage(null);
        setIsProcessingPhoto(false);

        const aiMessageId = `ai_${Date.now()}`;
        const aiMsg: ChatMessage = {
          id: aiMessageId,
          role: 'assistant',
          content: photoResult.solution,
          timestamp: Date.now(),
          modelUsed: photoResult.modelUsed || selectedModelId,
          provider,
        };
        setMessages((prev) => [...prev, aiMsg]);

        saveChatMessageApi({
          id: aiMessageId,
          role: 'assistant',
          content: photoResult.solution,
          modelUsed: photoResult.modelUsed || selectedModelId,
          provider,
        });
      } else {
        const aiMessageId = `ai_${Date.now()}`;
        let streamText = '';
        let streamReasoning = '';

        // Add initial message container for streaming response
        setMessages((prev) => [
          ...prev,
          {
            id: aiMessageId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            modelUsed: selectedModelId,
            provider,
          },
        ]);

        const response = await askGeminiMentorStream(
          text,
          messages,
          useSearchGrounding,
          {
            provider,
            model: selectedModelId,
            customApiKeys: currentKeys,
            customModelName,
          },
          (deltaText, deltaReasoning, fullText, fullReasoning) => {
            streamText = fullText;
            streamReasoning = fullReasoning;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      content: fullText,
                      reasoning: fullReasoning || undefined,
                    }
                  : msg
              )
            );
          }
        );

        const finalContent = response.text || streamText;
        const finalReasoning = response.reasoning || (streamReasoning || undefined);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: finalContent,
                  groundingSources: response.sources,
                  modelUsed: response.modelUsed || selectedModelId,
                  provider: (response.provider as any) || provider,
                  reasoning: finalReasoning,
                }
              : msg
          )
        );

        saveChatMessageApi({
          id: aiMessageId,
          role: 'assistant',
          content: finalContent,
          modelUsed: response.modelUsed || selectedModelId,
          provider: response.provider || provider,
        });
      }
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `দুঃখিত, সংযোগে সমস্যা হয়েছে:\n\n*${err.message || 'অনুগ্রহ করে আবার চেষ্টা করুন।'}*`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      setIsProcessingPhoto(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const quickPrompts = [
    'ঢাবি ক ইউনিটের পদার্থবিজ্ঞান শর্টকাট সূত্রগুলো দাও',
    'ক্যালকুলেটর ছাড়া বড় গুণ ও ভাগ দ্রুত করার টেকনিক',
    'ভেক্টর ডট ও ক্রস গুণনের এডমিশন শর্টকাট ট্রিকস',
    'রসায়নে জারণ সংখ্যা ও মোলারিটি সংক্রান্ত শর্টকাট',
    '২০২৬ শিক্ষাবর্ষের গুচ্ছ ও বুয়েট ভর্তি পরীক্ষার আপডেট',
  ];

  const categories = [
    { id: 'all', label: 'সবগুলো মডেল' },
    { id: 'free', label: 'ফ্রি OpenRouter' },
    { id: 'reasoning', label: 'ম্যাথ ও লজিক (Reasoning)' },
    { id: 'gemini', label: 'গুগল Gemini' },
    { id: 'custom', label: 'কাস্টম মডেল' },
  ];

  const filteredModels = availableModels.filter((m) => {
    if (selectedCategoryTab === 'all') return true;
    if (selectedCategoryTab === 'free') return m.provider === 'openrouter';
    if (selectedCategoryTab === 'reasoning') return m.category === 'reasoning';
    if (selectedCategoryTab === 'gemini') return m.provider === 'gemini';
    if (selectedCategoryTab === 'custom') return m.id === 'custom';
    return true;
  });

  return (
    <div
      id="chorcha-ai-fullscreen-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in"
    >
      <div className="w-full h-full max-w-5xl bg-white flex flex-col shadow-2xl overflow-hidden md:border md:border-slate-200 md:h-[94vh] md:max-h-[920px] md:rounded-2xl relative">
        {/* Modern Clean Header */}
        <header className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight tracking-tight truncate">
                  PrepTest AI মেন্টর
                </h2>
                {/* Clickable Model Selector Pill */}
                <button
                  id="btn-trigger-model-select"
                  onClick={() => setShowModelModal(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                  title="AI মডেল পরিবর্তন করুন"
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate max-w-[130px] sm:max-w-[180px] font-bold">
                    {currentModel.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                ভার্সিটি ভর্তি প্রস্তুতি, নো-ক্যালকুলেটর শর্টকাট ও লাইভ সমাধান
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick Wiki Explorer Button */}
            <button
              id="btn-header-wiki-search"
              type="button"
              onClick={() => setActiveWikiConcept('আদর্শ গ্যাস')}
              aria-label="উইকিপিডিয়া যাচাইকৃত কনসেপ্ট খুঁজুন"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition-colors cursor-pointer"
              title="উইকিপিডিয়া কনসেপ্ট ও সূত্র খুঁজুন"
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">উইকি কনসেপ্ট</span>
            </button>

            {/* Google Calendar Sync Modal Button */}
            <button
              id="btn-header-calendar-sync"
              onClick={() => setShowCalendarModal(true)}
              aria-label="Google Calendar এ ভর্তি পরীক্ষার তারিখ সিঙ্ক করুন"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Google Calendar এ ভর্তি পরীক্ষার তারিখ সিঙ্ক করুন"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Calendar Sync</span>
            </button>

            {/* Clear History Button */}
            <button
              id="btn-header-clear-history"
              onClick={handleClearHistory}
              aria-label="চ্যাট হিস্ট্রি মুছুন"
              className="p-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="চ্যাট হিস্ট্রি মুছুন"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Model & Multi-key Settings Button */}
            <button
              id="btn-header-model-settings"
              onClick={() => setShowModelModal(true)}
              aria-label="মডেল ও API কী কনফিগারেশন"
              className="p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="মডেল ও API কী কনফিগারেশন"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Close / Back Button */}
            <button
              id="btn-header-close-chat"
              onClick={onClose}
              aria-label="চ্যাট উইন্ডো বন্ধ করুন"
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
              title="চ্যাট বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-xl text-xs shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 flex items-center gap-2 font-medium">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Chat Message Scrollable View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isReasoningOpen = !!expandedReasoning[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center text-xs shrink-0 font-bold shadow-2xs ${
                    isUser
                      ? 'bg-blue-600 text-white ring-2 ring-blue-100'
                      : 'bg-white text-blue-600 border border-slate-200 shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5 text-blue-600" />}
                </div>

                {/* Message Bubble Container */}
                <div
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 text-[15px] sm:text-base leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs font-normal'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
                  }`}
                >
                  {/* Model attribution badge */}
                  {!isUser && msg.modelUsed && (
                    <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {msg.provider === 'openrouter' ? (
                        <BrainCircuit className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {msg.modelUsed
                          .replace('deepseek/', '')
                          .replace('meta-llama/', '')
                          .replace('qwen/', '')
                          .replace('mistralai/', '')
                          .replace('google/', '')
                          .replace('nvidia/', '')}
                      </span>
                    </div>
                  )}

                  {/* DeepSeek R1 Reasoning / Chain-of-thought accordion */}
                  {!isUser && msg.reasoning && (
                    <div className="mb-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/40 overflow-hidden text-xs">
                      <button
                        onClick={() =>
                          setExpandedReasoning((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          }))
                        }
                        className="w-full px-3 py-2 flex items-center justify-between text-purple-950 dark:text-purple-200 font-semibold hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                          <span>AI রিজনিং ও চিন্তাভাবনার ধাপ ({isReasoningOpen ? 'লুকান' : 'দেখুন'})</span>
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 transform transition-transform text-purple-700 dark:text-purple-400 ${
                            isReasoningOpen ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      {isReasoningOpen && (
                        <div className="p-3 text-slate-700 dark:text-slate-200 font-mono text-xs leading-relaxed border-t border-purple-200 dark:border-purple-800 whitespace-pre-wrap max-h-56 overflow-y-auto bg-white/80 dark:bg-slate-900/80">
                          {msg.reasoning}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Content rendered with KaTeX MathText */}
                  <div className="prose-sm max-w-none text-inherit">
                    <MathText text={msg.content} />
                  </div>

                  {/* Google Search & Wikipedia Grounding references */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>যাচাইকৃত তথ্য ও রেফারেন্স উৎস:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.groundingSources.map((source, sIdx) => {
                          const isWiki = source.uri.includes('wikipedia.org') || source.title.toLowerCase().includes('উইকিপিডিয়া') || source.title.toLowerCase().includes('wikipedia');
                          const cleanWikiTitle = source.title.replace(/^উইকিপিডিয়া:\s*/i, '');
                          
                          if (isWiki) {
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => setActiveWikiConcept(cleanWikiTitle)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all bg-slate-50 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 shadow-2xs cursor-pointer active:scale-95"
                                title="অ্যাপে উইকিপিডিয়া কনসেপ্ট প্রিভিউ দেখুন"
                              >
                                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="truncate max-w-[220px] font-medium">{source.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-70 text-emerald-600 dark:text-emerald-400" />
                              </button>
                            );
                          }

                          return (
                            <a
                              key={sIdx}
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors bg-slate-100 dark:bg-slate-700/80 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 border-slate-200 dark:border-slate-700"
                            >
                              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="truncate max-w-[220px] font-medium">{source.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Toolbar */}
                  {!isUser && msg.id !== 'welcome' && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Add to Google Tasks button */}
                        <button
                          id={`btn-add-task-${msg.id}`}
                          onClick={() => handleAddToGoogleTasks(msg)}
                          disabled={taskSavingId === msg.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all border cursor-pointer ${
                            taskSavedIds[msg.id]
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200'
                          }`}
                          title="এই শর্টকাট বা স্টাডি গোলটি গুগল টাস্কসে যুক্ত করুন"
                        >
                          {taskSavingId === msg.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          ) : taskSavedIds[msg.id] ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{taskSavedIds[msg.id] ? 'টাস্কে যুক্ত হয়েছে' : 'Add to Google Tasks'}</span>
                        </button>

                        {/* Save Note to Keep button */}
                        <button
                          id={`btn-save-keep-${msg.id}`}
                          onClick={() => handleSaveNoteToKeep(msg)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all border cursor-pointer ${
                            keepCopiedId === msg.id
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border-slate-200'
                          }`}
                          title="নোট ও শর্টকাট Google Keep এ সংরক্ষণ করুন"
                        >
                          {keepCopiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>{keepCopiedId === msg.id ? 'কপি হয়েছে' : 'Save Note to Keep'}</span>
                        </button>
                      </div>

                      {/* Copy Text Button */}
                      <button
                        onClick={() => handleCopyMessage(msg)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors p-1 rounded cursor-pointer"
                        title="সম্পূর্ণ উত্তর কপি করুন"
                      >
                        {copiedMsgId === msg.id ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> কপিড!
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <Copy className="w-3 h-3" /> কপি
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`text-[11px] mt-2 text-right font-mono ${
                      isUser ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 items-start animate-in fade-in duration-200">
              <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-5 h-5 animate-pulse text-blue-600" />
              </div>
              <div className="bg-white border border-blue-200 rounded-2xl rounded-tl-xs p-4 text-[15px] text-slate-800 shadow-sm max-w-[85%] space-y-2.5">
                <div className="flex items-center gap-2.5 text-blue-900">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="font-semibold text-sm">
                    {currentModel.name} সমাধান ও শর্টকাট প্রস্তুত করছে...
                  </span>
                </div>
                <div className="flex items-center gap-2 py-1 px-2.5 bg-blue-50 rounded-lg w-fit border border-blue-100">
                  <span className="text-xs text-blue-900 font-medium">টাইপ করা হচ্ছে</span>
                  <div className="flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-200 overflow-x-auto flex gap-2 no-scrollbar shrink-0">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="text-xs whitespace-nowrap px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors shrink-0 disabled:opacity-50 cursor-pointer font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Attached image preview */}
        {selectedImage && (
          <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <img
                src={selectedImage}
                alt="Selected question"
                className="w-12 h-12 object-cover rounded-lg border border-blue-300 shadow-2xs"
              />
              <span className="text-xs text-blue-950 font-semibold">
                প্রশ্নটির ছবি যুক্ত হয়েছে (সমাধান দেখতে সেন্ড করুন)
              </span>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clean Multiline Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2.5"
          >
            {/* Camera / Photo Upload trigger */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              id="btn-ai-upload-photo"
              onClick={() => fileInputRef.current?.click()}
              aria-label="প্রশ্নের ছবি আপলোড করুন"
              className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="প্রশ্নের ছবি তুলে সমাধান করুন"
            >
              <Camera className="w-5 h-5 text-blue-600" />
            </button>

            {/* Multiline Textarea */}
            <div className="grow relative">
              <textarea
                ref={textareaRef}
                id="input-ai-prompt"
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="যেকোনো ভর্তি প্রশ্ন, নো-ক্যালকুলেটর শর্টকাট বা অধ্যায় সম্পর্কে লিখুন..."
                disabled={isLoading}
                aria-label="AI টিউটরের জন্য প্রশ্ন বা প্রম্পট লিখুন"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-[15px] sm:text-base leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-600 border border-slate-300 transition-all placeholder:text-slate-400 resize-none overflow-y-auto"
                style={{ maxHeight: '140px', minHeight: '44px' }}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              id="btn-ai-send"
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
              aria-label="বার্তা পাঠান"
              className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
              title="বার্তা পাঠান"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Model Selection & Multiple API Key Configuration Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-base">AI মডেল ও API কনফিগারেশন</h4>
                  <p className="text-xs text-slate-400">
                    OpenRouter ফ্রি মডেল ও মাল্টিপল API Key সেটআপ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModelModal(false)}
                aria-label="কনফিগারেশন বন্ধ করুন"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Multiple API Keys input section */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-purple-700" />
                    <span>OpenRouter API Keys (মাল্টিপল কী ব্যাকআপ সাপোর্ট)</span>
                  </label>
                  <span className="text-[10px] bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                    অটো ফেইলওভার
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={apiKeysInput}
                  onChange={(e) => handleSaveApiKeys(e.target.value)}
                  placeholder="sk-or-v1-...\nsk-or-v1-..."
                  className="w-full text-xs px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-600 font-mono resize-y"
                />
                <p className="text-[11px] text-purple-900/80 mt-1.5 leading-relaxed">
                  💡 একাধিক OpenRouter কী প্রতি লাইনে বা কমা (,) দিয়ে দিন। কোনো একটি কী রেট লিমিট বা কোটা শেষ হলে সিস্টেম স্বয়ংক্রিয়ভাবে পরবর্তী কী-তে সুইচ করবে।
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryTab(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategoryTab === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Models List */}
              <div className="space-y-2">
                {filteredModels.map((m) => {
                  const isSelected = selectedModelId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectModel(m.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600/30 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{m.name}</span>
                          {m.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                              {m.badge}
                            </span>
                          )}
                          {m.provider === 'openrouter' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-100 text-purple-800 font-semibold">
                              Free
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{m.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Custom Model Input */}
              {selectedModelId === 'custom' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 animate-in fade-in">
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    কাস্টম OpenRouter মডেল স্ট্রিং ID
                  </label>
                  <input
                    type="text"
                    value={customModelName}
                    onChange={(e) => handleSaveCustomModelName(e.target.value)}
                    placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowModelModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                সংরক্ষণ ও বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Sync Modal */}
      {showCalendarModal && (
        <GoogleCalendarSyncModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

      {/* Interactive Wikipedia Concept Preview Modal */}
      {activeWikiConcept && (
        <WikiConceptModal
          isOpen={Boolean(activeWikiConcept)}
          onClose={() => setActiveWikiConcept(null)}
          conceptQuery={activeWikiConcept}
          onAskAIWithConcept={(conceptTitle) => {
            setInputText(`"${conceptTitle}" সম্পর্কিত মূল সূত্র, শর্ত এবং বিগত বছরের ভর্তি পরীক্ষার শর্টকাট কৌশলগুলো বুঝিয়ে দাও।`);
          }}
        />
      )}
    </div>
  );
};

export default ChorchaAITutor;
