import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, User, GraduationCap, School, Moon, Sun } from 'lucide-react';
import { UserProgress, UniversityUnit, User as UserType } from '../types';
import { UNIVERSITIES_DATA } from '../data/admissionData';
import { updateUserProfileApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface AvatarCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress;
  currentUser?: UserType | null;
  onSave: (updated: Partial<UserProgress>) => void;
  onUserUpdated?: (user: UserType) => void;
}

export const AvatarCreatorModal: React.FC<AvatarCreatorModalProps> = ({
  isOpen,
  onClose,
  progress,
  currentUser,
  onSave,
  onUserUpdated,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [name, setName] = useState(currentUser?.name || progress.name || 'Alimul Azad');
  const [college, setCollege] = useState(currentUser?.college || progress.college || 'ঢাকা কলেজ');
  const [hscBatch, setHscBatch] = useState(currentUser?.exam_year || progress.hscBatch || 'HSC-26');
  const [avatarBgColor, setAvatarBgColor] = useState(currentUser?.avatar_bg_color || progress.avatarBgColor || '#2563eb');
  const [targetUni, setTargetUni] = useState<UniversityUnit>((currentUser?.target_university as UniversityUnit) || progress.targetUniversity || 'du_a');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setCollege(currentUser.college || 'ঢাকা কলেজ');
      setHscBatch(currentUser.exam_year || 'HSC-26');
      setAvatarBgColor(currentUser.avatar_bg_color || '#2563eb');
      if (currentUser.target_university) {
        setTargetUni(currentUser.target_university as UniversityUnit);
      }
    } else {
      setName(progress.name || 'Alimul Azad');
      setCollege(progress.college || 'ঢাকা কলেজ');
      setHscBatch(progress.hscBatch || 'HSC-26');
      setAvatarBgColor(progress.avatarBgColor || '#2563eb');
      setTargetUni(progress.targetUniversity || 'du_a');
    }
  }, [currentUser, progress, isOpen]);

  if (!isOpen) return null;

  const colorPresets = [
    '#2563eb', // blue
    '#059669', // emerald
    '#e11d48', // rose
    '#7c3aed', // violet
    '#d97706', // amber
    '#0f766e', // teal
    '#c026d3', // fuchsia
    '#475569', // slate
  ];

  const batches = ['HSC-25', 'HSC-26', 'HSC-27', '2nd Timer'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentUser) {
        const res = await updateUserProfileApi({
          name,
          college,
          examYear: hscBatch,
          targetUniversity: targetUni,
          avatarBgColor,
        });
        if (onUserUpdated && res.user) {
          onUserUpdated(res.user);
        }
      }
      onSave({
        name,
        college,
        hscBatch,
        avatarBgColor,
        targetUniversity: targetUni,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Still update locally
      onSave({
        name,
        college,
        hscBatch,
        avatarBgColor,
        targetUniversity: targetUni,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-850 dark:bg-[#111827] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Modal Header with Profile Theme Toggle (Matching Screenshots 2-3) */}
        <div className="p-4 bg-[#1E3A8A] dark:bg-slate-900 text-white flex items-center justify-between border-b border-blue-900 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <h3 className="font-bold text-base">প্রোফাইল ও অবতার এডিটর</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle Icon in Profile Header */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
              title={isDark ? 'লাইট মোড' : 'ডার্ক মোড'}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-200" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 bg-white dark:bg-slate-900">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center justify-center pt-1 pb-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md border-2 border-white dark:border-slate-700 transition-all transform hover:scale-105"
              style={{ backgroundColor: avatarBgColor }}
            >
              {name ? name.charAt(0) : 'A'}
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">কালার নির্বাচন করুন</div>
            <div className="flex gap-2 mt-1.5">
              {colorPresets.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAvatarBgColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    avatarBgColor === c ? 'scale-125 ring-2 ring-[#1E3A8A] dark:ring-blue-400 ring-offset-1 dark:ring-offset-slate-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">শিক্ষার্থীর নাম</label>
            <input
              type="text"
              id="input-profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-hidden"
              required
            />
          </div>

          {/* College */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">কলেজের নাম</label>
            <input
              type="text"
              id="input-profile-college"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-hidden"
              placeholder="যেমন: ঢাকা কলেজ"
              required
            />
          </div>

          {/* HSC Batch */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">এইচএসসি ব্যাচ</label>
            <div className="grid grid-cols-4 gap-1.5">
              {batches.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setHscBatch(b)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    hscBatch === b
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] dark:bg-blue-600 dark:border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Target University */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">টার্গেট বিশ্ববিদ্যালয়</label>
            <select
              id="select-profile-target-uni"
              value={targetUni}
              onChange={(e) => setTargetUni(e.target.value as UniversityUnit)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#2563EB] focus:outline-hidden"
            >
              {UNIVERSITIES_DATA.map((uni) => (
                <option key={uni.id} value={uni.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {uni.name} - {uni.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-save-avatar"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvatarCreatorModal;

