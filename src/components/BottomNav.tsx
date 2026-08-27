import React from 'react';
import { Home, FolderArchive, PenLine, Bookmark, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { NavigationTab } from '../types';

interface BottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  mistakesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  mistakesCount = 0,
}) => {
  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'home', label: 'হোম', icon: Home },
    { id: 'question_bank', label: 'প্রশ্নব্যাংক', icon: FolderArchive },
    { id: 'exam', label: 'পরীক্ষা', icon: PenLine },
    { id: 'history', label: 'হিস্ট্রি', icon: Bookmark, badge: mistakesCount },
    { id: 'progress', label: 'প্রোগ্রেস', icon: Activity },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-2 py-1 safe-area-pb transition-colors duration-200">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              aria-label={`${item.label} ট্যাব`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-colors duration-200 relative cursor-pointer select-none ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {/* Icon Container with motion spring bounce & scale */}
              <motion.div
                className="relative flex items-center justify-center"
                animate={
                  isActive
                    ? {
                        scale: 1.12,
                        y: -2,
                      }
                    : {
                        scale: 1,
                        y: 0,
                      }
                }
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 15,
                }}
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive
                      ? 'stroke-[2.5px] text-blue-600 dark:text-blue-400 drop-shadow-xs'
                      : 'stroke-[1.8px]'
                  }`}
                />

                {/* Badge for Unresolved Mistakes / Notifications */}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[9.5px] font-mono font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`text-[11px] mt-1 tracking-tight transition-all duration-150 ${
                  isActive
                    ? 'font-bold text-blue-600 dark:text-blue-400'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.label}
              </span>

              {/* Active Dot / Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTabDot"
                  className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-0.5"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
