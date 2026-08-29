import React from 'react';
import { ArrowLeft, Pencil, Download, Search } from 'lucide-react';
import { InstitutionInfo, InstitutionUnitInfo } from '../../data/institutionData';
import InstitutionCrestIcon from './InstitutionCrestIcon';

interface InstitutionUnitSelectGridProps {
  institution: InstitutionInfo;
  onSelectUnit: (unit: InstitutionUnitInfo) => void;
  onBack: () => void;
}

const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const InstitutionUnitSelectGrid: React.FC<InstitutionUnitSelectGridProps> = ({
  institution,
  onSelectUnit,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const units = institution.units || [];
  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header Bar Matching App Style */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            id="unit-grid-back-btn"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="পেছনে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base sm:text-lg flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center p-1">
                <InstitutionCrestIcon type={institution.iconType} className="w-4 h-4" />
              </span>
              {institution.fullName || institution.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ইউনিট নির্বাচন করুন • মোট {toBengaliNumber(units.length)} টি ইউনিট
            </p>
          </div>
        </div>

        <button
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="ডাউনলোড"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input for Units */}
      {units.length > 4 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ইউনিট খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          />
        </div>
      )}

      {/* Grid of Unit Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 sm:gap-4">
        {filteredUnits.map((unit) => {
          return (
            <button
              key={unit.id}
              id={`unit-card-${unit.id}`}
              onClick={() => onSelectUnit(unit)}
              className="group relative overflow-hidden rounded-2xl p-4 text-white flex flex-col items-center justify-between h-40 sm:h-44 shadow-xs hover:shadow-md transition-all text-center cursor-pointer active:scale-95 border border-black/10 bg-gradient-to-b from-[#1e40af] to-[#3b82f6]"
            >
              {/* Crest Icon */}
              <div className="w-11 h-11 rounded-full bg-white/20 p-1 flex items-center justify-center shadow-xs backdrop-blur-xs group-hover:scale-105 transition-transform">
                <InstitutionCrestIcon type={unit.iconType || institution.iconType} className="w-6 h-6" />
              </div>

              {/* Unit Title */}
              <div className="w-full px-1">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight drop-shadow-xs">
                  {unit.name}
                </h3>
                <span className="text-[11px] text-white/80 font-medium block mt-0.5 truncate">
                  {unit.fullName}
                </span>
              </div>

              {/* Bottom Badge */}
              <div className="w-full flex justify-start">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 text-xs font-bold font-mono shadow-2xs">
                  <Pencil className="w-3 h-3 text-slate-600 dark:text-slate-400 stroke-[2.5]" />
                  <span>{toBengaliNumber(unit.paperCount)}টি</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InstitutionUnitSelectGrid;
