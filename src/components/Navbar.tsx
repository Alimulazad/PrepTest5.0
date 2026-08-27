import React, { useState, useRef, useEffect } from 'react';
import { Flame, User, Settings, LogIn, LogOut, Moon, Sun, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { UserProgress, User as UserType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  progress: UserProgress;
  currentUser: UserType | null;
  onOpenAvatarModal: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenAITutor: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  progress,
  currentUser,
  onOpenAvatarModal,
  onOpenAuthModal,
  onLogout,
  onOpenSettings,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDark, toggleTheme } = useTheme();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const streakDays = currentUser ? progress.streakDays : progress.streakDays || 0;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 h-14 flex items-center shadow-xs transition-colors duration-200">
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between relative">
        {/* Left: Streak Badge */}
        <div
          id="streak-badge"
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full text-amber-700 dark:text-amber-300 font-bold cursor-pointer transition-transform active:scale-95 shadow-2xs select-none shrink-0"
          title={`${streakDays} দিন টানা প্র্যাকটিস স্ট্রিক!`}
        >
          <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
          <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
            {streakDays}
          </span>
        </div>

        {/* Center: Stylized PrepTest Brand Logo + Tagline */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center cursor-pointer select-none group px-1"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shadow-xs">
              <div className="w-3 h-3 border-2 border-white rounded-xs"></div>
            </div>
            <span className="tracking-tight font-black text-xl sm:text-2xl text-slate-900 dark:text-white leading-none">
              Prep<span className="text-blue-600 dark:text-blue-400">Test</span>
            </span>
          </div>
          <span className="hidden sm:inline-block text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-tight mt-0.5 whitespace-nowrap">
            টেস্ট দাও বেস্ট হও
          </span>
        </div>

        {/* Right: Theme Toggle & Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Theme Toggle Button */}
          <button
            id="btn-quick-theme-toggle"
            aria-label="থিম পরিবর্তন করুন"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-blue-400 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-700"
            title={isDark ? "লাইট মোডে যান" : "ডার্ক মোডে যান"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Avatar Circular Profile Button */}
          <div className="relative" ref={menuRef}>
            <button
              id="btn-profile-dropdown"
              aria-label="প্রোফাইল ও মেনু"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400 text-white flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-xs transition-all duration-150 active:scale-95 cursor-pointer border border-blue-500 dark:border-blue-400"
              title="প্রোফাইল ও সেটিংস"
            >
              {currentUser && currentUser.name ? (
                currentUser.name.charAt(0)
              ) : (
                <span>স্বাধীন</span>
              )}
            </button>

            {/* Profile & Settings Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 top-11 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 p-3 space-y-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Header with Quick Theme Toggle */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                      style={{
                        backgroundColor: currentUser?.avatar_bg_color || progress.avatarBgColor || '#E11D48',
                      }}
                    >
                      {currentUser?.name ? currentUser.name.charAt(0) : <User className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {currentUser?.name || 'স্বাধীন শিক্ষার্থী'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {currentUser?.phone || 'গেস্ট মোড'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Theme Toggle in Profile Header (Matching Screenshot) */}
                    <button
                      type="button"
                      onClick={toggleTheme}
                      aria-label={isDark ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
                      title={isDark ? 'লাইট মোড' : 'ডার্ক মোড'}
                      className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                    >
                      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                    </button>

                    <button
                      onClick={() => setIsProfileMenuOpen(false)}
                      aria-label="মেনু বন্ধ করুন"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {/* Theme Switcher in Menu Item */}
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                      <span className="text-slate-800 dark:text-slate-200">{isDark ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড (নাইট স্টাডি)'}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                      {isDark ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  {/* Profile / Avatar Edit */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenAvatarModal();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-[#0F766E] dark:text-emerald-400" />
                      <span>অবতার ও প্রোফাইল কাস্টমাইজ</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Settings Modal Shortcut */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span>অ্যাপ সেটিংস ও সিস্টেম তথ্য</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Auth Button at bottom of Dropdown */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  {currentUser ? (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>লগআউট করুন</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenAuthModal('login');
                      }}
                      className="w-full py-2 px-3 bg-[#0F766E] hover:bg-[#0D655E] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>লগইন / একাউন্ট খুলুন</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
