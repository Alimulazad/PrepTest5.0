import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Radio,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  Clock,
  Sparkles,
  Link,
  Users,
  Flame,
} from 'lucide-react';
import {
  sendAdminBroadcastNotification,
  subscribeAdminNotifications,
  deleteAdminNotification,
  AdminBroadcastNotification,
} from '../../services/firebase';
import { useToast } from '../../context/ToastContext';

export const AdminNotificationsTab: React.FC = () => {
  const toast = useToast();
  const [notifications, setNotifications] = useState<AdminBroadcastNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'urgent'>('info');
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [actionLink, setActionLink] = useState('');
  const [actionText, setActionText] = useState('');

  // Quick Preset Templates
  const templates = [
    {
      title: '🚨 বুয়েট স্পেশাল লাইভ মক টেস্ট শুরু হয়েছে!',
      message: 'আজ রাত ৯টায় পদার্থবিজ্ঞান ও উচ্চতর গণিতের উপর ৫০ নম্বরের স্পেশাল লাইভ মক টেস্ট। এখনই অংশগ্রহণ করো!',
      type: 'urgent' as const,
      actionLink: '/exam',
      actionText: 'মক টেস্টে যাও',
    },
    {
      title: '✨ প্রশ্নব্যাংকে নতুন DU ২০২৪ সেশনের প্রশ্ন যুক্ত হয়েছে',
      message: 'পদার্থবিজ্ঞান ও রসায়নের অধ্যায়ভিত্তিক ব্যাখ্যাসহ নতুন ১০০+ প্রশ্ন আপডেট করা হয়েছে।',
      type: 'info' as const,
      actionLink: '/questions',
      actionText: 'প্রশ্নব্যাংক দেখো',
    },
    {
      title: '⚔️ ১v১ লাইভ ব্যাটেল অ্যারিনা উন্মুক্ত!',
      message: 'অন্যান্য শিক্ষার্থীদের সাথে সরাসরি লাইভ কুইজ যুদ্ধে অংশ নিয়ে লিডারবোর্ডের শীর্ষে ওঠো!',
      type: 'success' as const,
      actionLink: '/exam',
      actionText: 'ব্যাটেল শুরু করো',
    },
  ];

  // Subscribe to Realtime Database notifications stream
  useEffect(() => {
    const unsubscribe = subscribeAdminNotifications((list) => {
      setNotifications(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('শিরোনাম ও বার্তার বিবরণ প্রদান করুন');
      return;
    }

    setIsSending(true);
    try {
      await sendAdminBroadcastNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        targetAudience,
        actionLink: actionLink.trim() || '',
        actionText: actionText.trim() || '',
        sentBy: 'PrepTest Admin Hub',
      });

      toast.success('📢 সকল সক্রিয় শিক্ষার্থীর কাছে নোটিফিকেশন সম্প্রচারিত হয়েছে!');
      setTitle('');
      setMessage('');
      setActionLink('');
      setActionText('');
    } catch (err: any) {
      toast.error(err.message || 'নোটিফিকেশন সম্প্রচার করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('এই নোটিফিকেশনটি মুছে ফেলতে চান?')) return;
    try {
      await deleteAdminNotification(id);
      toast.success('নোটিফিকেশন মুছে ফেলা হয়েছে');
    } catch (err) {
      toast.error('মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const applyTemplate = (t: typeof templates[0]) => {
    setTitle(t.title);
    setMessage(t.message);
    setType(t.type);
    setActionLink(t.actionLink);
    setActionText(t.actionText);
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
    return new Date(ts).toLocaleDateString('bn-BD');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Firebase Realtime নোটিফিকেশন ব্রডকাস্টার
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              এখান থেকে নোটিফিকেশন পাঠালে সকল সক্রিয় শিক্ষার্থী অ্যাপের স্ক্রিনে রিয়েল-টাইমে লাইভ অ্যালার্ট পাবে।
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Firebase RTDB Live Sync</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Notification Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                নতুন নোটিফিকেশন তৈরি করুন
              </h3>
              <span className="text-[11px] text-slate-500">তাত্ক্ষণিক সম্প্রচার</span>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                দ্রুত টেমপ্লেট নির্বাচন:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 text-left transition-all text-xs group cursor-pointer"
                  >
                    <div className="font-semibold text-slate-300 group-hover:text-indigo-300 truncate">
                      {tpl.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {tpl.message}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              {/* Type & Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  নোটিফিকেশনের ধরন ও গুরুত্ব
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['info', 'success', 'warning', 'urgent'] as const).map((t) => {
                    const active = type === t;
                    const labels = {
                      info: 'তথ্য (Info)',
                      success: 'সাফল্য (Success)',
                      warning: 'সতর্কতা (Warn)',
                      urgent: 'জরুরি (Urgent)',
                    };
                    const colors = {
                      info: active ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-blue-400 border-slate-800',
                      success: active ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-emerald-400 border-slate-800',
                      warning: active ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-950 text-amber-400 border-slate-800',
                      urgent: active ? 'bg-rose-600 text-white border-rose-500 animate-pulse' : 'bg-slate-950 text-rose-400 border-slate-800',
                    };

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${colors[t]}`}
                      >
                        {labels[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  নোটিফিকেশন শিরোনাম *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: আজকের স্পেশাল মক টেস্ট শুরু হয়েছে!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  বিস্তারিত বার্তা *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="শিক্ষার্থীদের জন্য বিস্তারিত বিবরণ লিখুন..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Target Audience & Action Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    টার্গেট অডিয়েন্স
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">সকল শিক্ষার্থী (All Users)</option>
                    <option value="science">বিজ্ঞান বিভাগ (Science)</option>
                    <option value="hsc26">HSC-26 ব্যাচ</option>
                    <option value="hsc25">HSC-25 ব্যাচ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    অ্যাকশন বাটন লেখা (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    placeholder="যেমন: এখনই শুরু করো"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  অ্যাকশন লিঙ্ক / রাউট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={actionLink}
                  onChange={(e) => setActionLink(e.target.value)}
                  placeholder="যেমন: /exam বা /questions বা https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Radio className="w-4 h-4 animate-spin" />
                    সম্প্রচার করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    রিয়েল-টাইমে সম্প্রচার করুন (Broadcast Now)
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live History & Broadcast Logs */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                সক্রিয় ও সাম্প্রতিক ব্রডকাস্টসমূহ ({notifications.length})
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Feed
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                নোটিফিকেশন লোড হচ্ছে...
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Bell className="w-8 h-8 text-slate-700 mx-auto" />
                <p>এখনো কোনো ব্রডকাস্ট পাঠানো হয়নি।</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {notifications.map((n) => {
                  const typeBadge = {
                    info: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Info },
                    success: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
                    warning: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: AlertTriangle },
                    urgent: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertTriangle },
                  }[n.type] || { bg: 'bg-slate-800 text-slate-400 border-slate-700', icon: Info };

                  const IconComp = typeBadge.icon;

                  return (
                    <div
                      key={n.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${typeBadge.bg}`}>
                            <IconComp className="w-3 h-3" />
                            {n.type.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(n.createdAt)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDelete(n.id)}
                          title="মুছে ফেলুন"
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {n.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {n.message}
                      </p>

                      {n.actionLink && (
                        <div className="pt-2 flex items-center gap-2">
                          <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            {n.actionText || 'লিঙ্ক'}: <span className="font-mono text-slate-300">{n.actionLink}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
