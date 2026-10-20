import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, HardDrive, ShieldCheck, ArrowUpRight, ArrowDownRight, Trash2, Cpu, Calendar, Sparkles } from 'lucide-react';
import { TradeSignal } from '../types';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DbStatusResponse {
  status: 'connected' | 'error';
  databaseUrl: string;
  stats: {
    totalCount: number;
    activeCount: number;
    tpCount: number;
    slCount: number;
    storageType?: string;
    lastWeeklyCleanupTime?: number;
    weeklyCleanupEnabled?: boolean;
    error?: string;
  };
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [weeklyCleaning, setWeeklyCleaning] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [savedSignals, setSavedSignals] = useState<TradeSignal[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch Status
      const statusRes = await fetch('/api/database/status');
      const statusData = await statusRes.json();
      setDbStatus(statusData);

      // Fetch Saved Signals
      const signalsRes = await fetch('/api/database/signals?limit=50');
      const signalsData = await signalsRes.json();
      if (signalsData.success) {
        setSavedSignals(signalsData.signals || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل الاتصال بمحرك التخزين المحلي';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyCleanup = async () => {
    if (!window.confirm('هل تريد تشغيل التنظيف الأسبوعي الآن؟ سيتم مسح صفقات الأسبوع الماضي المنتهية والاحتفاظ بالصفقات النشطة الحالية فقط.')) {
      return;
    }
    setWeeklyCleaning(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/database/weekly-clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preserveActive: true }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchDatabaseInfo();
        setSuccessMsg(`تم إتمام التنظيف الأسبوعي بنجاح! تم حذف ${data.removedCount} صفقة منتهية والاحتفاظ بـ ${data.retainedCount} صفقة نشطة.`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setErrorMsg(data.error || 'فشل تشغيل التنظيف الأسبوعي');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تنفيذ عملية التنظيف الأسبوعي';
      setErrorMsg(message);
    } finally {
      setWeeklyCleaning(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('هل أنت متأكد من تفريغ سجل الصفقات بالكامل لتوفير كامل مساحة التخزين؟')) {
      return;
    }
    setClearing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/database/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSavedSignals([]);
        if (dbStatus) {
          setDbStatus({
            ...dbStatus,
            stats: {
              ...dbStatus.stats,
              totalCount: 0,
              activeCount: 0,
              tpCount: 0,
              slCount: 0,
            },
          });
        }
        setSuccessMsg('تم تفريغ مساحة التخزين ومسح السجل بالكامل بنجاح!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || 'فشل تفريغ التخزين');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تنفيذ عملية التفريغ';
      setErrorMsg(message);
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDatabaseInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lastCleanupDate = dbStatus?.stats.lastWeeklyCleanupTime
    ? new Date(dbStatus.stats.lastWeeklyCleanupTime).toLocaleString('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'يتم تلقائياً في عطلة نهاية الأسبوع القادمة';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                سجل صفقات التخزين المحلي السريع
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  تم إلغاء Turso • مسح أسبوعي تلقائي
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                حفظ ومعالجة محلية فورية فائقة السرعة مع صيانة دورية أسبوعية تلقائية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Weekly Maintenance Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-950/80 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">نظام المسح والتنظيف الأسبوعي للبيانات:</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  مفعّل تلقائياً كل نهاية أسبوع
                </span>
              </div>

              <button
                onClick={handleWeeklyCleanup}
                disabled={weeklyCleaning}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-900/50"
                title="مسح صفقات الأسبوع الماضي المنتهية والاحتفاظ بالصفقات النشطة"
              >
                <Sparkles className={`w-3.5 h-3.5 ${weeklyCleaning ? 'animate-spin' : ''}`} />
                <span>{weeklyCleaning ? 'جاري التنظيف...' : 'تنظيف أسبوعي الآن'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-300 space-y-1">
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-400">•</span>
                <span>
                  <strong>آلية العمل:</strong> يقوم السيرفر تلقائياً مع إغلاق سوق الفوركس أسبوعياً (مساء الجمعة / السبت) بتفريغ الصفقات القديمة المنتهية، ويحتفظ بأي صفقات نشطة حالياً، لتوفير المساحة وتجهيز المنصة لأسبوع التداول الجديد.
                </span>
              </p>
              <p className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                <span>آخر تنفيذ أسبوعي: {lastCleanupDate}</span>
              </p>
            </div>
          </div>

          {/* Database Connection Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">حالة وحدة التخزين:</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  محلي نشط (0 ميجابايت استهلاك سحابي)
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/80 text-slate-300 break-all select-all flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                local://in-memory-engine (Capped rolling cache)
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">إجمالي الصفقات</span>
              <span className="text-lg font-black text-white font-mono">
                {dbStatus?.stats.totalCount ?? savedSignals.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/50 text-center">
              <span className="text-[10px] text-cyan-300 block mb-1">الصفقات النشطة</span>
              <span className="text-lg font-black text-cyan-400 font-mono">
                {dbStatus?.stats.activeCount ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-center">
              <span className="text-[10px] text-emerald-300 block mb-1">أصابت الأهداف</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {dbStatus?.stats.tpCount ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 text-center">
              <span className="text-[10px] text-rose-300 block mb-1">ضربت الوقف</span>
              <span className="text-lg font-black text-rose-400 font-mono">
                {dbStatus?.stats.slCount ?? 0}
              </span>
            </div>
          </div>

          {/* Recent Signals Saved & Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">آخر الصفقات المخزنة محلياً:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearDatabase}
                  disabled={clearing || savedSignals.length === 0}
                  className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-30 flex items-center gap-1 transition-colors cursor-pointer px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20"
                  title="تفريغ السجل بالكامل وتصفيره"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح كلي</span>
                </button>
                <button
                  onClick={fetchDatabaseInfo}
                  disabled={loading}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>
              </div>
            </div>

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {savedSignals.length === 0 && !loading ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 text-xs">
                السجل فارغ حالياً. يقوم السيرفر بحفظ الصفقات المؤكدة الجديدة تلقائياً في الذاكرة المحلية الخفيفة.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {savedSignals.map((sig) => (
                  <div
                    key={sig.id}
                    className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                          sig.orderType === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {sig.orderType === 'BUY' ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          {sig.symbol}
                          <span className="text-[10px] text-slate-400 font-normal">
                            @ {sig.entryPrice.toFixed(sig.symbol.includes('JPY') ? 3 : 5)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          TP4: {sig.tpTargets?.tp4?.toFixed(sig.symbol.includes('JPY') ? 3 : 5)} • SL: {sig.slPrice.toFixed(sig.symbol.includes('JPY') ? 3 : 5)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          sig.status === 'TP1_HIT' ||
                          sig.status === 'TP2_HIT' ||
                          sig.status === 'TP3_HIT' ||
                          sig.status === 'TP4_HIT'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : sig.status === 'SL_HIT'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {sig.status}
                      </span>
                      <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                        {sig.timeFormatted?.split(' ')[1] || new Date(sig.time).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 text-xs">
          <span className="text-slate-400 text-[11px]">
            نظام تخزين محلي خفيف ومُجدول أسبوعياً لحفظ المساحة
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
