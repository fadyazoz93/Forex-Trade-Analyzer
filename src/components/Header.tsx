import React from 'react';
import { Activity, Clock, Send, Shield, Volume2, VolumeX, Zap, Radio, TrendingUp, Database, Calendar } from 'lucide-react';
import { EngineMode, ShieldStatus } from '../types';

interface HeaderProps {
  engine?: EngineMode;
  onEngineChange?: (engine: EngineMode) => void;
  isScanning: boolean;
  onOpenTelegramSettings: () => void;
  onOpenRiskCalc: () => void;
  onOpenDatabase: () => void;
  onOpenSessionHolidays?: () => void;
  isWeekend?: boolean;
  shieldStatus: ShieldStatus;
  activeSignalCount: number;
  isAudioOn: boolean;
  onToggleAudio: () => void;
  tickCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isScanning,
  onOpenTelegramSettings,
  onOpenRiskCalc,
  onOpenDatabase,
  onOpenSessionHolidays,
  isWeekend = false,
  shieldStatus,
  activeSignalCount,
  isAudioOn,
  onToggleAudio,
  tickCount,
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Forex Trade Analyzer
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold font-mono">
                  Gann & Wyckoff Elite
                </span>
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
              المحفظة النخبوية (الذهب، الباوند ين، اليورو، الدولار ين) • تحديثات الأهداف وتأمين الدخول 24/7
            </p>
          </div>
        </div>

        {/* Strategy Engine Status (Intraday #1001) */}
        <div className="hidden sm:flex items-center bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col text-right">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>تداول مؤسسي متأني (Intraday #1001)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">1:2 R:R + BE</span>
            </div>
            <span className="text-[10px] text-slate-400">
              أهداف رباعية تدريجية • تأمين فوري عند TP1 • تحديثات تليجرام حية
            </span>
          </div>
        </div>

        {/* Quick Actions & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0">
          {/* UTC Clock & Shield (Desktop only) */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-medium">{shieldStatus.serverTimeUTC}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                shieldStatus.isSessionActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
              title={shieldStatus.isSessionActive ? 'جلسة التداول مفتوحة' : 'فترة تجميد أو خارج الجلسة'}
            />
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleAudio}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isAudioOn
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={isAudioOn ? 'التنبيه الصوتي اللحظي: مفعل' : 'التنبيه الصوتي اللحظي: معطل'}
          >
            {isAudioOn ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">الصوت</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">صامت</span>
              </>
            )}
          </button>

          {/* Sessions & Holidays Schedule Button (Desktop) */}
          {onOpenSessionHolidays && (
            <button
              onClick={onOpenSessionHolidays}
              className={`hidden sm:flex min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all items-center justify-center gap-1.5 cursor-pointer ${
                isWeekend
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="مواعيد عمل الجلسات الأربع والتقويم السنوي للعطلات الرسمية"
            >
              <Calendar className={`w-3.5 h-3.5 ${isWeekend ? 'text-rose-400' : 'text-cyan-400'}`} />
              <span>الجلسات</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isWeekend ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
            </button>
          )}

          {/* Risk Engine Button (Desktop) */}
          <button
            onClick={onOpenRiskCalc}
            className="hidden sm:flex min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors items-center justify-center gap-1.5 cursor-pointer"
            title="حاسبة المخاطرة وحجم اللوت (Prop-Firm Rule)"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>المخاطر</span>
          </button>

          {/* Telegram Settings */}
          <button
            onClick={onOpenTelegramSettings}
            className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold border border-sky-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title="إعدادات بوت تليجرام واختبار الإرسال"
          >
            <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-sky-400" />
            <span className="hidden sm:inline">تليجرام</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </button>

          {/* Turso Database Cloud Records (Desktop) */}
          <button
            onClick={onOpenDatabase}
            className="hidden md:flex min-h-[38px] px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 text-xs font-semibold border border-purple-800/60 transition-colors items-center justify-center gap-1.5 cursor-pointer"
            title="سجل صفقات قاعدة البيانات السحابية (Turso LibSQL Cloud)"
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>قاعدة البيانات</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          </button>

          {/* Real-time On-Tick Pulse Badge */}
          <div
            className="min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center gap-1.5 shadow-sm select-none"
            title={`البث اللحظي المباشر نشط (Tick-by-Tick) • تم تسجيل ${tickCount} تيك سوقي`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden md:inline font-mono">LIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
};
