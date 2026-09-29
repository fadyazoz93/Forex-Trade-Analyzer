import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Database,
  History,
  Menu,
  Radio,
  Send,
  Shield,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

export type MobileTab = 'signals' | 'market' | 'sessions' | 'history' | 'all';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  activeSignalsCount: number;
  onOpenRiskCalc: () => void;
  onOpenTelegram: () => void;
  onOpenDatabase: () => void;
  onOpenSessions: () => void;
  isAudioOn: boolean;
  onToggleAudio: () => void;
  isWeekend?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  activeSignalsCount,
  onOpenRiskCalc,
  onOpenTelegram,
  onOpenDatabase,
  onOpenSessions,
  isAudioOn,
  onToggleAudio,
  isWeekend = false,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  return (
    <>
      {/* Mobile Tools Quick Drawer / Bottom Sheet */}
      {isToolsOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-5 shadow-2xl space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">الأدوات والإعدادات السريعة</h3>
                  <p className="text-[10px] text-slate-400">إدارة المخاطر وبوت تليجرام وقاعدة البيانات</p>
                </div>
              </div>
              <button
                onClick={() => setIsToolsOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Tools Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Risk Calculator */}
              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenRiskCalc();
                }}
                className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-cyan-500/50 flex flex-col items-start gap-1.5 transition-all text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">حاسبة المخاطر واللوت</span>
                <span className="text-[10px] text-slate-400">قواعد الالتزام بحسابات التمويل</span>
              </button>

              {/* Telegram Settings */}
              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenTelegram();
                }}
                className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-sky-500/50 flex flex-col items-start gap-1.5 transition-all text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">إعدادات تليجرام</span>
                <span className="text-[10px] text-slate-400">البث التلقائي وفحص القناة</span>
              </button>

              {/* Turso Cloud Database */}
              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenDatabase();
                }}
                className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-purple-500/50 flex flex-col items-start gap-1.5 transition-all text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">سجل قاعدة البيانات</span>
                <span className="text-[10px] text-slate-400">سجل الصفقات السحابي LibSQL</span>
              </button>

              {/* Sessions & Holidays */}
              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenSessions();
                }}
                className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-cyan-500/50 flex flex-col items-start gap-1.5 transition-all text-right cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">الجلسات والعطلات</span>
                <span className="text-[10px] text-slate-400">{isWeekend ? 'السوق مغلق حالياً' : 'مواعيد البورصات'}</span>
              </button>
            </div>

            {/* Audio Toggle & View All Options */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={onToggleAudio}
                className={`flex-1 py-3 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isAudioOn
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isAudioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{isAudioOn ? 'التنبيه الصوتي: مفعل' : 'التنبيه الصوتي: صامت'}</span>
              </button>

              <button
                onClick={() => {
                  onSelectTab('all');
                  setIsToolsOpen(false);
                }}
                className={`py-3 px-4 rounded-2xl border font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                عرض كل الأقسام
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Mobile Bottom Navigation Bar */}
      <nav
        aria-label="التنقل الرئيسي للهاتف"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)]"
      >
        <div className="grid grid-cols-5 h-14 max-w-md mx-auto items-center px-1">
          {/* Tab 1: Signals */}
          <button
            onClick={() => onSelectTab('signals')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors relative cursor-pointer ${
              activeTab === 'signals' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Zap className="w-5 h-5" />
              {activeSignalsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[9px] flex items-center justify-center shadow-sm">
                  {activeSignalsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">الإشارات</span>
            {activeTab === 'signals' && (
              <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-cyan-400" />
            )}
          </button>

          {/* Tab 2: Market Watch */}
          <button
            onClick={() => onSelectTab('market')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors relative cursor-pointer ${
              activeTab === 'market' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-bold">السوق</span>
            {activeTab === 'market' && (
              <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-cyan-400" />
            )}
          </button>

          {/* Tab 3: Sessions */}
          <button
            onClick={() => onSelectTab('sessions')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors relative cursor-pointer ${
              activeTab === 'sessions' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-bold">الجلسات</span>
            {activeTab === 'sessions' && (
              <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-cyan-400" />
            )}
          </button>

          {/* Tab 4: History */}
          <button
            onClick={() => onSelectTab('history')}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors relative cursor-pointer ${
              activeTab === 'history' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] font-bold">السجل</span>
            {activeTab === 'history' && (
              <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-cyan-400" />
            )}
          </button>

          {/* Tab 5: Tools & Settings */}
          <button
            onClick={() => setIsToolsOpen(true)}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors relative cursor-pointer ${
              isToolsOpen ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-bold">أدوات</span>
          </button>
        </div>
      </nav>
    </>
  );
};
