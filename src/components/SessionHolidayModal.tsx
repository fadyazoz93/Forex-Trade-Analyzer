import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Sun,
  Sparkles,
  Bell,
  Info,
  ShieldAlert,
  Volume2,
  TrendingUp,
  Zap,
  Send,
  Flame,
  Landmark,
  ShieldCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  MarketHoursStatus,
  SESSIONS_LIST,
  GLOBAL_MARKET_HOLIDAYS,
  MAJOR_ECONOMIC_DECISIONS,
  formatUtcToLocalHour,
  MarketSessionDetail,
  EconomicDecisionEvent,
} from '../services/marketHoursService';
import { playSignalAlertSound } from '../services/soundAlert';

interface SessionHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: MarketHoursStatus;
}

export const SessionHolidayModal: React.FC<SessionHolidayModalProps> = ({
  isOpen,
  onClose,
  status,
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'killzones' | 'decisions' | 'weekend' | 'holidays' | 'alerts'>('sessions');
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [testAlertSent, setTestAlertSent] = useState<boolean>(false);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleBroadcastTelegram = async (updateType: string, id?: string) => {
    setBroadcastingId(id || updateType);
    setBroadcastFeedback(null);
    try {
      const res = await fetch('/api/telegram/broadcast-market-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateType, id }),
      });
      const data = await res.json();
      if (data.success) {
        setBroadcastFeedback({ success: true, msg: 'تم إرسال التنبيه إلى قناة التليجرام بنجاح! 🚀' });
      } else {
        setBroadcastFeedback({ success: false, msg: data.error || 'تعذر الإرسال إلى التليجرام' });
      }
    } catch {
      setBroadcastFeedback({ success: false, msg: 'خطأ في الاتصال بالخادم' });
    } finally {
      setBroadcastingId(null);
      setTimeout(() => setBroadcastFeedback(null), 4500);
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          new Notification('Forex Trade Analyzer 🔔', {
            body: 'تم تفعيل إشعارات مواعيد عمل الجلسات والعطلات بنجاح!',
            icon: '/icon.png',
          });
          setTestAlertSent(true);
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    }
  };

  const handleSendTestNotification = () => {
    playSignalAlertSound();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('إشعار جلسات التداول والعطلات', {
        body: status.isWeekend
          ? `السوق في عطلة أسبوعية • الافتتاح الأحد 21:00 UTC (متبقي: ${status.weekendOpensIn})`
          : `السوق مفتوح • الجلسة النشطة: ${status.activeSessions.map((s) => s.nameAr).join(', ')}`,
        icon: '/icon.png',
      });
    }
    setTestAlertSent(true);
    setTimeout(() => setTestAlertSent(false), 3000);
  };

  const { isWeekend, isMarketOpen, isGoldenOverlap, notification } = status;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  مواقيت السوق والقرارات الاقتصادية المهمة
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${notification.badgeClass}`}>
                  {notification.badgeText}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                جدول الجلسات الأربع، أفضل أوقات التداول (Kill Zones)، ومواعيد قرارات الفائدة والأخبار ذات التأثير العالي
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Market Status Ticker & Broadcast feedback */}
        <div className="bg-slate-950 px-4 sm:px-6 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="text-slate-300 font-semibold">حالة السوق الآن:</span>
            <span className={`font-bold ${isMarketOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isWeekend ? 'مغلق (عطلة نهاية الأسبوع)' : isMarketOpen ? 'مفتوح للتداول' : 'عطلة رسمية'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-mono">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>UTC: {status.utcTimeFormatted}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 text-slate-300">
              <span>توقيتك المحلي:</span>
              <span className="font-bold text-white">{status.localTimeFormatted}</span>
            </div>
          </div>
        </div>

        {/* Global Broadcast Status Banner */}
        {broadcastFeedback && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-2 border-b animate-in fade-in ${
              broadcastFeedback.success
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{broadcastFeedback.msg}</span>
            </div>
            <button
              onClick={() => setBroadcastFeedback(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 sm:px-6 border-b border-slate-800 bg-slate-900/60 overflow-x-auto gap-1 sm:gap-2 text-xs">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3 px-3 sm:px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>جلسات التداول الأربع</span>
          </button>

          <button
            onClick={() => setActiveTab('killzones')}
            className={`py-3 px-3 sm:px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'killzones'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>أفضل أوقات التداول (Kill Zones)</span>
          </button>

          <button
            onClick={() => setActiveTab('decisions')}
            className={`py-3 px-3 sm:px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'decisions'
                ? 'border-rose-400 text-rose-300 bg-rose-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-4 h-4 text-rose-400" />
            <span>القرارات الاقتصادية الكبرى</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-rose-300 font-mono">
              {MAJOR_ECONOMIC_DECISIONS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('weekend')}
            className={`py-3 px-3 sm:px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'weekend'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>عطلة نهاية الأسبوع</span>
            {isWeekend && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            className={`py-3 px-3 sm:px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'holidays'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>تقويم العطلات</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 px-3 sm:px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>إعدادات البث والتنبيهات</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {/* Daily Brief Broadcast Card */}
              <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-sm">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>بث الدليل اليومي الشامل لجلسات السوق ومواعيد القرارات 📢</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    أرسل ملخصاً احترافياً فورياً إلى قناة التليجرام يتضمن مواعيد كافة الجلسات وتوقيت مكة وأهم التوجيهات.
                  </p>
                </div>
                <button
                  onClick={() => handleBroadcastTelegram('DAILY_BRIEF')}
                  disabled={broadcastingId === 'DAILY_BRIEF'}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-cyan-500/20"
                >
                  <Send className={`w-3.5 h-3.5 ${broadcastingId === 'DAILY_BRIEF' ? 'animate-spin' : ''}`} />
                  <span>بث الدليل للقناة الآن</span>
                </button>
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {SESSIONS_LIST.map((session) => {
                  const isOpenNow = isMarketOpen && status.activeSessions.some((s) => s.id === session.id);
                  const localOpen = formatUtcToLocalHour(session.openUtcHour);
                  const localClose = formatUtcToLocalHour(session.closeUtcHour);
                  const meccaOpenHour = (session.openUtcHour + 3) % 24;
                  const meccaCloseHour = (session.closeUtcHour + 3) % 24;
                  const meccaStr = `${String(meccaOpenHour).padStart(2, '0')}:00 - ${String(meccaCloseHour).padStart(2, '0')}:00`;

                  return (
                    <div
                      key={session.id}
                      className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                        isOpenNow
                          ? 'bg-slate-800/80 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{session.flag}</span>
                            <div>
                              <div className="font-extrabold text-sm text-white flex items-center gap-2">
                                <span>{session.nameAr}</span>
                                {isOpenNow && (
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold animate-pulse">
                                    مفتوح الآن
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {session.city}, {session.country} ({session.nameEn})
                              </span>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                              سيولة {session.liquidity}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {session.descriptionAr}
                        </p>

                        {/* Hours table */}
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] grid grid-cols-2 gap-2 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px]">توقيت مكة المكرمة:</span>
                            <span className="font-bold text-amber-300">{meccaStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">توقيت UTC العالمي:</span>
                            <span className="font-bold text-cyan-300">
                              {String(session.openUtcHour).padStart(2, '0')}:00 - {String(session.closeUtcHour).padStart(2, '0')}:00
                            </span>
                          </div>
                        </div>

                        {/* Best symbols */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="text-slate-400">الأصول المستهدفة:</span>
                          {session.bestSymbols.map((sym) => (
                            <span key={sym} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold">
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Broadcast buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleBroadcastTelegram('SESSION_OPEN', session.id)}
                          disabled={broadcastingId === session.id}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 text-[11px] font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>إرسال تنبيه الافتتاح للتليجرام</span>
                        </button>
                        <button
                          onClick={() => handleBroadcastTelegram('SESSION_CLOSE', session.id)}
                          disabled={broadcastingId === session.id}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] border border-slate-800 transition-colors cursor-pointer"
                          title="إرسال تنبيه الإغلاق"
                        >
                          إغلاق
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: KILL ZONES & GOLDEN TRADING WINDOWS */}
          {activeTab === 'killzones' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span>مفهوم الفترات الذهبية للتداول (Institutional Kill Zones)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  تتميز الأسواق المالية بأن 80% من تحركات اليوم الحقيقية وتكوين القمم والقيعان تحدث في نوافذ زمنية محددة. يفضل تجنب التداول العشوائي خارج هذه النوافذ لضمان نقاء الاتجاه وسرعة ضرب الأهداف.
                </p>
              </div>

              {/* Window 1: London - NY Overlap */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      1. فترة التداخل الذهبي (London - NY Overlap Kill Zone) 🔥
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 w-fit">
                    03:00 م - 07:00 م بتوقيت مكة (12:00 - 16:00 UTC)
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  <b>الذروة العظمى للسيولة العالمية:</b> تداخل جلسة لندن مع افتتاح بنوك نيويورك والذهب. تمثل أكثر من 65% من سيولة اليوم بالكامل، وفيها تنطلق أقوى شموع الزخم ونماذج وايكوف الحقيقية.
                </p>

                <div className="p-3 rounded-xl bg-slate-900 text-xs space-y-1.5 border border-slate-800 text-slate-300">
                  <div className="font-bold text-cyan-300">🎯 أفضل الأصول: الذهب XAU/USD | اليورو دولار EUR/USD | الباوند ين GBP/JPY</div>
                  <div className="text-[11px] text-slate-400">💡 التوجيه: أفضل توقيت لتحقيق أهداف Quad Targets وكسر الهياكل السعرية.</div>
                </div>

                <button
                  onClick={() => handleBroadcastTelegram('KILLZONE', 'OVERLAP')}
                  disabled={broadcastingId === 'OVERLAP'}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>بث تنبيه الفترة الذهبية إلى قناة التليجرام 📤</span>
                </button>
              </div>

              {/* Window 2: London Open Kill Zone */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-cyan-400" />
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      2. فترة كسر نطاق آسيا الصباحي (London Open Kill Zone) 🇬🇧
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/40 w-fit">
                    10:00 ص - 01:00 م بتوقيت مكة (07:00 - 10:00 UTC)
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  تتميز بدخول السيولة الأوروبية واختراق نطاق جلسة آسيا الصباحية (Asian Range Sweep)، وتكوين قاع أو قمة اليوم الحقيقي (Judas Swing) ثم الانطلاق بالاتجاه الفعلي.
                </p>

                <button
                  onClick={() => handleBroadcastTelegram('KILLZONE', 'LONDON_OPEN')}
                  disabled={broadcastingId === 'LONDON_OPEN'}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>بث تنبيه افتتاح لندن الصباحي للتليجرام 📤</span>
                </button>
              </div>

              {/* Window 3: Rollover Warning */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <h3 className="font-extrabold text-sm sm:text-base text-rose-300">
                      3. فترة الركود وتدوير العقود اليومي (Rollover Dead Zone) 🌙
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40 w-fit">
                    12:00 منتصف الليل - 01:00 ص بتوقيت مكة (21:00 - 22:00 UTC)
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  <b>منطقة خطر واتساع سبريد:</b> الفترة الفاصلة بين إغلاق بورصة نيويورك وبداية التداولات الآسيوية الكاملة. تتسع فيها فوارق الأسعار (Spread Spikes) بشكل غير طبيعي لدى كافة البروكرز، وتفرض عمولات التبييت (Swap).
                </p>

                <button
                  onClick={() => handleBroadcastTelegram('KILLZONE', 'ROLLOVER')}
                  disabled={broadcastingId === 'ROLLOVER'}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>بث تحذير الرول أوفر واتساع السبريد للتليجرام ⚠️</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: HIGH-IMPACT ECONOMIC DECISIONS */}
          {activeTab === 'decisions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <Landmark className="w-5 h-5 text-rose-400" />
                  <span>دليل القرارات النقدية والبيانات الاقتصادية الكبرى (Red Folders)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  أهم المواعيد والأحداث التي تغير مسار الأسواق بالكامل. يمكنك مراجعة توجيهات إدارة المخاطر وبث أي تنبيه احترازي للأعضاء بنقرة واحدة.
                </p>
              </div>

              <div className="space-y-3">
                {MAJOR_ECONOMIC_DECISIONS.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{event.flag}</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                            <span>{event.titleAr}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {event.impact === 'EXTREME' ? 'شديد الخطورة ⚠️' : 'عالي التأثير 🔥'}
                            </span>
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {event.sourceAr} • عملة التأثير: <b className="text-cyan-300">{event.currency}</b>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleBroadcastTelegram('ECONOMIC_DECISION', event.id)}
                        disabled={broadcastingId === event.id}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 w-fit"
                      >
                        <Send className="w-3 h-3" />
                        <span>بث تنبيه القرار للتليجرام</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-400 block text-[10px]">الموعد المعتاد:</span>
                        <span className="font-bold text-amber-300">{event.timeScheduleAr}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">الأصول المتأثرة:</span>
                        <span className="font-bold text-cyan-300">{event.affectedAssets.join(' | ')}</span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
                      <div className="font-semibold text-rose-300">💡 التوجيه الاحترازي:</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{event.guidanceAr}</p>
                      <div className="text-[10px] text-slate-400 pt-1">
                        <b>المؤشرات المراقبة:</b> {event.keyMetricsAr}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WEEKEND */}
          {activeTab === 'weekend' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isWeekend ? 'bg-rose-950/20 border-rose-500/40' : 'bg-slate-950 border-slate-800'} space-y-3`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      قواعد إغلاق وافتتاح السوق الأسبوعي (Weekend Shield)
                    </h3>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${isWeekend ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}`}>
                    {isWeekend ? 'السوق في عطلة حالياً' : 'السوق مفتوح'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[10px]">موعد إغلاق الجمعة الأسبوعي:</span>
                    <span className="font-bold text-rose-300 text-sm">الجمعة 12:00 منتصف الليل بتوقيت مكة (21:00 UTC)</span>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">تغلق البنوك الأمريكية والأوروبية نهائياً حتى الأحد.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[10px]">موعد افتتاح الأحد الأسبوعي:</span>
                    <span className="font-bold text-emerald-300 text-sm">الأحد 12:00 منتصف الليل بتوقيت مكة (21:00 UTC)</span>
                    <p className="text-[10px] text-slate-400 font-sans mt-1">تفتتح جلسة سيدني وطوكيو وتعود السيولة تدريجياً.</p>
                  </div>
                </div>

                {/* Broadcast Weekend alerts */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleBroadcastTelegram('WEEKEND_CLOSE')}
                    disabled={broadcastingId === 'WEEKEND_CLOSE'}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>بث تنبيه إغلاق السوق الأسبوعي (الجمعة) 🔒</span>
                  </button>
                  <button
                    onClick={() => handleBroadcastTelegram('WEEKEND_OPEN')}
                    disabled={broadcastingId === 'WEEKEND_OPEN'}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>بث تنبيه افتتاح السوق الجديد (الأحد) 🚀</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HOLIDAYS */}
          {activeTab === 'holidays' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                قائمة العطلات الرسمية الكبرى للبنوك المركزية والبورصات العالمية (2025 - 2027). يُنصح بالحذر عند تداول السلع والعملات في هذه الأيام لضعف السيولة.
              </div>

              <div className="space-y-2.5">
                {GLOBAL_MARKET_HOLIDAYS.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-white text-xs sm:text-sm">{holiday.nameAr}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {holiday.date} • {holiday.impactedMarketsAr}
                      </div>
                      <p className="text-[11px] text-slate-300">{holiday.advisoryAr}</p>
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-300 shrink-0 w-fit">
                      {holiday.typeAr}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ALERTS & NOTIFICATIONS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {/* SL Silence Notice */}
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span>تحديث نظام التنبيهات المعتمد (بناءً على طلبك):</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <p>
                    ✅ <b>تم إلغاء رسائل ضرب وقف الخسارة (SL) نهائياً:</b> لن يتم إرسال أي إشعار سلبي بضرب الوقف على القناة بعد الآن.
                  </p>
                  <p>
                    ✅ <b>تم استبدالها برسائل قيمة مضافة:</b>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pr-2">
                    <li>إشعارات افتتاح وإغلاق جلسات السوق الأربع (طوكيو، لندن، نيويورك، سيدني).</li>
                    <li>إشعارات أفضل أوقات التداول (الفترة الذهبية London-NY Overlap).</li>
                    <li>تنبيهات مواعيد القرارات والأخبار الاقتصادية الكبرى (الفيدرالي، NFP، CPI، الفائدة).</li>
                    <li>تنبيهات إغلاق السوق الأسبوعي الجمعة وافتتاحه مساء الأحد.</li>
                  </ul>
                </div>
              </div>

              {/* Browser Notification Controls */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-extrabold text-sm text-white">إشعارات المتصفح الفورية:</h4>
                <p className="text-xs text-slate-400">
                  يمكنك السماح للمتصفح بإصدار تنبيهات صوتية وشاشية فور حدوث أي حدث في الجلسات أثناء فتح المنصة.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {notificationPermission === 'granted' ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>إشعارات المتصفح مفعلة بنجاح ✅</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestNotificationPermission}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      <span>السماح بإشعارات المتصفح</span>
                    </button>
                  )}

                  <button
                    onClick={handleSendTestNotification}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>تجربة تنبيه صوتي فوري</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 hidden sm:block">
            نظام متوافق مع معايير السيولة البنكية ونظام SOP ومربع 9 لجان.
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
