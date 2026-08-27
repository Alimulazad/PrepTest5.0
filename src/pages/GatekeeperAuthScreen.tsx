import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  School,
  Sparkles,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Zap,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
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
  initPhoneRecaptcha,
  sendPhoneOtp,
  ConfirmationResult,
  RecaptchaVerifier,
} from '../services/firebase';

interface GatekeeperAuthScreenProps {
  onSuccess: (user: UserType, progress: UserProgress) => void;
}

/**
 * Translates Firebase Auth error codes into clear, helpful Bengali messages
 */
function getFirebaseErrorMessage(err: any): string {
  if (!err) return 'প্রক্রিয়াকরণে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
  const code = err.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'সাইন-ইন পপ-আপ উইন্ডো বন্ধ করা হয়েছে। আবার চেষ্টা করুন।';
    case 'auth/popup-blocked':
      return 'ব্রাউজারে পপ-আপ ব্লক করা রয়েছে। অনুগ্রহ করে ব্রাউজারের পপ-আপ অনুমোদন করুন।';
    case 'auth/cancelled-popup-request':
      return 'পূর্ববর্তী সাইন-ইন প্রক্রিয়া বাতিল হয়েছে।';
    case 'auth/user-not-found':
      return 'এই একাউন্টে কোনো ব্যবহারকারী খুঁজে পাওয়া যায়নি। অনুগ্রহ করে রেজিস্টার করুন।';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'মোবাইল নম্বর/ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।';
    case 'auth/email-already-in-use':
      return 'এই ইমেইলটি দিয়ে ইতিমধ্যে একটি একাউন্ট খোলা রয়েছে। অনুগ্রহ করে লগইন করুন।';
    case 'auth/invalid-phone-number':
      return 'মোবাইল নম্বরটি সঠিক নয়। অনুগ্রহ করে সঠিক বাংলাদেশী নম্বর (যেমন: 017xxxxxxxx) লিখুন।';
    case 'auth/missing-phone-number':
      return 'মোবাইল নম্বর প্রদান করুন।';
    case 'auth/quota-exceeded':
      return 'আজকের মতো এসএমএস ওটিপি পাঠানোর সীমা অতিক্রম হয়েছে। অনুগ্রহ করে ইমেইল/পাসওয়ার্ড দিয়ে প্রবেশ করুন।';
    case 'auth/too-many-requests':
      return 'অতিরিক্ত অনুরোধের কারণে সাময়িকভাবে সেবা স্থগিত রয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
    case 'auth/invalid-verification-code':
      return 'ভেরিফিকেশন কোডটি সঠিক নয়। অনুগ্রহ করে মোবাইলে আসা ৬-ডিজিট কোডটি যাচাই করুন।';
    case 'auth/code-expired':
      return 'ওটিপি কোডের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার নতুন ওটিপি পাঠান।';
    case 'auth/weak-password':
      return 'পাসওয়ার্ড দুর্বল। কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।';
    case 'auth/unauthorized-domain':
      return 'Firebase Console এ এই ডোমেইনটি Authorized Domains তালিকায় যুক্ত করা নেই।';
    case 'auth/operation-not-allowed':
      return 'Firebase Console এ এই সাইন-ইন মাধ্যমটি (Google/Facebook/Phone) সক্রিয় (Enable) করা নেই।';
    case 'auth/account-exists-with-different-credential':
      return 'এই ইমেইলটি অন্য একটি সাইন-ইন প্রোভাইডারের সাথে ইতিমধ্যে যুক্ত আছে।';
    default:
      return err.message || 'একটি অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  }
}

// Google Official 4-color Vector Icon
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

