import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // If resetting within current state isn't enough, we can also soft-navigate or reset
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          id="global-error-boundary"
          role="alert"
          aria-live="assertive"
          className="min-h-screen w-full bg-[#F8FAFC] dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-5">
            {/* Warning Icon with soft glow */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                কিছু একটি সমস্যা হয়েছে!
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                দুঃখিত, কোনো একটি অনাকাঙ্ক্ষিত ত্রুটির কারণে পৃষ্ঠাটি লোড হতে পারেনি। পুনরায় চেষ্টা করতে নিচের বাটনে চাপ দিন।
              </p>
            </div>

            {/* Error detail (dev/diagnostics) */}
            {this.state.error && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-left overflow-x-auto text-xs font-mono text-slate-500 dark:text-slate-400 max-h-24">
                {this.state.error.toString()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                id="error-boundary-retry-btn"
                onClick={this.handleReload}
                aria-label="আবার চেষ্টা করুন"
                className="w-full flex-1 py-3 px-4 bg-[#1E3A8A] hover:bg-blue-900 active:scale-95 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>আবার চেষ্টা করুন</span>
              </button>

              <button
                type="button"
                id="error-boundary-home-btn"
                onClick={this.handleGoHome}
                aria-label="হোম পেজে ফিরে যান"
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>হোম</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
