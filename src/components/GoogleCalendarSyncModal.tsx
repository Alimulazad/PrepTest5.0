import React, { useState, useEffect } from 'react';
import {
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarCheck,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  LogOut,
} from 'lucide-react';
import {
  ADMISSION_CALENDAR_SCHEDULES,
  signInWithGoogleWorkspace,
  syncAdmissionDatesToCalendar,
  getGoogleAccessToken,
  signOutGoogle,
  initGoogleAuth,
  SyncAdmissionEventResult,
} from '../services/googleWorkspace';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    ADMISSION_CALENDAR_SCHEDULES.map((s) => s.id)
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResults, setSyncResults] = useState<SyncAdmissionEventResult[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (fbUser, accessToken) => {
        setUser(fbUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const authResult = await signInWithGoogleWorkspace();
      if (authResult) {
        setUser(authResult.user);
        setToken(authResult.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Google সাইন ইন সম্পন্ন করা সম্ভব হয়নি');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogout = async () => {
    await signOutGoogle();
    setUser(null);
    setToken(null);
    setSyncResults(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleInitiateSync = () => {
    if (!token) {
      handleGoogleLogin();
      return;
    }
    if (selectedIds.length === 0) {
      setErrorMessage('অনুগ্রহ করে অন্তত একটি বিশ্ববিদ্যালয়ের শিডিউল সিলেক্ট করুন।');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleExecuteSync = async () => {
    if (!token) return;
    setShowConfirmDialog(false);
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const results = await syncAdmissionDatesToCalendar(token, selectedIds);
      setSyncResults(results);
    } catch (err: any) {
      console.error('Calendar sync error:', err);
      setErrorMessage(err.message || 'ক্যালেন্ডার সিঙ্ক করার সময় ত্রুটি হয়েছে');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1E3A8A] via-[#1E40AF] to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-200 border border-white/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>Google Calendar এডমিশন সিঙ্ক</span>
                <span className="text-[10px] bg-emerald-400 text-emerald-950 font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Official API
                </span>
              </h3>
              <p className="text-xs text-blue-100">
                ঢাবি, বুয়েট ও মেডিকেল ভর্তি পরীক্ষার তারিখ সরাসরি আপনার পার্সোনাল ক্যালেন্ডারে যোগ করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800">
          {/* Google Account Connection Status */}
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                    alt="Google Avatar"
                    className="w-10 h-10 rounded-full border-2 border-white shadow-2xs"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{user.displayName || 'Google User'}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
                    G
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Google অ্যাকাউন্ট কানেক্ট নেই</div>
                    <div className="text-[11px] text-slate-500">
                      ক্যালেন্ডারে শিডিউল ও ডেডলাইন রিমাইন্ডার পেতে সাইন ইন করুন
                    </div>
                  </div>
                </div>
              )}
            </div>

            {user ? (
              <button
                onClick={handleGoogleLogout}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ডিসকানেক্ট</span>
              </button>
            ) : (
              <button
                id="btn-google-calendar-signin"
                onClick={handleGoogleLogin}
                disabled={isAuthenticating}
                className="gsi-material-button text-xs py-2 px-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                )}
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sync Success Banner */}
          {syncResults && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CalendarCheck className="w-5 h-5 text-emerald-600" />
                <span>সফলভাবে Google Calendar এ সিঙ্ক সম্পন্ন হয়েছে!</span>
              </div>
              <p className="text-xs text-emerald-800">
                পরীক্ষার দিন সকাল এবং আবেদনের ডেডলাইনের ৩ দিন ও ১ দিন আগে গুগল স্বয়ংক্রিয় পপআপ রিমাইন্ডার পাঠাবে।
              </p>
              <div className="pt-2 flex items-center justify-between">
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A8A] hover:underline"
                >
                  <span>গুগল ক্যালেন্ডার ওপেন করে দেখুন</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setSyncResults(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  আবার নির্বাচন করুন
                </button>
              </div>
            </div>
          )}

          {/* University Schedule Selection List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ভর্তি পরীক্ষা ও আবেদনের সময়সূচী ({selectedIds.length}/{ADMISSION_CALENDAR_SCHEDULES.length})
              </h4>
              <button
                onClick={() =>
                  setSelectedIds(
                    selectedIds.length === ADMISSION_CALENDAR_SCHEDULES.length
                      ? []
                      : ADMISSION_CALENDAR_SCHEDULES.map((s) => s.id)
                  )
                }
                className="text-xs text-[#2563EB] font-bold hover:underline cursor-pointer"
              >
                {selectedIds.length === ADMISSION_CALENDAR_SCHEDULES.length
                  ? 'সব আনচেক করুন'
                  : 'সবগুলো সিলেক্ট করুন'}
              </button>
            </div>

            <div className="space-y-2.5">
              {ADMISSION_CALENDAR_SCHEDULES.map((schedule) => {
                const isSelected = selectedIds.includes(schedule.id);
                const syncStatus = syncResults?.find((r) => r.universityId === schedule.id);

                return (
                  <div
                    key={schedule.id}
                    onClick={() => toggleSelect(schedule.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                        : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div
                        className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="grow">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <h5 className="font-bold text-sm text-slate-900">{schedule.name}</h5>
                          {syncStatus?.success && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              সিঙ্কড
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>
                              পরীক্ষা: <strong>{schedule.examDate}</strong> ({schedule.examTimeStart.slice(0, 5)} AM)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-amber-900">
                            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              আবেদনের শেষ: <strong>{schedule.applicationDeadline}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{schedule.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Google Calendar API সিকিউর অথেনটিকেশন</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              id="btn-confirm-calendar-sync"
              onClick={handleInitiateSync}
              disabled={isSyncing || selectedIds.length === 0}
              className="px-5 py-2.5 text-xs font-bold bg-[#1E3A8A] hover:bg-[#2563EB] text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ক্যালেন্ডারে যোগ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" />
                  <span>
                    {user ? `Sync Admission Dates (${selectedIds.length})` : 'Google Login & Sync'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog (Mandated for Google Workspace API mutations) */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-[#1E3A8A]">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">গুগল ক্যালেন্ডার ইভেন্ট অনুমতি</h4>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              আপনার গুগল ক্যালেন্ডারে নির্বাচিত <strong>{selectedIds.length}টি ভর্তি পরীক্ষা</strong> ও আবেদনের শেষ তারিখের শিডিউল এবং স্বয়ংক্রিয় অ্যালার্ম রিমাইন্ডার যোগ করা হবে। আপনি কি নিশ্চিত?
            </p>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
              <div>• ঢাকা বিশ্ববিদ্যালয় (DU), বুয়েট (BUET), মেডিকেল (MBBS) ইত্যাদি</div>
              <div>• পরীক্ষার দিন সকাল ১০:০০ এবং ডেডলাইনের ৩ দিন পূর্বে নোটিফিকেশন</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                বাতিল (Cancel)
              </button>
              <button
                id="btn-dialog-confirm-sync"
                onClick={handleExecuteSync}
                className="px-5 py-2.5 text-xs font-bold bg-[#1E3A8A] hover:bg-[#2563EB] text-white rounded-xl shadow-xs cursor-pointer"
              >
                হ্যাঁ, ক্যালেন্ডারে যোগ করুন (Confirm)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarSyncModal;
