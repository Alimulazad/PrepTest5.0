import React from 'react';

interface MascotProps {
  mood?: 'scared' | 'sad_sign' | 'celebrate' | 'thinking';
  className?: string;
}

export const MascotIllustration: React.FC<MascotProps> = ({
  mood = 'sad_sign',
  className = 'w-64 h-56',
}) => {
  if (mood === 'scared') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Shivering effects */}
        <svg viewBox="0 0 280 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Shivering wave lines on sides */}
          <path d="M40 90C45 95 40 105 45 110C50 115 45 125 50 130" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 110C35 115 30 125 35 130C40 135 35 145 40 150" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
          <path d="M240 90C235 95 240 105 235 110C230 115 235 125 230 130" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M250 110C245 115 250 125 245 130C240 135 245 145 240 150" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />

          {/* Floor Shadow */}
          <ellipse cx="140" cy="235" rx="70" ry="12" fill="#E2E8F0" />

          {/* Ears */}
          <path d="M90 60C85 45 92 35 105 40C110 50 105 65 90 60Z" fill="#7F1D1D" />
          <path d="M190 60C195 45 188 35 175 40C170 50 175 65 190 60Z" fill="#7F1D1D" />

          {/* Mascot Body */}
          <path
            d="M90 75C60 110 50 170 70 210C80 230 105 230 120 220C130 225 150 225 160 220C175 230 200 230 210 210C230 170 220 110 190 75C165 45 115 45 90 75Z"
            fill="#DC2626"
          />

          {/* White Belly */}
          <path
            d="M100 130C95 165 105 210 140 210C175 210 185 165 180 130C165 120 115 120 100 130Z"
            fill="#FEF2F2"
          />

          {/* Feet */}
          <ellipse cx="95" cy="222" rx="18" ry="12" fill="#B91C1C" />
          <ellipse cx="185" cy="222" rx="18" ry="12" fill="#B91C1C" />

          {/* Hands shivering on chest */}
          <ellipse cx="125" cy="145" rx="16" ry="12" fill="#B91C1C" transform="rotate(-15 125 145)" />
          <ellipse cx="155" cy="145" rx="16" ry="12" fill="#B91C1C" transform="rotate(15 155 145)" />

          {/* Eyebrows */}
          <path d="M105 85C115 78 125 82 130 88" stroke="#7F1D1D" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M175 85C165 78 155 82 150 88" stroke="#7F1D1D" strokeWidth="4.5" strokeLinecap="round" />

          {/* Scared Eyes */}
          <circle cx="120" cy="100" r="14" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.5" />
          <circle cx="118" cy="98" r="6" fill="#0F172A" />
          <circle cx="116" cy="96" r="2.5" fill="#FFFFFF" />

          <circle cx="160" cy="100" r="14" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.5" />
          <circle cx="162" cy="98" r="6" fill="#0F172A" />
          <circle cx="164" cy="96" r="2.5" fill="#FFFFFF" />

          {/* Cute Open Scared Mouth */}
          <path
            d="M125 122C125 115 155 115 155 122C155 135 125 135 125 122Z"
            fill="#450A0A"
            stroke="#1E293B"
            strokeWidth="2"
          />
          <path d="M130 117V123" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <path d="M137 132C140 128 145 128 148 132" fill="#F87171" />
        </svg>
      </div>
    );
  }

  // Default 'sad_sign' mood (Red mascot looking away holding the golden board "হারানো মার্কসের সন্ধান চাই")
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Floor Shadow */}
        <ellipse cx="140" cy="245" rx="75" ry="12" fill="#E2E8F0" />

        {/* Golden Sign Board */}
        <g transform="rotate(5 210 120)">
          <rect
            x="170"
            y="70"
            width="90"
            height="100"
            rx="12"
            fill="#F59E0B"
            stroke="#D97706"
            strokeWidth="3"
          />
          <rect x="174" y="74" width="82" height="92" rx="9" fill="#FBBF24" opacity="0.9" />
          
          {/* Sign board text */}
          <text x="215" y="105" textAnchor="middle" fill="#78350F" fontSize="13" fontWeight="900" fontFamily="sans-serif">
            হারানো
          </text>
          <text x="215" y="125" textAnchor="middle" fill="#78350F" fontSize="13" fontWeight="900" fontFamily="sans-serif">
            মার্কসের
          </text>
          <text x="215" y="145" textAnchor="middle" fill="#78350F" fontSize="13" fontWeight="900" fontFamily="sans-serif">
            সন্ধান
          </text>
          <text x="215" y="162" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
            চাই
          </text>
        </g>

        {/* Mascot Ears */}
        <path d="M100 80C90 65 95 50 110 55C118 65 115 80 100 80Z" fill="#991B1B" />
        <path d="M170 70C165 55 175 45 188 50C192 60 185 75 170 70Z" fill="#991B1B" />

        {/* Mascot Back/Body Shape (Looking away / turned slightly) */}
        <path
          d="M100 85C65 115 50 180 75 225C90 250 120 250 135 235C150 245 175 245 190 230C215 195 210 140 185 95C160 65 125 65 100 85Z"
          fill="#DC2626"
        />

        {/* Small Tail */}
        <ellipse cx="85" cy="180" rx="10" ry="10" fill="#991B1B" />

        {/* White Side Belly glimpse */}
        <path d="M170 140C175 170 170 210 150 225C170 220 185 190 180 150Z" fill="#FEF2F2" />

        {/* Red Legs */}
        <ellipse cx="105" cy="235" rx="18" ry="14" fill="#B91C1C" />
        <ellipse cx="170" cy="235" rx="18" ry="14" fill="#B91C1C" />

        {/* Arm Holding the Golden Board */}
        <path
          d="M160 125C175 120 200 130 215 145C225 155 220 170 205 170C190 170 170 155 155 145Z"
          fill="#DC2626"
        />
        <circle cx="215" cy="155" r="12" fill="#B91C1C" />
      </svg>
    </div>
  );
};
