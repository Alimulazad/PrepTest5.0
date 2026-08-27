import React from 'react';

export const MilestoneCloudIcon: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Soft back cloud shape */}
        <path
          d="M35 55C30 55 20 60 20 70C20 80 30 85 40 85H90C100 85 108 77 108 67C108 58 102 50 92 50C92 35 78 22 62 22C48 22 38 32 35 45C30 45 35 55 35 55Z"
          fill="#F97316"
        />
        {/* Lightning Bolt */}
        <path
          d="M62 38L48 58H60L54 82L76 54H64L72 38H62Z"
          fill="#FFFFFF"
          stroke="#EA580C"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
