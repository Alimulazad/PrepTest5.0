import React from 'react';

interface SubjectIconProps {
  type: string;
  className?: string;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ type, className = 'w-6 h-6' }) => {
  switch (type) {
    case 'bangla':
      return (
        <span className={`font-bold text-red-600 inline-flex items-center justify-center text-lg ${className}`}>
          অ
        </span>
      );

    case 'english':
      return (
        <span className={`font-black text-indigo-700 inline-flex items-center justify-center text-base tracking-tighter ${className}`}>
          Aa
        </span>
      );

    case 'gk':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" fill="#0284C7" />
          <path d="M9 21C9 21.55 9.45 22 10 22H14C14.55 22 15 21.55 15 21V20H9V21Z" fill="#0369A1" />
          <path d="M10 10C10 8.9 10.9 8 12 8" stroke="#E0F2FE" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'statistics':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#0284C7" strokeWidth="1.5" fill="#F0F9FF" />
          <path d="M12 2A10 10 0 0 1 22 12H12V2Z" fill="#2563EB" />
          <path d="M12 12V22A10 10 0 0 1 2 12H12Z" fill="#DC2626" />
          <path d="M12 12H22A10 10 0 0 1 12 22V12Z" fill="#059669" />
        </svg>
      );

    case 'physics':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 4V12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12V4" stroke="#65A30D" strokeWidth="3" strokeLinecap="round" />
          <rect x="4.5" y="3" width="3" height="4" rx="0.5" fill="#DC2626" />
          <rect x="16.5" y="3" width="3" height="4" rx="0.5" fill="#2563EB" />
          <path d="M12 19V22M9 22H15" stroke="#4D7C0F" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'agriculture':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 10C12 5.5 16 3 19 3C19 6.5 16.5 10 12 10Z" fill="#059669" />
          <path d="M12 10C12 6 8.5 4 5 4C5 7.5 7.5 10 12 10Z" fill="#10B981" />
          <path d="M12 10V21" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M7 16H17L15 21H9L7 16Z" fill="#0D9488" />
        </svg>
      );

    case 'chemistry':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 3H15M10 3V8L4.5 18C3.8 19.2 4.7 21 6.1 21H17.9C19.3 21 20.2 19.2 19.5 18L14 8V3" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 16L8.5 12.5H15.5L17.5 16C17 18 16 19 12 19C8 19 7 18 6.5 16Z" fill="#F97316" />
          <circle cx="10" cy="16" r="1" fill="#FEF08A" />
          <circle cx="14" cy="15" r="1.5" fill="#FEF08A" />
        </svg>
      );

    case 'home_science':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L4 9V20C4 20.55 4.45 21 5 21H19C19.55 21 20 20.55 20 20V9L12 3Z" stroke="#DB2777" strokeWidth="1.5" fill="#FDF2F8" />
          <path d="M12 7C10.5 7 9 8.5 9 10.5C9 13.5 12 16 12 16C12 16 15 13.5 15 10.5C15 8.5 13.5 7 12 7Z" fill="#EC4899" />
          <path d="M8 21V17C8 16 9 15 10 15H14C15 15 16 16 16 17V21" stroke="#DB2777" strokeWidth="1.5" />
        </svg>
      );

    case 'biology':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4C8 8 16 8 20 4" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 20C8 16 16 16 20 20" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 6V18M12 4V20M17 6V18" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12C9 7 15 17 20 12" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'math':
      return (
        <span className={`font-serif font-black text-amber-700 inline-flex items-center justify-center text-xl ${className}`}>
          π
        </span>
      );

    case 'psychology':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="#9333EA" />
          <path d="M12 8C10.5 8 9.5 9 9.5 10.5C9.5 12 11 13 12 14C13 13 14.5 12 14.5 10.5C14.5 9 13.5 8 12 8Z" fill="#F3E8FF" />
        </svg>
      );

    case 'ict':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="3" fill="#D946EF" />
          <circle cx="18" cy="6" r="3" fill="#EC4899" />
          <circle cx="12" cy="18" r="3.5" fill="#C026D3" />
          <path d="M6 6L12 18M18 6L12 18M6 6H18" stroke="#A21CAF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'mental_ability':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3C7 3 4 7 4 11C4 13.5 5.5 15.5 7 17V20C7 20.5 7.5 21 8 21H16C16.5 21 17 20.5 17 20V17C18.5 15.5 20 13.5 20 11C20 7 17 3 12 3Z" fill="#2563EB" />
          <circle cx="12" cy="11" r="3" stroke="#DBEAFE" strokeWidth="1.5" strokeDasharray="2 2" />
          <path d="M12 9V13M10 11H14" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'iba':
      return (
        <div className={`flex items-center justify-center font-black text-[#991B1B] border-2 border-[#991B1B] rounded px-1 text-[11px] tracking-widest ${className}`}>
          IBA
        </div>
      );

    default:
      return (
        <span className={`font-bold text-slate-700 ${className}`}>
          •
        </span>
      );
  }
};
