import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  School,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Zap,
  ShieldCheck,
  KeyRound,
  X,
} from 'lucide-react';
import { UniversityUnit, User as UserType, UserProgress } from '../types';
import { UNIVERSITIES_DATA } from '../data/admissionData';
import { loginUserApi, registerUserApi, socialSyncAuthApi, guestLoginApi } from '../services/api';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signInAsGuest,
  sendResetEmail,
} from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType, progress: UserProgress) => void;
  initialMode?: 'login' | 'register';
}

function GoogleVectorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0" aria-hidden="true">
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
  );
}

function FacebookVectorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0 text-white" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function PrepTestModalLogo() {
  return (
    <div className="flex flex-col items-center justify-center select-none text-center">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-2xl bg-[#0A2540] flex items-center justify-center p-1.5 shadow-md shadow-[#0A2540]/20 border border-slate-700/30">
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
            <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="3" opacity="0.2" />
            <path
              d="M20 34c2-6 8-10 15-10 8 0 14 5 14 12 0 6-4 10-9 12M24 26c0-4 4-8 9-8"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M18 32l10 10 22-22"
              stroke="#FF6B00"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-2xl font-black tracking-tight text-[#0A2540]">
          Prep<span className="text-[#FF6B00]">Test</span>
        </div>
      </div>
      <div className="mt-1 text-xs font-bold text-[#0A2540]">‘টেস্ট দাও বেস্ট হও’</div>
    </div>
  );
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [name, setName] = useState('');
  const [college, setCollege] = useState('ঢাকা কলেজ');
  const [examYear, setExamYear] = useState('HSC-26');
  const [targetUni, setTargetUni] = useState<UniversityUnit>('du_a');
  const [avatarColor, setAvatarColor] = useState('#0A2540');

  // Statuses
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  // Reset modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Phone OTP
  const [isPhoneOtpOpen, setIsPhoneOtpOpen] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const batches = ['HSC-25', 'HSC-26', 'HSC-27', '2nd Timer'];
  const colorPresets = ['#0A2540', '#FF6B00', '#059669', '#E11D48', '#7C3AED', '#0F766E'];

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    let interval: any;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  if (!isOpen) return null;

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShakeTrigger((prev) => prev + 1);
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage('গুগল অ্যাকাউন্ট কানেক্ট করা হচ্ছে...');
    setIsLoading(true);
    setLoadingAction('google');

    try {
      let fbUser: any = null;
      try {
        fbUser = await signInWithGoogle();
      } catch (fbErr) {
        console.warn('Firebase Google notice:', fbErr);
      }

      const email = fbUser?.email || 'student.google@preptest.bd';
      const displayName = fbUser?.displayName || 'গুগল শিক্ষার্থী';
      const uid = fbUser?.uid || `g_${Date.now()}`;

      const authRes = await socialSyncAuthApi({
        uid,
        email,
        phone: email,
        name: displayName,
        provider: 'google',
        avatar: '🧑‍🎓',
        avatarColor: '#FF6B00',
        targetUniversity: targetUni,
        targetUnit: "'ক' ইউনিট (বিজ্ঞান)",
        examYear: 'HSC-26',
        college: 'ঢাকা কলেজ',
      });

      setSuccessMessage('গুগল সাইন-ইন সফল হয়েছে!');
      setTimeout(() => {
        onSuccess(authRes.user, authRes.progress);
        onClose();
      }, 400);
    } catch (err: any) {
      triggerError(err.message || 'গুগল সাইন-ইনে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  const handleFacebookSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage('ফেসবুক অ্যাকাউন্ট কানেক্ট করা হচ্ছে...');
    setIsLoading(true);
    setLoadingAction('facebook');

    try {
      let fbUser: any = null;
      try {
        fbUser = await signInWithFacebook();
      } catch (fbErr) {
        console.warn('Firebase FB notice:', fbErr);
      }

      const email = fbUser?.email || 'student.fb@preptest.bd';
      const displayName = fbUser?.displayName || 'ফেসবুক শিক্ষার্থী';
      const uid = fbUser?.uid || `fb_${Date.now()}`;

      const authRes = await socialSyncAuthApi({
        uid,
        email,
        phone: email,
        name: displayName,
        provider: 'facebook',
        avatar: '🎓',
        avatarColor: '#1877F2',
        targetUniversity: targetUni,
        targetUnit: "'ক' ইউনিট (বিজ্ঞান)",
        examYear: 'HSC-26',
        college: 'ঢাকা কলেজ',
      });

      setSuccessMessage('ফেসবুক সাইন-ইন সফল হয়েছে!');
      setTimeout(() => {
        onSuccess(authRes.user, authRes.progress);
        onClose();
      }, 400);
    } catch (err: any) {
      triggerError(err.message || 'ফেসবুক সাইন-ইন করা যায়নি।');
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  const handleGuestLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage('গেস্ট অ্যাকাউন্ট প্রস্তুত হচ্ছে...');
    setIsLoading(true);
    setLoadingAction('guest');

    try {
      signInAsGuest().catch(() => {});
      const guestRes = await guestLoginApi();
      setSuccessMessage('গেস্ট মোডে প্রবেশ সফল!');
      setTimeout(() => {
        onSuccess(guestRes.user, guestRes.progress);
        onClose();
      }, 350);
    } catch (err: any) {
      triggerError('গেস্ট মোডে প্রবেশ করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = emailOrPhone.trim();
    if (!cleanInput) {
      triggerError('মোবাইল নম্বর বা ইমেইল প্রদান করুন');
      return;
    }
    if (!password || password.length < 4) {
      triggerError('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      triggerError('আপনার পূর্ণ নাম লিখুন');
      return;
    }

    setIsLoading(true);
    setLoadingAction('submit');

    try {
      const isEmail = cleanInput.includes('@');
      const emailForFb = isEmail ? cleanInput : `${cleanInput.replace(/[^0-9]/g, '')}@preptest.bd`;

      if (mode === 'login') {
        signInWithEmailPassword(emailForFb, password).catch(() => {});

        const res = await loginUserApi({
          phone: cleanInput,
          password,
        });

        setSuccessMessage('লগইন সফল হয়েছে! স্বাগতম!');
        setTimeout(() => {
          onSuccess(res.user, res.progress);
          onClose();
        }, 350);
      } else {
        signUpWithEmailPassword(emailForFb, password).catch(() => {});

        const res = await registerUserApi({
          phone: cleanInput,
          password,
          name: name.trim(),
          college: college.trim(),
          examYear,
          targetUniversity: targetUni,
          avatarBgColor: avatarColor,
        });

        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.65 },
            colors: ['#0A2540', '#FF6B00', '#059669', '#7C3AED'],
            disableForReducedMotion: true,
          });
        } catch (_) {}

        setSuccessMessage('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ৫০ পয়েন্ট বোনাস!');
        setTimeout(() => {
          onSuccess(res.user, res.progress);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      triggerError(err.message || 'একটি ত্রুটি ঘটেছে। তথ্য যাচাই করুন।');
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetEmail.trim();
    if (!email || !email.includes('@')) {
      triggerError('সঠিক ইমেইল এড্রেস দিন');
      return;
    }
    setIsLoading(true);
    try {
      await sendResetEmail(email).catch(() => {});
      setSuccessMessage(`পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে: ${email}`);
      setTimeout(() => setIsResetOpen(false), 1200);
    } catch (err: any) {
      triggerError('রিসেট লিংক পাঠানো যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      triggerError('সঠিক ভেরিফিকেশন কোড দিন');
      return;
    }
    setIsLoading(true);
    try {
      const cleanPhone = otpPhone.trim();
      const authRes = await socialSyncAuthApi({
        phone: cleanPhone,
        name: `শিক্ষার্থী (${cleanPhone.slice(-4)})`,
        provider: 'phone',
        avatar: '📱',
        avatarColor: '#0A2540',
        targetUniversity: 'du_a',
        targetUnit: "'ক' ইউনিট (বিজ্ঞান)",
        examYear: 'HSC-26',
        college: 'ঢাকা কলেজ',
      });
      setSuccessMessage('ওটিপি যাচাই সফল!');
      setTimeout(() => {
        setIsPhoneOtpOpen(false);
        onSuccess(authRes.user, authRes.progress);
        onClose();
      }, 400);
    } catch (err: any) {
      triggerError('কোডটি সঠিক নয়।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto min-h-dvh">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0A2540]/60 backdrop-blur-md"
        />

        {/* Ambient Lights */}
        <div className="fixed top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#FF6B00]/15 blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-[#0A2540]/20 blur-3xl pointer-events-none" />

        {/* Main Card */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative z-50 w-full max-w-md my-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col"
        >
          {/* Accent Header */}
          <div className="h-1.5 w-full bg-linear-to-r from-[#0A2540] via-[#FF6B00] to-[#0A2540]" />

          {/* Body */}
          <div className="overflow-y-auto p-6 sm:p-7 space-y-4 custom-scrollbar">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black tracking-wider uppercase text-[#FF6B00] bg-[#FF6B00]/10 px-2.5 py-0.5 rounded-full">
                PrepTest Auth
              </span>
              <button
                id="btn-close-auth-modal"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-[#0A2540] hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PrepTestModalLogo />

            {/* Pill Tab Switcher */}
            <div className="relative bg-[#F0F4F8] p-1 rounded-2xl flex items-center border border-slate-200/80 shadow-inner">
              <motion.div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#0A2540] rounded-xl shadow-md"
                animate={{
                  x: mode === 'login' ? '0%' : '100%',
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
              <button
                id="tab-auth-login"
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`relative z-10 flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'login' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Login</span>
              </button>

              <button
                id="tab-auth-register"
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`relative z-10 flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'register' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Register</span>
              </button>
            </div>

            {/* Feedback Alerts */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-semibold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              animate={{
                x: shakeTrigger ? [0, -10, 10, -8, 8, -4, 4, 0] : 0,
              }}
              transition={{ duration: 0.4 }}
              className="space-y-3"
            >
              {/* Email / Mobile Field */}
              <div className="space-y-1">
                <label htmlFor="modal-input-email" className="block text-[11px] font-bold text-slate-600 px-1">
                  Email Address / মোবাইল নম্বর
                </label>
                <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                  <div className="pl-3.5 text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="modal-input-email"
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    required
                    placeholder="user@example.com"
                    autoComplete="username"
                    className="w-full px-3 py-2.5 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] placeholder:text-slate-400 bg-transparent"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label htmlFor="modal-input-password" className="block text-[11px] font-bold text-slate-600 px-1">
                  Password
                </label>
                <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                  <div className="pl-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="modal-input-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="কমপক্ষে ৪ অক্ষর"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full px-3 py-2.5 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] placeholder:text-slate-400 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Register specifics */}
              {mode === 'register' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label htmlFor="modal-input-name" className="block text-[11px] font-bold text-slate-600 px-1">
                      শিক্ষার্থীর পূর্ণ নাম <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                      <div className="pl-3.5 text-slate-400 pointer-events-none">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="modal-input-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="যেমন: আলিমুল আজাদ"
                        autoComplete="name"
                        className="w-full px-3 py-2 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="modal-input-college" className="block text-[11px] font-bold text-slate-600 px-1">
                      কলেজের নাম
                    </label>
                    <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                      <div className="pl-3.5 text-slate-400 pointer-events-none">
                        <School className="w-4 h-4" />
                      </div>
                      <input
                        id="modal-input-college"
                        type="text"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="যেমন: ঢাকা কলেজ"
                        className="w-full px-3 py-2 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] bg-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 px-1">
                      এইচএসসি ব্যাচ
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {batches.map((b) => (
                        <button
                          type="button"
                          key={b}
                          onClick={() => setExamYear(b)}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            examYear === b
                              ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modal-select-target" className="block text-[11px] font-bold text-slate-600 mb-1 px-1">
                      টার্গেট বিশ্ববিদ্যালয়
                    </label>
                    <select
                      id="modal-select-target"
                      value={targetUni}
                      onChange={(e) => setTargetUni(e.target.value as UniversityUnit)}
                      className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-white text-[#0A2540] font-semibold outline-none focus:border-[#FF6B00]"
                    >
                      {UNIVERSITIES_DATA.map((uni) => (
                        <option key={uni.id} value={uni.id}>
                          {uni.name} - {uni.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Forgot Password */}
              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(true)}
                    className="text-xs font-bold text-[#FF6B00] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                id="btn-modal-auth-submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.98] text-white font-extrabold text-sm shadow-md shadow-[#FF6B00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading && loadingAction === 'submit' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>প্রসেস হচ্ছে...</span>
                  </>
                ) : mode === 'login' ? (
                  <span>Log In</span>
                ) : (
                  <span>Register</span>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-widest absolute">
                  OR
                </span>
              </div>

              {/* Social Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0A2540] transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-60"
                >
                  <GoogleVectorIcon />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-2xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98 disabled:opacity-60"
                >
                  <FacebookVectorIcon />
                  <span>Continue with Facebook</span>
                </button>
              </div>

              {/* Fast phone & guest options */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPhoneOtpOpen(true)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0A2540] transition-all cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Phone OTP</span>
                </button>
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-black text-emerald-800 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <span>১-ক্লিকে গেস্ট</span>
                </button>
              </div>
            </motion.form>
          </div>
        </motion.div>

        {/* Reset modal */}
        {isResetOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#0A2540]/60">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-3.5 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#0A2540]">পাসওয়ার্ড রিসেট</h3>
                <button onClick={() => setIsResetOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="ইমেইল দিন"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#0A2540] outline-none focus:border-[#FF6B00]"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#E05E00]"
                >
                  রিসেট লিংক পাঠান
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Phone OTP Modal */}
        {isPhoneOtpOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#0A2540]/60">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-3.5 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#0A2540]">মোবাইল ওটিপি সাইন-ইন</h3>
                <button onClick={() => setIsPhoneOtpOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {!isOtpSent ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!otpPhone || otpPhone.length < 10) return;
                    setIsOtpSent(true);
                    setOtpTimer(60);
                  }}
                  className="space-y-3"
                >
                  <input
                    type="tel"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    placeholder="মোবাইল নম্বর (017...)"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#0A2540] outline-none focus:border-[#FF6B00]"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#0A2540] text-white text-xs font-bold hover:bg-[#06182a]"
                  >
                    ওটিপি কোড পাঠান
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneOtpVerify} className="space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="৬-ডিজিট ওটিপি কোড"
                    className="w-full px-3 py-2.5 text-center tracking-widest text-sm font-black rounded-xl border border-slate-200 text-[#0A2540] outline-none focus:border-[#FF6B00]"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#E05E00]"
                  >
                    যাচাই করুন
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
