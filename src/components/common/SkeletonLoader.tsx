import React from 'react';

export const QuestionSkeleton: React.FC = () => (
  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 shadow-2xs space-y-3.5 animate-pulse">
    {/* Question Title Bar */}
    <div className="h-5 bg-slate-200/90 dark:bg-slate-700/80 rounded-md w-3/4" />

    {/* 4 Option Bars matching video */}
    <div className="space-y-2 pt-1">
      <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 w-full" />
      <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 w-full" />
      <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 w-full" />
      <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 w-full" />
    </div>

    {/* Explanation / Bottom Action Bar Placeholder */}
    <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
      <div className="h-4 w-20 bg-slate-200/80 dark:bg-slate-700/60 rounded" />
      <div className="h-7 w-24 bg-slate-200/80 dark:bg-slate-700/60 rounded-xl" />
    </div>
  </div>
);

export const StatsCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
    <div className="h-8 w-20 bg-slate-300 dark:bg-slate-600 rounded-lg" />
    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
  </div>
);

export const QuestionListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <QuestionSkeleton key={i} />
    ))}
  </div>
);

export const ScreenSkeletonLoader: React.FC<{ title?: string }> = ({ title }) => (
  <div className="space-y-4 max-w-4xl mx-auto p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-3.5 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
      </div>
      <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-6 w-20 bg-slate-300 dark:bg-slate-600 rounded" />
        </div>
      ))}
    </div>

    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <QuestionSkeleton key={idx} />
      ))}
    </div>
  </div>
);

export default {
  QuestionSkeleton,
  StatsCardSkeleton,
  QuestionListSkeleton,
  ScreenSkeletonLoader,
};

