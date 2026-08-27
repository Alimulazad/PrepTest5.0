import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Zap,
  Server,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Key,
  ShieldCheck,
  Wifi,
  WifiOff,
  Radio,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Layers,
  Gauge,
  HelpCircle,
} from 'lucide-react';
import { OpenRouterSystemHealthResponse, LatencyHistoryPoint } from '../../types';
import { fetchOpenRouterSystemHealthApi } from '../../services/api';

interface AdminSystemHealthWidgetProps {
  onNavigateToKeys?: () => void;
  className?: string;
}

export const AdminSystemHealthWidget: React.FC<AdminSystemHealthWidgetProps> = ({
  onNavigateToKeys,
  className = '',
}) => {
  const [healthData, setHealthData] = useState<OpenRouterSystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(120);
  const [latencyHistory, setLatencyHistory] = useState<LatencyHistoryPoint[]>([]);
  const [lastPollTime, setLastPollTime] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEndpointDetails, setShowEndpointDetails] = useState<boolean>(true);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const performHealthPoll = useCallback(async (isManual: boolean = false) => {
    if (isManual) {
      setIsLoading(true);
    }
    setErrorMsg(null);

    try {
      const data = await fetchOpenRouterSystemHealthApi();
      if (!isMountedRef.current) return;

      setHealthData(data);
      const nowStr = new Date().toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setLastPollTime(nowStr);

      // Append to latency trend history (keep last 15 points)
      setLatencyHistory((prev) => {
        const newPoint: LatencyHistoryPoint = {
          time: new Date().toLocaleTimeString('en-US', { minute: '2-digit', second: '2-digit' }),
          latencyMs: data.avgLatencyMs,
          status: data.overallStatus,
        };
        const updated = [...prev, newPoint];
        return updated.slice(-15);
      });
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setErrorMsg(err.message || 'স্বাস্থ্য পরীক্ষা ব্যর্থ হয়েছে');
    } finally {
      if (isMountedRef.current && isManual) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial poll and setup interval
  useEffect(() => {
    isMountedRef.current = true;
    performHealthPoll(true);

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [performHealthPoll]);

  // Handle polling timer whenever isPolling or pollIntervalSec changes
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (isPolling && pollIntervalSec > 0) {
      pollTimerRef.current = setInterval(() => {
        performHealthPoll(false);
      }, pollIntervalSec * 1000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [isPolling, pollIntervalSec, performHealthPoll]);

  // Helper for latency color & rating
  const getLatencyBadge = (latencyMs?: number) => {
    if (!latencyMs || latencyMs === 0) {
      return { text: 'অনির্ধারিত', bg: 'bg-slate-800 text-slate-400 border-slate-700', label: '—' };
    }
    if (latencyMs < 350) {
      return {
        text: 'আল্ট্রা ফাস্ট',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        label: `${latencyMs.toLocaleString('bn-BD')} ms`,
      };
    }
    if (latencyMs < 750) {
      return {
        text: 'স্বাভাবিক',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        dot: 'bg-blue-400',
        label: `${latencyMs.toLocaleString('bn-BD')} ms`,
      };
    }
    if (latencyMs < 1400) {
      return {
        text: 'মাঝারি বিলম্ব',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
        label: `${latencyMs.toLocaleString('bn-BD')} ms`,
      };
    }
    return {
      text: 'ধীর রেসপন্স',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      label: `${latencyMs.toLocaleString('bn-BD')} ms`,
    };
  };

  const getStatusBadge = (status?: 'healthy' | 'degraded' | 'down' | 'untested') => {
    switch (status) {
      case 'healthy':
        return {
          title: 'সিস্টেম স্বাভাবিক ও সক্রিয়',
          shortText: 'সক্রিয় (Healthy)',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          icon: CheckCircle2,
          dotColor: 'bg-emerald-400',
        };
      case 'degraded':
        return {
          title: 'বিলম্বিত রেসপন্স / সতর্কবার্তা',
          shortText: 'বিলম্বিত (Degraded)',
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          icon: AlertTriangle,
          dotColor: 'bg-amber-400',
        };
      case 'down':
        return {
          title: 'সংযোগ সমস্যা / ত্রুটি',
          shortText: 'অফলাইন (Down)',
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          icon: AlertOctagon,
          dotColor: 'bg-rose-400',
        };
      default:
        return {
          title: 'পরীক্ষা করা হয়নি',
          shortText: 'অনির্ধারিত',
          color: 'text-slate-400',
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: HelpCircle,
          dotColor: 'bg-slate-400',
        };
    }
  };

  const currentStatusMeta = getStatusBadge(healthData?.overallStatus);
  const latencyBadge = getLatencyBadge(healthData?.avgLatencyMs);

  // Maximum latency in history for sparkline scaling
  const maxHistoryLatency = Math.max(1000, ...latencyHistory.map((p) => p.latencyMs));

  return (
    <div
      id="admin-system-health-widget"
      className={`bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-xl ${className}`}
    >
      {/* Background Glow Accent */}
      <div
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-20 transition-all ${
          healthData?.overallStatus === 'healthy'
            ? 'bg-emerald-500'
            : healthData?.overallStatus === 'degraded'
            ? 'bg-amber-500'
            : 'bg-rose-500'
        }`}
      />

      {/* Top Header & Polling Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-600/20 text-white shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                OpenRouter এপিআই সিস্টেম হেলথ
              </h2>
              {/* Overall Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentStatusMeta.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusMeta.dotColor} animate-pulse`} />
                <span>{currentStatusMeta.shortText}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>রিয়েল-টাইম এন্ডপয়েন্ট মনিটরিং, ল্যাটেন্সি ও কি-পুল স্ট্যাটাস</span>
              {lastPollTime && (
                <span className="text-slate-500 hidden sm:inline">• শেষ আপডেট: {lastPollTime}</span>
              )}
            </p>
          </div>
        </div>

        {/* Polling Controller Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Polling Interval Select */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>পোলিং:</span>
            </span>
            <select
              value={pollIntervalSec}
              onChange={(e) => setPollIntervalSec(Number(e.target.value))}
              disabled={!isPolling}
              className="bg-transparent text-slate-200 font-medium text-xs focus:outline-none cursor-pointer pr-2 py-0.5 disabled:opacity-50"
            >
              <option value={60} className="bg-slate-900 text-slate-200">১ মিনিট (60s)</option>
              <option value={120} className="bg-slate-900 text-slate-200">২ মিনিট (120s)</option>
              <option value={300} className="bg-slate-900 text-slate-200">৫ মিনিট (300s)</option>
              <option value={600} className="bg-slate-900 text-slate-200">১০ মিনিট (600s)</option>
              <option value={1200} className="bg-slate-900 text-slate-200">২০ মিনিট (1200s)</option>
              <option value={1800} className="bg-slate-900 text-slate-200">৩০ মিনিট (1800s)</option>
            </select>
          </div>

          {/* Auto-Polling Toggle Button */}
          <button
            id="admin-btn-toggle-polling"
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isPolling
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={isPolling ? 'অটো-পোলিং বিরতি দিন' : 'অটো-পোলিং চালু করুন'}
          >
            {isPolling ? (
              <>
                <Pause className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">পজ করুন</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">চালু করুন</span>
              </>
            )}
          </button>

          {/* Manual Ping Now Button */}
          <button
            id="admin-btn-manual-ping"
            onClick={() => performHealthPoll(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>এখনই পিং করুন</span>
          </button>
        </div>
      </div>

      {/* Error Banner if any */}
      {errorMsg && (
        <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => performHealthPoll(true)}
            className="text-xs text-rose-300 underline hover:text-white cursor-pointer"
          >
            পুনরায় চেষ্টা
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-5">
        {/* Metric 1: Average Latency */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              গড় ল্যাটেন্সি (RTT)
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {healthData ? (healthData.avgLatencyMs || 0).toLocaleString('bn-BD') : '...'}
            </span>
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${latencyBadge.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${latencyBadge.dot || 'bg-slate-400'}`} />
              <span>{latencyBadge.text}</span>
            </span>
          </div>
        </div>

        {/* Metric 2: Success Rate */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              সফলতার হার
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">
              {healthData ? healthData.successRate.toLocaleString('bn-BD') : '১০০'}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            মোট রিকোয়েস্ট: {healthData ? healthData.totalRequestsHandled.toLocaleString('bn-BD') : '০'} টি
          </p>
        </div>

        {/* Metric 3: Active Key & Failover Sequence */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              সক্রিয় কী ইনডেক্স
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400">
              {healthData ? `কী #${healthData.currentKeyIndex.toLocaleString('bn-BD')}` : 'কী #১'}
            </span>
            <span className="text-xs text-slate-400">
              / {healthData ? healthData.totalKeys.toLocaleString('bn-BD') : '১'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate font-mono">
            {healthData?.failoverStatus?.activeKeyLabel || 'ডিফল্ট প্রাইমারি কী'}
          </p>
        </div>

        {/* Metric 4: Auto-Failover State */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              ফেইলওভার ব্যাকআপ
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-400">
              {healthData ? (healthData.failoverStatus?.healthyFallbacksCount || 0).toLocaleString('bn-BD') : '০'}
            </span>
            <span className="text-xs text-slate-400">টি ব্যাকআপ কী</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>অটো-ফেইলওভার সক্রিয়</span>
          </div>
        </div>
      </div>

      {/* Latency History Mini Sparkline / Trend Bar */}
      {latencyHistory.length > 1 && (
        <div className="mt-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>রিয়েল-টাইম ল্যাটেন্সি ট্রেন্ড হিস্ট্রি (শেষ {latencyHistory.length.toLocaleString('bn-BD')} টি পোলিং)</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>সর্বোচ্চ: {Math.max(...latencyHistory.map((p) => p.latencyMs)).toLocaleString('bn-BD')} ms</span>
              <span>সর্বনিম্ন: {Math.min(...latencyHistory.map((p) => p.latencyMs)).toLocaleString('bn-BD')} ms</span>
            </div>
          </div>

          {/* Sparkline Bar Chart */}
          <div className="h-14 flex items-end gap-1.5 pt-2 pb-1 px-1">
            {latencyHistory.map((point, idx) => {
              const heightPercent = Math.max(15, Math.min(100, (point.latencyMs / maxHistoryLatency) * 100));
              const isFast = point.latencyMs < 400;
              const isMed = point.latencyMs >= 400 && point.latencyMs < 900;
              const barBg =
                point.status === 'down'
                  ? 'bg-rose-500'
                  : isFast
                  ? 'bg-emerald-400 hover:bg-emerald-300'
                  : isMed
                  ? 'bg-blue-400 hover:bg-blue-300'
                  : 'bg-amber-400 hover:bg-amber-300';

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center group relative cursor-pointer"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-700 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-20">
                    {point.latencyMs} ms • {point.time}
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t transition-all ${barBg}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Probed Endpoints Section */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">OpenRouter এন্ডপয়েন্ট হেলথ ডায়াগনস্টিকস</h3>
          </div>
          <button
            onClick={() => setShowEndpointDetails(!showEndpointDetails)}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
          >
            {showEndpointDetails ? 'সংক্ষেপ করুন' : 'বিস্তারিত দেখুন'}
          </button>
        </div>

        {showEndpointDetails && (
          <div className="space-y-2.5">
            {healthData?.endpoints?.map((ep) => {
              const epStatus = getStatusBadge(ep.status);
              const epLatency = getLatencyBadge(ep.latencyMs);

              return (
                <div
                  key={ep.id}
                  className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${epStatus.bg}`}
                    >
                      <epStatus.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{ep.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                          {ep.url}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ep.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {ep.statusCode && (
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        HTTP {ep.statusCode}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${epLatency.bg}`}
                    >
                      <span>{epLatency.label}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Key Usage & Pool Status Matrix */}
      {healthData && healthData.keysUsage && healthData.keysUsage.length > 0 && (
        <div className="mt-5 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">এপিআই কি পুল ও রিয়েল-টাইম ইউসেজ</h3>
            </div>
            {onNavigateToKeys && (
              <button
                id="admin-btn-manage-keys-from-health"
                onClick={onNavigateToKeys}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
              >
                <span>কী ম্যানেজ করুন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {healthData.keysUsage.map((k, idx) => {
              const isKeyActive = k.isCurrentActive;
              const isRateLimited = k.status === 'rate_limited';
              const isErr = k.status === 'error';

              return (
                <div
                  key={k.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isKeyActive
                      ? 'bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-900/20'
                      : isRateLimited
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : isErr
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{k.label}</span>
                      {isKeyActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
                          প্রাইমারি সক্রিয়
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        k.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : k.status === 'rate_limited'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : k.status === 'error'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {k.status === 'active'
                        ? 'সক্রিয়'
                        : k.status === 'rate_limited'
                        ? 'রেট লিমিট (429)'
                        : k.status === 'error'
                        ? 'এরর'
                        : 'অনির্ধারিত'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{k.keyMasked}</span>
                    {k.latencyMs ? (
                      <span className="text-emerald-400 font-semibold">{k.latencyMs} ms</span>
                    ) : (
                      <span>—</span>
                    )}
                  </div>

                  {/* Request metrics for this key */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>সফল: <strong className="text-emerald-400">{k.successCount}</strong></span>
                    <span>ব্যর্থ: <strong className={k.errorCount > 0 ? 'text-rose-400' : 'text-slate-400'}>{k.errorCount}</strong></span>
                    {k.creditUsage?.isFreeTier !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                        {k.creditUsage.isFreeTier ? 'ফ্রি টিয়ার' : 'পেইড টিয়ার'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