// Facebook Official Vector Icon
function FacebookVectorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0 text-white" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// PrepTest Brand Logo Component with Brain & Checkmark
function PrepTestHeroLogo() {
  return (
    <div className="flex flex-col items-center justify-center select-none text-center">
      {/* Emblem Icon */}
      <div className="relative mb-2">
        <div className="w-14 h-14 rounded-2xl bg-[#0A2540] flex items-center justify-center p-2.5 shadow-xl shadow-[#0A2540]/25 border border-slate-700/30">
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
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B00] rounded-full border-2 border-white animate-pulse" />
      </div>

      {/* Main Title */}
      <div className="text-3xl sm:text-4xl font-black tracking-tight text-[#0A2540]">
        Prep<span className="text-[#FF6B00]">Test</span>
      </div>

      {/* Tagline */}
      <div className="mt-1 text-sm sm:text-base font-bold text-[#0A2540] tracking-wide">
        ‘টেস্ট দাও বেস্ট হও’
      </div>
    </div>
  );
}

export const GatekeeperAuthScreen: React.FC<GatekeeperAuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Fields
  const [name, setName] = useState('');
  const [college, setCollege] = useState('ঢাকা কলেজ');
  const [examYear, setExamYear] = useState('HSC-26');
  const [targetUni, setTargetUni] = useState<UniversityUnit>('du_a');
  const [avatarColor, setAvatarColor] = useState('#0A2540');

  // Interactive States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  // Phone OTP Modal States & Firebase Recaptcha
  const [isPhoneOtpModalOpen, setIsPhoneOtpModalOpen] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Forgot Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const batches = ['HSC-25', 'HSC-26', 'HSC-27', '2nd Timer'];
  const colorPresets = ['#0A2540', '#FF6B00', '#059669', '#E11D48', '#7C3AED', '#0F766E'];

  // Timer countdown for OTP
  useEffect(() => {
    let interval: any;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShakeTrigger((prev) => prev + 1);
  };

  // Google Sign-In Handler with Authentic Firebase Auth
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage('গুগল অ্যাকাউন্ট কানেক্ট করা হচ্ছে...');
    setIsLoading(true);
    setLoadingAction('google');

    try {
      const fbUser = await signInWithGoogle();
      if (!fbUser) {
        throw new Error('গুগল অ্যাকাউন্ট সাইন-ইন সম্পন্ন হয়নি।');
      }

      const email = fbUser.email || '';
      const displayName = fbUser.displayName || 'গুগল শিক্ষার্থী';
      const uid = fbUser.uid;

      const authRes = await socialSyncAuthApi({
        uid,
        email: email || `${uid}@google.preptest.bd`,
        phone: email || uid,
        name: displayName,
        provider: 'google',
        avatar: '🧑‍🎓',
        avatarColor: '#FF6B00',
        targetUniversity: targetUni,
        targetUnit: "'ক' ইউনিট (বিজ্ঞান)",
        examYear: 'HSC-26',
        college: college || 'ঢাকা কলেজ',
      });

      setSuccessMessage(`স্বাগতম, ${displayName}! গুগল সাইন-ইন সফল হয়েছে!`);
      setTimeout(() => {
        onSuccess(authRes.user, authRes.progress);
      }, 400);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      triggerError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  // Facebook Sign-In Handler with Authentic Firebase Auth
  const handleFacebookSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage('ফেসবুক অ্যাকাউন্ট কানেক্ট করা হচ্ছে...');
    setIsLoading(true);
    setLoadingAction('facebook');

    try {
      const fbUser = await signInWithFacebook();
      if (!fbUser) {
        throw new Error('ফেসবুক অ্যাকাউন্ট সাইন-ইন সম্পন্ন হয়নি।');
      }

      const email = fbUser.email || '';
      const displayName = fbUser.displayName || 'ফেসবুক শিক্ষার্থী';
      const uid = fbUser.uid;

      const authRes = await socialSyncAuthApi({
        uid,
        email: email || `${uid}@facebook.preptest.bd`,
        phone: email || uid,
        name: displayName,
        provider: 'facebook',
        avatar: '🎓',
        avatarColor: '#1877F2',
        targetUniversity: targetUni,
        targetUnit: "'ক' ইউনিট (বিজ্ঞান)",
        examYear: 'HSC-26',
        college: college || 'ঢাকা কলেজ',
      });

      setSuccessMessage(`স্বাগতম, ${displayName}! ফেসবুক সাইন-ইন সফল হয়েছে!`);
      setTimeout(() => {
        onSuccess(authRes.user, authRes.progress);
      }, 400);
    } catch (err: any) {
      console.error('Facebook Sign-In Error:', err);
      triggerError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  // 1-Click Guest Login Handler
  const handleGuestLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage('গেস্ট অ্যাকাউন্ট প্রস্তুত করা হচ্ছে...');
    setIsLoading(true);
    setLoadingAction('guest');

    try {
      // Try Firebase anonymous auth concurrently
      signInAsGuest().catch(() => {});

      const guestRes = await guestLoginApi();
      setSuccessMessage('গেস্ট মোডে প্রবেশ সফল! উপভোগ করুন PrepTest!');
      setTimeout(() => {
        onSuccess(guestRes.user, guestRes.progress);
      }, 350);
    } catch (err: any) {
      triggerError('গেস্ট মোডে প্রবেশ করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  // Phone OTP Trigger with Real Firebase SMS Dispatch
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanPhone = otpPhone.trim();
    if (!cleanPhone || cleanPhone.replace(/[^0-9]/g, '').length < 10) {
      triggerError('সঠিক বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }

    setIsLoading(true);
    setLoadingAction('otp_send');
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = initPhoneRecaptcha('recaptcha-container');
      }
      const confirmation = await sendPhoneOtp(cleanPhone, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setIsOtpSent(true);
      setOtpTimer(60);
      setSuccessMessage(`৬-ডিজিটের এসএমএস ওটিপি পাঠানো হয়েছে: ${cleanPhone}`);
    } catch (err: any) {
      console.error('Phone OTP Send Error:', err);
      recaptchaVerifierRef.current = null;
      triggerError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  // Verify Phone OTP with Real Firebase Confirmation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!otpCode || otpCode.trim().length < 6) {
      triggerError('সঠিক ৬-ডিজিট ভেরিফিকেশন কোড দিন');
      return;
    }

    if (!confirmationResult) {
      triggerError('ওটিপি সেশনের মেয়াদ শেষ হয়েছে। পুনরায় ওটিপি পাঠান।');
      return;
    }

    setIsLoading(true);
    setLoadingAction('otp_verify');
    try {
      const result = await confirmationResult.confirm(otpCode.trim());
      const fbUser = result.user;
      const cleanPhone = fbUser.phoneNumber || otpPhone.trim();

      const authRes = await socialSyncAuthApi({
        uid: fbUser.uid,
        phone: cleanPhone,
        email: fbUser.email || `${cleanPhone.replace(/[^0-9]/g, '')}@preptest.bd`,
        name: fbUser.displayName || `শিক্ষার্থী (${cleanPhone.slice(-4)})`,
        provider: 'phone',
        avatar: '📱',
        avatarColor: '#0A2540',
        targetUniversity: targetUni,
        targetUnit: "'ক' ইউনিট (বিজ্ঞান)",
        examYear: 'HSC-26',
        college: college || 'ঢাকা কলেজ',
      });

      setSuccessMessage('ওটিপি যাচাই সফল হয়েছে! স্বাগতম!');
      setTimeout(() => {
        setIsPhoneOtpModalOpen(false);
        onSuccess(authRes.user, authRes.progress);
      }, 400);
    } catch (err: any) {
      console.error('Phone OTP Verify Error:', err);
      triggerError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  // Password Reset Handler
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const email = resetEmail.trim();
    if (!email || !email.includes('@')) {
      triggerError('সঠিক ইমেইল এড্রেস লিখুন');
      return;
    }

    setIsLoading(true);
    try {
      await sendResetEmail(email);
      setSuccessMessage(`পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হয়েছে: ${email}`);
      setTimeout(() => {
        setIsResetModalOpen(false);
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      triggerError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Main Submit Handler (Email/Phone + Password)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = emailOrPhone.trim();
    if (!cleanInput) {
      triggerError('অনুগ্রহ করে মোবাইল নম্বর বা ইমেইল লিখুন');
      return;
    }
    if (!password || password.length < 6) {
      triggerError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      triggerError('অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন');
      return;
    }

    setIsLoading(true);
    setLoadingAction('submit');

    try {
      const isEmail = cleanInput.includes('@');
      const emailForFb = isEmail ? cleanInput : `${cleanInput.replace(/[^0-9]/g, '')}@preptest.bd`;

      if (mode === 'login') {
        // Try Firebase Authentication
        try {
          await signInWithEmailPassword(emailForFb, password);
        } catch (fbErr: any) {
          console.warn('Firebase login check:', fbErr);
        }

        // Local SQLite / Backend Login
        const res = await loginUserApi({
          phone: cleanInput,
          password,
        });

        setSuccessMessage('লগইন সফল হয়েছে! স্বাগতম!');
        setTimeout(() => {
          onSuccess(res.user, res.progress);
        }, 350);
      } else {
        // Register Mode
        try {
          await signUpWithEmailPassword(emailForFb, password);
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/email-already-in-use') {
            throw new Error('এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।');
          }
          console.warn('Firebase sign up notice:', fbErr);
        }

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
            particleCount: 60,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#0A2540', '#FF6B00', '#059669', '#7C3AED'],
            disableForReducedMotion: true,
          });
        } catch (_) {}

        setSuccessMessage('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ৫০ বোনাস পয়েন্ট যোগ হয়েছে!');
        setTimeout(() => {
          onSuccess(res.user, res.progress);
        }, 500);
      }
    } catch (err: any) {
      triggerError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-linear-to-b from-[#EBF3FC] via-[#F4F8FC] to-[#E9F0F8] select-none">
      {/* Background Decorative Graphic Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Soft Ambient Radial Lights */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#FF6B00]/12 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-[#0A2540]/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 rounded-full bg-[#1877F2]/10 blur-3xl" />

        {/* Faint Graduation Cap & Admission Badge Vector Watermarks */}
        <div className="absolute top-8 right-8 sm:top-16 sm:right-24 text-slate-300/40 transform rotate-12 scale-125 hidden sm:block">
          <GraduationCap className="w-48 h-48 stroke-1 text-slate-400/25" />
        </div>
        <div className="absolute bottom-12 left-10 text-slate-300/40 transform -rotate-12 hidden sm:block">
          <ShieldCheck className="w-36 h-36 stroke-1 text-slate-400/20" />
        </div>
      </div>

      {/* Main Container / Mobile Phone Card Frame */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[420px] my-auto bg-white rounded-3xl sm:rounded-[32px] shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden flex flex-col"
      >
        {/* Top Accent Header Strip */}
        <div className="h-1.5 w-full bg-linear-to-r from-[#0A2540] via-[#FF6B00] to-[#0A2540]" />

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-4">
          {/* Logo & Brand Tagline */}
          <PrepTestHeroLogo />

          {/* Pill Segmented Tab Switcher (Matching Exact UI from Picture) */}
          <div className="relative bg-[#F0F4F8] p-1 rounded-2xl flex items-center border border-slate-200/80 shadow-inner">
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#0A2540] rounded-xl shadow-md"
              animate={{
                x: mode === 'login' ? '0%' : '100%',
              }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
            <button
              id="gatekeeper-tab-login"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Login</span>
            </button>

            <button
              id="gatekeeper-tab-register"
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
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
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-semibold overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold overflow-hidden"
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
            className="space-y-3.5"
          >
            {/* Email / Mobile Input Box (Matching the Glow Border in Reference) */}
            <div className="space-y-1">
              <label htmlFor="gatekeeper-input-email" className="block text-[11px] font-bold text-slate-600 px-1">
                Email Address / মোবাইল নম্বর
              </label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                <div className="pl-3.5 text-slate-400 pointer-events-none">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="gatekeeper-input-email"
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                  placeholder="user@example.com"
                  autoComplete="username"
                  className="w-full px-3 py-3 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] placeholder:text-slate-400 bg-transparent"
                />
              </div>
            </div>

            {/* Password Input Box */}
            <div className="space-y-1">
              <label htmlFor="gatekeeper-input-password" className="block text-[11px] font-bold text-slate-600 px-1">
                Password
              </label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                <div className="pl-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="gatekeeper-input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="কমপক্ষে ৪ অক্ষর"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-3 py-3 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] placeholder:text-slate-400 bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Extra Registration Fields */}
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-1"
              >
                {/* Full Name */}
                <div className="space-y-1">
                  <label htmlFor="gatekeeper-input-name" className="block text-[11px] font-bold text-slate-600 px-1">
                    শিক্ষার্থীর পূর্ণ নাম <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                    <div className="pl-3.5 text-slate-400 pointer-events-none">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                      id="gatekeeper-input-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="যেমন: আলিমুল আজাদ"
                      autoComplete="name"
                      className="w-full px-3 py-2.5 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] placeholder:text-slate-400 bg-transparent"
                    />
                  </div>
                </div>

                {/* College Name */}
                <div className="space-y-1">
                  <label htmlFor="gatekeeper-input-college" className="block text-[11px] font-bold text-slate-600 px-1">
                    কলেজের নাম
                  </label>
                  <div className="relative flex items-center rounded-2xl border border-slate-200 focus-within:border-[#FF6B00] focus-within:ring-3 focus-within:ring-[#FF6B00]/20 bg-white transition-all shadow-xs">
                    <div className="pl-3.5 text-slate-400 pointer-events-none">
                      <School className="w-5 h-5" />
                    </div>
                    <input
                      id="gatekeeper-input-college"
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="যেমন: ঢাকা কলেজ"
                      className="w-full px-3 py-2.5 rounded-2xl border-none outline-none text-sm font-semibold text-[#0A2540] placeholder:text-slate-400 bg-transparent"
                    />
                  </div>
                </div>

                {/* HSC Batch Chips */}
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

                {/* Target University Selection */}
                <div>
                  <label htmlFor="gatekeeper-select-target" className="block text-[11px] font-bold text-slate-600 mb-1 px-1">
                    টার্গেট বিশ্ববিদ্যালয়
                  </label>
                  <select
                    id="gatekeeper-select-target"
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

                {/* Avatar Color */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">অবতার কালার</span>
                  <div className="flex gap-2">
                    {colorPresets.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setAvatarColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                          avatarColor === c ? 'scale-125 ring-2 ring-[#FF6B00] ring-offset-1' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Forgot Password Link (Exactly like in the picture) */}
            {mode === 'login' && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  id="btn-gatekeeper-forgot-password"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-xs font-bold text-[#FF6B00] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Main Action Button (Vibrant Orange Button matching image) */}
            <button
              type="submit"
              id="btn-gatekeeper-main-action"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] active:scale-[0.98] text-white font-extrabold text-base shadow-lg shadow-[#FF6B00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading && loadingAction === 'submit' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>প্রসেস হচ্ছে...</span>
                </>
              ) : mode === 'login' ? (
                <span>Log In</span>
              ) : (
                <span>Register</span>
              )}
            </button>

            {/* OR Divider Line (Matching reference image) */}
            <div className="relative flex items-center justify-center py-1">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-widest absolute">
                OR
              </span>
            </div>

            {/* Social Authentication Buttons (Google, Facebook) */}
            <div className="space-y-2.5">
              {/* Continue with Google */}
              <button
                type="button"
                id="btn-gatekeeper-google"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-sm font-bold text-[#0A2540] transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading && loadingAction === 'google' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                ) : (
                  <GoogleVectorIcon />
                )}
                <span>Continue with Google</span>
              </button>

              {/* Continue with Facebook */}
              <button
                type="button"
                id="btn-gatekeeper-facebook"
                disabled={isLoading}
                onClick={handleFacebookSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-[#1877F2] hover:bg-[#166FE5] text-white text-sm font-bold transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading && loadingAction === 'facebook' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <FacebookVectorIcon />
                )}
                <span>Continue with Facebook</span>
              </button>
            </div>

            {/* Fast Options: Phone OTP & 1-Click Guest Access */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-gatekeeper-phone-otp"
                disabled={isLoading}
                onClick={() => {
                  setErrorMessage(null);
                  setIsPhoneOtpModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0A2540] transition-all cursor-pointer active:scale-98"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Phone OTP</span>
              </button>

              <button
                type="button"
                id="btn-gatekeeper-guest"
                disabled={isLoading}
                onClick={handleGuestLogin}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-black text-emerald-800 transition-all cursor-pointer active:scale-98"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span>১-ক্লিকে গেস্ট মোড</span>
              </button>
            </div>
          </motion.form>
        </div>

        {/* Footer Subtext */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>সুরক্ষিত ও ভেরিফায়েড অ্যাডমিশন পোর্টাল</span>
        </div>
      </motion.div>

      {/* Phone OTP Modal Dialog */}
      <AnimatePresence>
        {isPhoneOtpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#FF6B00]" />
                  <h3 className="font-bold text-[#0A2540]">মোবাইল ওটিপি সাইন-ইন</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhoneOtpModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <p className="text-xs text-slate-600">
                    আপনার মোবাইল নম্বর দিন। আমরা একটি ওটিপি কোড পাঠাব।
                  </p>
                  <input
                    type="tel"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    placeholder="যেমন: 01712345678"
                    className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 outline-none text-sm font-bold text-[#0A2540] focus:border-[#FF6B00]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-[#0A2540] text-white text-sm font-bold hover:bg-[#06182a] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>ওটিপি পাঠান</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-[#0A2540]">{otpPhone}</span> নম্বরে প্রেরিত ৬-ডিজিট কোড লিখুন:
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="1 2 3 4 5 6"
                    className="w-full px-3.5 py-3 text-center tracking-widest text-lg font-black rounded-2xl border border-slate-200 outline-none text-[#0A2540] focus:border-[#FF6B00]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#E05E00] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>যাচাই করে প্রবেশ করুন</span>}
                  </button>
                  {otpTimer > 0 ? (
                    <p className="text-center text-xs text-slate-400 font-semibold">
                      পুনরায় পাঠাতে অপেক্ষা করুন: {otpTimer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false);
                      }}
                      className="w-full text-center text-xs font-bold text-[#FF6B00] hover:underline cursor-pointer"
                    >
                      আবার ওটিপি পাঠান
                    </button>
                  )}
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Reset Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#FF6B00]" />
                  <h3 className="font-bold text-[#0A2540]">পাসওয়ার্ড রিসেট</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-3.5">
                <p className="text-xs text-slate-600">
                  আপনার নিবন্ধিত ইমেইল লিখুন। আমরা পাসওয়ার্ড রিসেট করার নিরাপদ লিংক পাঠিয়ে দেব।
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 outline-none text-sm font-semibold text-[#0A2540] focus:border-[#FF6B00]"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#E05E00] cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>রিসেট লিংক পাঠান</span>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Firebase Phone reCAPTCHA Container (invisible) */}
      <div id="recaptcha-container" className="hidden"></div>
    </div>
  );
};

export default GatekeeperAuthScreen;
