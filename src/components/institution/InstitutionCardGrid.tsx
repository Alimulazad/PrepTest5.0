import React from 'react';
import { Pencil } from 'lucide-react';
import { InstitutionInfo } from '../../data/institutionData';
import InstitutionCrestIcon from './InstitutionCrestIcon';

interface InstitutionCardGridProps {
  institutions: InstitutionInfo[];
  onSelectInstitution: (institution: InstitutionInfo) => void;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const InstitutionCardGrid: React.FC<InstitutionCardGridProps> = ({
  institutions,
  onSelectInstitution,
}) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      {institutions.map((inst) => {
        return (
          <button
            key={inst.id}
            id={`inst-card-${inst.id}`}
            onClick={() => onSelectInstitution(inst)}
            className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 text-white flex flex-col items-center justify-between h-36 sm:h-40 shadow-xs hover:shadow-md transition-all text-center cursor-pointer active:scale-95 border border-black/10 bg-gradient-to-b ${inst.cardGradient}`}
            style={{ backgroundColor: inst.bgColor }}
          >
            {/* Top: Circular Institution Logo / Emblem */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 p-1 flex items-center justify-center shadow-xs backdrop-blur-xs group-hover:scale-105 transition-transform">
              <InstitutionCrestIcon type={inst.iconType} className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            {/* Middle: Bold Bangla Name */}
            <div className="w-full px-0.5">
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight drop-shadow-xs truncate line-clamp-2">
                {inst.name}
              </h3>
            </div>

            {/* Bottom Left: Pill Badge with Pencil Icon & Paper Count */}
            <div className="w-full flex justify-start">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-[11px] font-bold font-mono shadow-2xs">
                <Pencil className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400 stroke-[2.5]" />
                <span>{toBengaliNumber(inst.paperCount)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default InstitutionCardGrid;
