import React from 'react';
import {
  Building2,
  Stethoscope,
  GraduationCap,
  Sparkles,
  BookOpen,
  Award,
  ShieldCheck,
  Flame,
  School,
  Landmark,
  Sprout,
  Palette,
  Briefcase,
  Crosshair,
  UserCheck,
  Layers,
  HeartPulse,
} from 'lucide-react';

interface InstitutionCrestIconProps {
  type: string;
  className?: string;
}

export const InstitutionCrestIcon: React.FC<InstitutionCrestIconProps> = ({ type, className = 'w-7 h-7' }) => {
  switch (type) {
    case 'buet':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Building2 className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'medical':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Stethoscope className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'dental':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <HeartPulse className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'iut':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Landmark className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'mist':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <ShieldCheck className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'afmc':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Crosshair className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'iba':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Briefcase className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'nursing':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <HeartPulse className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'gst':
    case 'agri_gst':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Layers className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'du':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <GraduationCap className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'ju':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <School className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'ru':
    case 'ku':
    case 'cu':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Landmark className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'sust':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Flame className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'agri':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Sprout className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'fine_arts':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Palette className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'bcs':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <Award className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    case 'ntrca':
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <UserCheck className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );

    default:
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
            <BookOpen className={`${className} text-white drop-shadow-sm`} />
          </div>
        </div>
      );
  }
};

export default InstitutionCrestIcon;
