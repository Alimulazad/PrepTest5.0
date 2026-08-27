import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Question, WrittenQuestion } from '../../types';
import QuestionCard from '../QuestionCard';
import { WrittenQuestionCard } from '../WrittenQuestionCard';
import { QuestionSkeleton } from './SkeletonLoader';
import { AlertCircle, RefreshCw, Sparkles, Inbox } from 'lucide-react';

export interface VirtualizedQuestionListProps {
  items: (Question | WrittenQuestion)[];
  type?: 'mcq' | 'written' | 'auto';
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  bookmarkedIds?: Set<string> | string[];
  onToggleBookmark?: (questionId: string) => void;
  onAskAI?: (question: Question | WrittenQuestion) => void;
  onSelectOption?: (questionId: string, option: 'A' | 'B' | 'C' | 'D') => void;
  selectedOptions?: Record<string, 'A' | 'B' | 'C' | 'D' | null>;
  mode?: 'practice' | 'exam' | 'review';
  forceShowAnswer?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  containerHeight?: string | number;
}

export const VirtualizedQuestionList: React.FC<VirtualizedQuestionListProps> = ({
  items,
  type = 'auto',
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  fetchNextPage,
  isError = false,
  error = null,
  onRetry,
  bookmarkedIds = [],
  onToggleBookmark,
  onAskAI,
  onSelectOption,
  selectedOptions = {},
  mode = 'practice',
  forceShowAnswer = false,
  emptyTitle = 'কোনো প্রশ্ন পাওয়া যায়নি',
  emptyDescription = 'অন্য ফিল্টার বা সিলেবাস নির্বাচন করে পুনরায় চেষ্টা করুন।',
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const bookmarkSet = React.useMemo(() => {
    if (bookmarkedIds instanceof Set) return bookmarkedIds;
    return new Set(bookmarkedIds);
  }, [bookmarkedIds]);

  // Use virtualizer
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? items.length + 1 : items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 240,
    overscan: 4,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Trigger next page fetching when user scrolls near the end
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (
      lastItem.index >= items.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      fetchNextPage();
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, isLoading, items.length, fetchNextPage]);

  // Loading state (initial)
  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-4 py-2" id="virtual-question-list-loading">
        <QuestionSkeleton />
        <QuestionSkeleton />
        <QuestionSkeleton />
      </div>
    );
  }

  // Error state
  if (isError && items.length === 0) {
    return (
      <div
        id="virtual-question-list-error"
        className="p-8 text-center bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50 space-y-4 my-4"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            প্রশ্ন লোড করতে সমস্যা হয়েছে
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {error?.message || 'ইন্টারনেট সংযোগ চেক করুন অথবা পুনরায় চেষ্টা করুন।'}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            id="retry-fetch-questions-btn"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>আবার চেষ্টা করুন</span>
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div
        id="virtual-question-list-empty"
        className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 my-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center">
          <Inbox className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {emptyTitle}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {emptyDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      id="virtualized-question-scroll-container"
      className="w-full pr-1.5"
    >
      <div className="space-y-4">
        {items.map((item, idx) => {
          const isItemWritten =
            type === 'written' ||
            (item as any).type === 'written' ||
            (!('options' in item) && ('explanation_image_urls' in item || 'question_number' in item));

          if (isItemWritten) {
            const writtenQ = item as WrittenQuestion;
            return (
              <WrittenQuestionCard
                key={`${writtenQ.id || 'wq'}-${idx}`}
                question={writtenQ}
                index={idx}
                isBookmarked={bookmarkSet.has(writtenQ.id)}
                onToggleBookmark={() => onToggleBookmark?.(writtenQ.id)}
                onAskAI={onAskAI ? () => onAskAI(writtenQ) : undefined}
                forceShowAnswer={forceShowAnswer}
              />
            );
          }

          const mcqQ = item as Question;
          return (
            <QuestionCard
              key={`${mcqQ.id || 'q'}-${idx}`}
              question={mcqQ}
              index={idx}
              mode={mode}
              selectedOption={selectedOptions[mcqQ.id]}
              onSelectOption={
                onSelectOption ? (opt) => onSelectOption(mcqQ.id, opt) : undefined
              }
              isBookmarked={bookmarkSet.has(mcqQ.id)}
              onToggleBookmark={() => onToggleBookmark?.(mcqQ.id)}
              onAskAI={onAskAI ? () => onAskAI(mcqQ) : undefined}
              forceShowAnswer={forceShowAnswer}
            />
          );
        })}
      </div>

      {/* End of list indicator */}
      {!hasNextPage && items.length > 0 && (
        <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
          — সকল প্রশ্ন দেখানো হয়েছে ({items.length} টি) —
        </div>
      )}
    </div>
  );
};

export default VirtualizedQuestionList;
