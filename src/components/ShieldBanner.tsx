import React from 'react';
import { AlertTriangle, CheckCircle, Flame, Lock, ShieldCheck } from 'lucide-react';
import { ShieldStatus } from '../types';

interface ShieldBannerProps {
  status: ShieldStatus;
  todayPnL: number;
  openLots: number;
  maxLots: number;
}

export const ShieldBanner: React.FC<ShieldBannerProps> = ({
  status,
  todayPnL,
  openLots,
  maxLots,
}) => {
  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-3 sm:px-6 py-2">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/70 border border-slate-700/50">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px] sm:text-xs">درع الاتجاه:</span>
            <span className="font-semibold text-emerald-400 text-[11px] sm:text-xs">Daily 50 EMA</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/70 border border-slate-700/50">
            <span className="text-slate-400 text-[11px] sm:text-xs">الجلسات:</span>
            <span className="font-semibold text-cyan-300 text-[11px] sm:text-xs">
              {status.isWeekendBlocked
                ? 'عطلة أسبوعية'
                : status.activeSessions.length > 0
                ? status.activeSessions.join(' + ')
                : 'فترة هدوء'}
            </span>
          </div>

          {status.isWeekendBlocked && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>عطلة نهاية الأسبوع (السوق مغلق)</span>
            </div>
          )}

          {status.isFridayAfternoonBlocked && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>حظر الجمعة (13:00 UTC)</span>
            </div>
          )}

          {status.isLondonFixBlocked && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>تسوية لندن (15:45 - 16:15)</span>
            </div>
          )}

          {status.isRolloverBlocked && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>فترة التبييت (21:45-23:15)</span>
            </div>
          )}
        </div>

        {/* Real-time Risk & PnL Telemetry */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 pt-1 md:pt-0 border-t md:border-t-0 border-slate-800/50">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
            <span className="text-slate-400">إجمالي اللوت:</span>
            <span className="font-mono font-bold text-slate-200">
              {openLots.toFixed(2)} / {maxLots.toFixed(2)} Lot
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] sm:text-xs">
            <span className="text-slate-400">ربح اليوم:</span>
            <span
              className={`font-mono font-bold ${
                todayPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {todayPnL >= 0 ? `+$${todayPnL.toFixed(2)}` : `-$${Math.abs(todayPnL).toFixed(2)}`}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-slate-400 text-xs">
            <Flame className="w-3 h-3 text-amber-400 shrink-0" />
            <span>قاطع الخسارة: 5% | الهدف: 10%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
