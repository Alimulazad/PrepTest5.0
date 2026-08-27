import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';

interface ExamStandardSelectPageProps {
  initialStandards?: string[];
  onBack: () => void;
  onNext: (standards: string[]) => void;
}

interface StandardOption {
  id: string;
  name: string;
  nameBangla: string;
}

const STANDARDS_LIST: StandardOption[] = [
  { id: 'engineering', name: 'Engineering', nameBangla: 'ইঞ্জিনিয়ারিং' },
  { id: 'varsity', name: 'Varsity', nameBangla: "ভার্সিটি 'ক'/'খ'" },
  { id: 'medical', name: 'Medical', nameBangla: 'মেডিকেল ও ডেন্টাল' },
  { id: 'academic', name: 'Academic', nameBangla: 'বোর্ড পরীক্ষা (HSC)' },
  { id: 'main_book', name: 'Main Book', nameBangla: 'মূল বই ভিত্তিক' },
];

export const ExamStandardSelectPage: React.FC<ExamStandardSelectPageProps> = ({
  initialStandards = ['varsity', 'medical'],
  onBack,
  onNext,
}) => {
  const [selectedStandards, setSelectedStandards] = useState<string[]>(initialStandards);

  const toggleStandard = (id: string) => {
    if (selectedStandards.includes(id)) {
      if (selectedStandards.length > 1) {
        setSelectedStandards(selectedStandards.filter((s) => s !== id));
      }
    } else {
      setSelectedStandards([...selectedStandards, id]);
    }
  };

  const handleProceed = () => {
    onNext(selectedStandards.length > 0 ? selectedStandards : ['varsity']);
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-32 flex flex-col">
      {/* Top Header Matching Screenshot 4 */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC] dark:bg-slate-900 px-4 pt-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">স্ট্যান্ডার্ড</h2>
          </div>

          {/* 2/3 Steps Badge */}
          <div className="px-2.5 py-0.5 bg-[#047857]/15 dark:bg-emerald-950/50 rounded-full">
            <span className="text-xs font-bold text-[#047857] dark:text-emerald-400">২/৩ স্টেপস</span>
          </div>
        </div>

        {/* 3-Part Progress Line */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-1.5 rounded-full bg-[#047857] dark:bg-emerald-500" />
          <div className="h-1.5 rounded-full bg-[#047857] dark:bg-emerald-500" />
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Main Grid Options */}
      <div className="p-4 max-w-xl mx-auto w-full space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3 pt-2">
          {STANDARDS_LIST.map((opt) => {
            const isSelected = selectedStandards.includes(opt.id);

            return (
              <div
                key={opt.id}
                onClick={() => toggleStandard(opt.id)}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer select-none active:scale-98 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/50 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-0.5">
                  <h3
                    className={`font-bold text-base leading-snug ${
                      isSelected ? 'text-emerald-950 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {opt.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{opt.nameBangla}</p>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-[#047857] border-[#047857] text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-xl">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleProceed}
            className="w-full py-3.5 bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-bold rounded-xl shadow-md transition-all active:scale-98 cursor-pointer text-base"
          >
            এগিয়ে যাই
          </button>
        </div>
      </div>
    </div>
  );
};
