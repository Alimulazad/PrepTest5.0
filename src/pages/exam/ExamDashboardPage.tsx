import React, { useState } from 'react';
import { SubjectIcon } from './components/SubjectIcon';
import { EXAM_SUBJECTS, PRESET_EXAMS_LIST } from './examData';
import { PresetExamConfig } from './types';
import { X, Info, AlertCircle, Check } from 'lucide-react';

interface ExamDashboardPageProps {
  onSelectSubject: (subjectKey: string) => void;
  onStartPresetExam: (preset: PresetExamConfig, optionalSelected: string[]) => void;
  onSelectQuickPractice?: (subjectKey: string) => void;
}

export const ExamDashboardPage: React.FC<ExamDashboardPageProps> = ({
  onSelectSubject,
  onStartPresetExam,
  onSelectQuickPractice,
}) => {
  const [activeTab, setActiveTab] = useState<'mock' | 'quick'>('mock');
  const [selectedPreset, setSelectedPreset] = useState<PresetExamConfig | null>(null);
  const [selectedOptionals, setSelectedOptionals] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleOpenPreset = (preset: PresetExamConfig) => {
    setSelectedPreset(preset);
    setSelectedOptionals([]);
    setAlertMessage(null);
  };

  const handleToggleOptional = (subjectKey: string) => {
    if (!selectedPreset) return;
    if (selectedOptionals.includes(subjectKey)) {
      setSelectedOptionals(selectedOptionals.filter((s) => s !== subjectKey));
    } else {
      if (selectedOptionals.length >= selectedPreset.requiredOptionalCount) {
        // Replace oldest or cap
        setSelectedOptionals([...selectedOptionals.slice(1), subjectKey]);
      } else {
        setSelectedOptionals([...selectedOptionals, subjectKey]);
      }
    }
  };

  const handleStartPreset = () => {
    if (!selectedPreset) return;
    if (
      selectedPreset.requiredOptionalCount > 0 &&
      selectedOptionals.length !== selectedPreset.requiredOptionalCount
    ) {
      setAlertMessage(`${selectedPreset.requiredOptionalCount} টি ঐচ্ছিক বিষয় নির্বাচন করো`);
      return;
    }
    onStartPresetExam(selectedPreset, selectedOptionals);
    setSelectedPreset(null);
  };

  return (
    <div className="w-full pb-24 pt-2">
      {/* Top Main Tab Navigation */}
      <div className="flex items-center justify-center gap-10 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
        <button
          onClick={() => setActiveTab('mock')}
          className={`text-lg font-bold pb-2 relative transition-all cursor-pointer ${
            activeTab === 'mock'
              ? 'text-slate-900 dark:text-slate-100 font-extrabold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          মক পরীক্ষা
          {activeTab === 'mock' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#047857] dark:bg-emerald-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('quick')}
          className={`text-lg font-bold pb-2 relative transition-all cursor-pointer ${
            activeTab === 'quick'
              ? 'text-slate-900 dark:text-slate-100 font-extrabold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          দ্রুত প্র্যাকটিস
          {activeTab === 'quick' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#047857] dark:bg-emerald-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Subtitle */}
      <div className="text-center mb-4">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide">বিষয় ভিত্তিক</p>
      </div>

      {/* 2-Column Subject Grid Matching Screenshot 1 */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {EXAM_SUBJECTS.map((sub) => (
          <button
            key={sub.key}
            onClick={() => {
              if (activeTab === 'quick' && onSelectQuickPractice) {
                onSelectQuickPractice(sub.key);
              } else {
                onSelectSubject(sub.key);
              }
            }}
            className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all active:scale-98 text-left cursor-pointer group"
          >
            <div className="shrink-0 flex items-center justify-center w-7 h-7">
              <SubjectIcon type={sub.iconType} className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-[15px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              {sub.name}
            </span>
          </button>
        ))}
      </div>

      {/* Preset Exams Section */}
      <div className="space-y-3 mb-6">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">প্রিসেট পরীক্ষা</p>
        </div>

        {/* Scrollable / wrapped preset pill buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {PRESET_EXAMS_LIST.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleOpenPreset(preset)}
              className="px-5 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-600 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 text-sm font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Exam Bottom Sheet Modal matching Screenshots */}
      {selectedPreset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          {/* Modal Card */}
          <div className="bg-[#F8FAFC] dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Top drag bar & Header */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mb-3" />
              <div className="w-full flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedPreset.title}</h3>
                <button
                  onClick={() => setSelectedPreset(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Question Distribution Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4.5 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">প্রশ্ন বণ্টন</h4>
                <Info className="w-4 h-4 text-slate-400" />
              </div>

              {/* Mandatory list */}
              <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {selectedPreset.mandatorySubjects.map((sub, idx) => (
                  <div key={idx} className="flex items-center justify-between font-medium">
                    <span>{sub.name} - {sub.count}</span>
                  </div>
                ))}
              </div>

              {/* Optional list */}
              {selectedPreset.optionalSubjects.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2.5">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    ঐচ্ছিক (যেকোন {selectedPreset.requiredOptionalCount}টি)
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {selectedPreset.optionalSubjects.map((opt) => {
                      const isSelected = selectedOptionals.includes(opt.subjectKey);
                      return (
                        <button
                          key={opt.subjectKey}
                          onClick={() => handleToggleOptional(opt.subjectKey)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-bold'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-[#047857] border-[#047857] text-white'
                                : 'border-slate-400 bg-white dark:bg-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{opt.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Time Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">সময়</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">{selectedPreset.durationMinutes} মিনিট</p>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartPreset}
              className="w-full py-3.5 bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
            >
              পরীক্ষা শুরু করো
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal if < 2 selected */}
      {alertMessage && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-800 text-white rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 border border-slate-700 animate-in zoom-in-95">
            <h4 className="font-bold text-base text-slate-100 text-center">{alertMessage}</h4>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-1.5 font-bold text-emerald-400 hover:text-emerald-300 text-sm rounded cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
