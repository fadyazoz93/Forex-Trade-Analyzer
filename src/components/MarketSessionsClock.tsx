import React, { useState, useEffect } from 'react';
import { Clock, Globe, Zap, Moon, Sun, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface MarketSession {
  id: string;
  nameAr: string;
  nameEn: string;
  city: string;
  flag: string;
  openUtcHour: number; // UTC hour
  closeUtcHour: number; // UTC hour
  highLiquidity: boolean;
  color: string;
}

const SESSIONS: MarketSession[] = [
  {
    id: 'sydney',
    nameAr: 'جلسة سيدني',
    nameEn: 'Sydney',
    city: 'سيدني',
    flag: '🇦🇺',
    openUtcHour: 21,
    closeUtcHour: 6,
    highLiquidity: false,
    color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
  },
  {
    id: 'tokyo',
    nameAr: 'جلسة طوكيو',
    nameEn: 'Tokyo',
    city: 'طوكيو',
    flag: '🇯🇵',
    openUtcHour: 0,
    closeUtcHour: 9,
    highLiquidity: false,
    color: 'border-pink-500/40 text-pink-300 bg-pink-500/10',
  },
  {
    id: 'london',
    nameAr: 'جلسة لندن',
    nameEn: 'London',
    city: 'لندن',
    flag: '🇬🇧',
    openUtcHour: 7,
    closeUtcHour: 16,
    highLiquidity: true,
    color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
  },
  {
    id: 'newyork',
    nameAr: 'جلسة نيويورك',
    nameEn: 'New York',
    city: 'نيويورك',
    flag: '🇺🇸',
    openUtcHour: 12,
    closeUtcHour: 21,
    highLiquidity: true,
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  },
];

function isSessionOpen(nowUtcHour: number, openHour: number, closeHour: number): boolean {
  if (openHour < closeHour) {
    return nowUtcHour >= openHour && nowUtcHour < closeHour;
  }
  // Wraps over midnight (e.g. Sydney 21:00 - 06:00)
  return nowUtcHour >= openHour || nowUtcHour < closeHour;
}

function getTimeUntil(nowUtcMinutes: number, targetUtcHour: number): string {
  const targetMinutes = targetUtcHour * 60;
  let diff = targetMinutes - nowUtcMinutes;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}س ${mins}د`;
}

export const MarketSessionsClock: React.FC = () => {
  const [now, setNow] = useState<Date>(new Date());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTotalMinutes = utcHours * 60 + utcMinutes;
  const currentUtcDec = utcHours + utcMinutes / 60;

  // Check Overlap: London & New York (12:00 to 16:00 UTC)
  const isLondonOpen = isSessionOpen(currentUtcDec, 7, 16);
  const isNewYorkOpen = isSessionOpen(currentUtcDec, 12, 21);
  const isTokyoOpen = isSessionOpen(currentUtcDec, 0, 9);
  const isSydneyOpen = isSessionOpen(currentUtcDec, 21, 6);
  const isLondonNyOverlap = isLondonOpen && isNewYorkOpen;

  // Overall Liquidity status
  let liquidityLevel = 'متوسطة';
  let liquidityBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  let liquidityTip = 'سيولة اعتيادية مناسبة للمراقبة وتحضير صفقات اليومي';

  if (isLondonNyOverlap) {
    liquidityLevel = 'سيولة عظمى (Peak Overlap ⚡)';
    liquidityBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20';
    liquidityTip = 'فترة تداخل لندن ونيويورك الذهبية: أعلى حجم تداول واكتمال أسرع لأهداف 1:2 R:R';
  } else if (isLondonOpen || isNewYorkOpen) {
    liquidityLevel = 'سيولة مرتفعة (High)';
    liquidityBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    liquidityTip = 'جلسة رئيسية نشطة: تحركات اتجاهية واضحة لكسر مستويات جان ومربع التسعة';
  } else if (isTokyoOpen || isSydneyOpen) {
    liquidityLevel = 'سيولة آسيوية (Asian Session)';
    liquidityBadgeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    liquidityTip = 'تذبذب هادئ ونطاقات أفقية: مفضل مراقبة أزواج الين أو انتظار جلسة لندن';
  }

  // Format UTC string
  const utcString = now.toLocaleTimeString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Format Local string
  const localString = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl mb-4 transition-all">
      {/* Header Row: Title, Clock & Expand Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  توقيت جلسات السيولة العالمية
                </h3>
                <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${liquidityBadgeClass}`}>
                  {liquidityLevel}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden md:block">
                {liquidityTip}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
            title={isExpanded ? 'تصغير شريط الجلسات' : 'توسيع شريط الجلسات'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
          {/* Real-time clocks */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-950 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-bold">{utcString}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-sans">UTC</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-sans">محلي:</span>
              <span className="font-bold">{localString}</span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:flex p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title={isExpanded ? 'تصغير شريط الجلسات' : 'توسيع شريط الجلسات'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Sessions Cards & Timeline */}
      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-3">
          {/* Sessions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SESSIONS.map((session) => {
              const open = isSessionOpen(currentUtcDec, session.openUtcHour, session.closeUtcHour);
              const timeRemaining = open
                ? getTimeUntil(utcTotalMinutes, session.closeUtcHour)
                : getTimeUntil(utcTotalMinutes, session.openUtcHour);

              return (
                <div
                  key={session.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                    open
                      ? `${session.color} shadow-sm`
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      <span>{session.flag}</span>
                      <span>{session.nameAr}</span>
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        open
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {open ? 'مفتوحة الآن' : 'مغلقة'}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono flex items-center justify-between text-slate-400 mt-1">
                    <span>
                      {session.openUtcHour.toString().padStart(2, '0')}:00 - {session.closeUtcHour.toString().padStart(2, '0')}:00 UTC
                    </span>
                  </div>

                  <div className="text-[10px] mt-1 flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">
                      {open ? 'تغلق خلال:' : 'تفتتح خلال:'}
                    </span>
                    <span className="font-mono font-bold text-white">
                      {timeRemaining}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 24-Hour Visual Session Flow Bar */}
          <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>مخطط الساعات الـ 24 بتوقيت UTC</span>
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] sm:text-[10px]">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  لندن (07-16)
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  نيويورك (12-21)
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  التداخل الذهبي (12-16)
                </span>
              </div>
            </div>

            {/* 24 blocks for each hour */}
            <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5 h-4 bg-slate-900 rounded overflow-hidden p-0.5 border border-slate-800">
              {Array.from({ length: 24 }).map((_, h) => {
                const isCurrentHour = h === utcHours;
                const isL = h >= 7 && h < 16;
                const isNY = h >= 12 && h < 21;
                const isOver = isL && isNY;
                const isT = h >= 0 && h < 9;
                const isS = h >= 21 || h < 6;

                let blockColor = 'bg-slate-800/40';
                if (isOver) {
                  blockColor = 'bg-amber-400';
                } else if (isL) {
                  blockColor = 'bg-cyan-500/80';
                } else if (isNY) {
                  blockColor = 'bg-emerald-500/80';
                } else if (isT) {
                  blockColor = 'bg-pink-500/50';
                } else if (isS) {
                  blockColor = 'bg-indigo-500/50';
                }

                return (
                  <div
                    key={h}
                    className={`h-full rounded-[2px] transition-all relative ${blockColor} ${
                      isCurrentHour ? 'ring-2 ring-white z-10 scale-110 shadow-sm' : ''
                    }`}
                    title={`الساعة ${h}:00 UTC ${isCurrentHour ? '(الوقت الحالي)' : ''}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1 px-1">
              <span>00:00</span>
              <span>06:00</span>
              <span className="text-amber-400 font-bold">12:00 (Overlap)</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
