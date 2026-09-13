import React, { useState } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, ChevronRight, X, Sparkles, Moon, Sun } from 'lucide-react';
import { MarketHoursStatus, SESSIONS_LIST } from '../services/marketHoursService';

interface SessionHolidayNoticeBannerProps {
  status: MarketHoursStatus;
  onOpenFullSchedule: () => void;
}

export const SessionHolidayNoticeBanner: React.FC<SessionHolidayNoticeBannerProps> = ({
  status,
  onOpenFullSchedule,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return (
      <div className="bg-slate-900/40 border-b border-slate-800/60 px-3 sm:px-6 py-1 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status.isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span>
            {status.isWeekend
              ? `السوق مغلق (عطلة أسبوعية) • يفتتح بعد ${status.weekendOpensIn}`
              : `السوق مفتوح • ${status.activeSessions.map((s) => s.nameAr).join(' + ') || 'استراحة'}`}
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(false)}
          className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>إظهار شريط الإشعار</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  const { isWeekend, notification, isGoldenOverlap, isMarketOpen } = status;

  // Visual theme based on state
  let containerBg = 'from-slate-900 via-slate-900 to-slate-950 border-slate-800';
  let accentBorder = 'border-slate-800';
  let iconComponent = <Clock className="w-4 h-4 text-cyan-400" />;

  if (isWeekend) {
    containerBg = 'from-rose-950/40 via-slate-900 to-slate-950 border-rose-900/40';
    accentBorder = 'border-rose-500/30';
    iconComponent = <Moon className="w-4 h-4 text-rose-400" />;
  } else if (notification.type === 'holiday') {
    containerBg = 'from-amber-950/40 via-slate-900 to-slate-950 border-amber-900/40';
    accentBorder = 'border-amber-500/30';
    iconComponent = <AlertTriangle className="w-4 h-4 text-amber-400" />;
  } else if (isGoldenOverlap) {
    containerBg = 'from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/30';
    accentBorder = 'border-amber-400/40';
    iconComponent = <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />;
  }

  return (
    <div className={`bg-gradient-to-r ${containerBg} border-b ${accentBorder} px-3 sm:px-6 py-2.5 transition-all shadow-md relative`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Main Alert Message & Status */}
        <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0 mt-0.5 sm:mt-0">
            {iconComponent}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                {notification.title}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${notification.badgeClass}`}>
                {notification.badgeText}
              </span>

              {isWeekend && (
                <span className="text-[10px] bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded-md border border-rose-500/20 font-mono">
                  موعد الافتتاح: الأحد 21:00 UTC (باقي: {status.weekendOpensIn})
                </span>
              )}

              {!isWeekend && isMarketOpen && (
                <span className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                  موعد عطلة الأسبوع: الجمعة 21:00 UTC (باقي: {status.weekendClosesIn})
                </span>
              )}
            </div>

            <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-2 sm:line-clamp-1 mt-0.5">
              {notification.message}
            </p>
          </div>
        </div>

        {/* Action Controls & Fast Timetable Preview */}
        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-800/60">
          <button
            onClick={onOpenFullSchedule}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="استعراض جدول مواعيد الجلسات والعطلات بالتفصيل"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>جدول الجلسات والعطلات الكامل</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="إخفاء هذا الإشعار مؤقتاً"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
