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
} from 'lucide-react';
import {
  MarketHoursStatus,
  SESSIONS_LIST,
  GLOBAL_MARKET_HOLIDAYS,
  formatUtcToLocalHour,
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
  const [activeTab, setActiveTab] = useState<'sessions' | 'weekend' | 'holidays' | 'alerts'>('sessions');
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [testAlertSent, setTestAlertSent] = useState<boolean>(false);

  if (!isOpen) return null;

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
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  مواعيد الجلسات والعطلات الرسمية
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${notification.badgeClass}`}>
                  {notification.badgeText}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                الجدول الزمني لجلسات التداول العالمية بتوقيت UTC والمحلي، ومواعيد إغلاق وافتتاح عطلة نهاية الأسبوع
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

        {/* Live Market Status Ticker */}
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
              <span>توقيت جهازك:</span>
              <span className="font-bold text-white">{status.localTimeFormatted}</span>
            </div>
          </div>
        </div>

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
            onClick={() => setActiveTab('weekend')}
            className={`py-3 px-3 sm:px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'weekend'
                ? 'border-rose-400 text-rose-300 bg-rose-500/5'
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
            <span>تقويم العطلات الرسمية</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-mono">
              {GLOBAL_MARKET_HOLIDAYS.length}
            </span>
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
            <span>إعدادات الإشعارات والتنبيه</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {/* Golden Overlap Highlight */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-extrabold text-amber-300">
                        فترة التداخل الذهبي (لندن + نيويورك ⚡ London-NY Overlap)
                      </h4>
                      {isGoldenOverlap && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold animate-pulse">
                          نشط الآن
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                      من الساعة <span className="font-mono font-bold text-white">12:00</span> حتى <span className="font-mono font-bold text-white">16:00 UTC</span> (توقيت محلي: <span className="font-mono font-bold text-cyan-300">{formatUtcToLocalHour(12)} - {formatUtcToLocalHour(16)}</span>). تشهد أكبر سيولة يومية عالمية وأسرع تحقيق للأهداف.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {SESSIONS_LIST.map((session) => {
                  const isOpenNow = isMarketOpen && status.activeSessions.some((s) => s.id === session.id);
                  const localOpen = formatUtcToLocalHour(session.openUtcHour);
                  const localClose = formatUtcToLocalHour(session.closeUtcHour);

                  return (
                    <div
                      key={session.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isOpenNow
                          ? 'bg-slate-800/80 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{session.flag}</span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-white">
                              {session.nameAr}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {session.nameEn} • {session.city}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            isOpenNow
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {isOpenNow ? 'مفتوحة الآن' : 'مغلقة'}
                        </span>
                      </div>

                      {/* Time Details */}
                      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-xs font-mono mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans text-[11px]">التوقيت العالمي (UTC):</span>
                          <span className="font-bold text-white">
                            {session.openUtcHour.toString().padStart(2, '0')}:00 - {session.closeUtcHour.toString().padStart(2, '0')}:00 UTC
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-sans text-[11px]">التوقيت المحلي لجهازك:</span>
                          <span className="font-bold text-cyan-300">
                            {localOpen} - {localClose}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                        {session.descriptionAr}
                      </p>

                      {/* Best Pairs & Liquidity */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-400">
                          <span>مستوى السيولة:</span>
                          <span className="font-bold text-amber-300">{session.liquidity}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">أفضل الأزواج:</span>
                          <div className="flex items-center gap-1">
                            {session.bestSymbols.map((sym) => (
                              <span
                                key={sym}
                                className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-200 font-mono text-[10px]"
                              >
                                {sym}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: WEEKEND */}
          {activeTab === 'weekend' && (
            <div className="space-y-4">
              {/* Weekend Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isWeekend
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isWeekend ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {isWeekend ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">
                      {isWeekend ? 'السوق حالياً في عطلة نهاية الأسبوع' : 'السوق مفتوح ضمن أيام التداول الأسبوعية'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {isWeekend
                        ? `يفتتح السوق رسمياً يوم الأحد في تمام 21:00 UTC مع بداية جلسة سيدني (متبقي: ${status.weekendOpensIn}).`
                        : `العطلة الأسبوعية القادمة تبدأ يوم الجمعة الساعة 21:00 UTC (متبقي: ${status.weekendClosesIn}).`}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-center shrink-0">
                  <span className="text-[10px] text-slate-400 block">
                    {isWeekend ? 'الوقت المتبقي للافتتاح' : 'الوقت حتى الإغلاق'}
                  </span>
                  <span className="text-sm font-mono font-black text-cyan-300">
                    {isWeekend ? status.weekendOpensIn : status.weekendClosesIn}
                  </span>
                </div>
              </div>

              {/* Exact Weekend Rules and Schedule */}
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-3">
                <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>المواعيد الدقيقة لعطلة نهاية الأسبوع في سوق الفوركس والمعادن</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-rose-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>موعد إغلاق السوق (Friday Close):</span>
                    </div>
                    <div className="text-white font-mono text-sm font-bold">
                      يوم الجمعة 21:00 UTC (5:00 PM EST)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      تتوقف منصات التداول وتغلق البنوك الأمريكية والأوروبية صفقات الأسبوع.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>موعد افتتاح السوق (Sunday Open):</span>
                    </div>
                    <div className="text-white font-mono text-sm font-bold">
                      يوم الأحد 21:00 UTC (5:00 PM EST)
                    </div>
                    <p className="text-[11px] text-slate-400">
                      تستأنف التداولات العالمية مع افتتاح بورصات ويلينغتون (نيوزيلندا) وسيدني (أستراليا).
                    </p>
                  </div>
                </div>
              </div>

              {/* Prop Firm & Risk Warnings */}
              <div className="bg-slate-950/80 rounded-xl border border-slate-850 p-4 space-y-2.5">
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>إرشادات إدارة المخاطر وقواعد شركات التمويل (Prop-Firm Weekend Holding):</span>
                </h4>

                <ul className="text-[11px] sm:text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                  <li>
                    <strong className="text-white">تجنب فجوات الأسعار (Weekend Price Gaps):</strong> الأحداث السياسية والاقتصادية خلال السبت والأحد قد تفتح السوق على فجوة سعرية تقفز فوق أمر وقف الخسارة (SL) مسببة انزلاقاً سعرياً (Slippage).
                  </li>
                  <li>
                    <strong className="text-white">اتساع السبريد (Spread Widening):</strong> عند افتتاح السوق مساء الأحد من 21:00 حتى 23:30 UTC، يتسع السبريد بشكل مضاعف لدى البنوك نتيجة قلة السيولة الأولية.
                  </li>
                  <li>
                    <strong className="text-white">فلتر الجمعة (Friday After 13:00 UTC):</strong> نظام التحليل لدينا يقوم بحظر إدخال إشارات جديدة بعد الساعة 13:00 UTC يوم الجمعة لتأمين الأرباح وعدم الوقوع في فخ حركة نهاية الأسبوع.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: HOLIDAYS CALENDAR */}
          {activeTab === 'holidays' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <p className="text-slate-300">
                  قائمة العطلات الرسمية للبنوك المركزية والبورصات العالمية، مع بيان تأثيرها على السيولة وأسعار الذهب والعملات:
                </p>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    إغلاق كامل
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    إغلاق مبكر
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    سيولة منخفضة
                  </span>
                </div>
              </div>

              {/* Holidays Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3 whitespace-nowrap">التاريخ</th>
                      <th className="p-3 whitespace-nowrap">اسم العطلة</th>
                      <th className="p-3 whitespace-nowrap">نوع التأثير</th>
                      <th className="p-3 whitespace-nowrap">الأسواق المتأثرة</th>
                      <th className="p-3">الإرشادات الفنية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                    {GLOBAL_MARKET_HOLIDAYS.map((holiday) => {
                      const isUpcoming = status.upcomingHolidays.some((u) => u.holiday.id === holiday.id);
                      let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                      if (holiday.type === 'CLOSED') badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                      if (holiday.type === 'EARLY_CLOSE') badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                      return (
                        <tr
                          key={holiday.id}
                          className={`hover:bg-slate-850/50 transition-colors ${
                            isUpcoming ? 'bg-cyan-500/5' : ''
                          }`}
                        >
                          <td className="p-3 font-mono text-cyan-300 font-semibold whitespace-nowrap">
                            {holiday.date}
                          </td>
                          <td className="p-3 font-bold text-white whitespace-nowrap">
                            <div>{holiday.nameAr}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{holiday.nameEn}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {holiday.typeAr}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 whitespace-nowrap">
                            {holiday.impactedMarketsAr}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px] min-w-[220px]">
                            {holiday.advisoryAr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ALERTS & NOTIFICATIONS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span>تنبيهات المتصفح لمواعيد عمل الجلسات والعطلات (Desktop & Mobile Alerts)</span>
                </h4>
                <p className="text-xs text-slate-300">
                  يمكنك تفعيل إشعارات المتصفح حتى تتلقى تنبيهاً فورياً عند افتتاح أو إغلاق جلسة تداول جديدة، أو عند حلول عطلة نهاية الأسبوع والعودة منها.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
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
                    <span>تجربة تنبيه صوتي وإشعار فوري</span>
                  </button>
                </div>

                {testAlertSent && (
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>تم إطلاق التنبيه الصوتي وإشعار الجلسة بنجاح!</span>
                  </div>
                )}
              </div>

              {/* Telegram Auto-Send integration notes */}
              <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-sky-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <span>تزامن بوت التليجرام مع الجلسات والعطلات:</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  السيرفر المبرمج في الخلفية على Railway لا يقوم بإرسال إشارات على قناة التليجرام أثناء عطلة نهاية الأسبوع لعدم وجود تسعير بين البنوك، ويستأنف الفحص التلقائي على مدار الساعة بمجرد افتتاح جلسة سيدني مساء الأحد (21:00 UTC).
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 hidden sm:block">
            نظام تداول متوافق مع معايير السيولة البنكية ومصفوفة SOP ومربع 9 لجان.
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
