import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, HardDrive, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
    error?: string;
  };
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [savedSignals, setSavedSignals] = useState<TradeSignal[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const message = err instanceof Error ? err.message : 'فشل الاتصال بقاعدة البيانات';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDatabaseInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                قاعدة بيانات الصفقات (Turso Cloud)
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                  LibSQL 24/7
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                حفظ وأرشفة جميع الصفقات والإشارات اللحظية على السحابة بصورة مستمرة
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
          {/* Database Connection Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">معلومات الاتصال بالسحابة:</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {dbStatus?.status === 'connected' ? (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    متصل ونشط
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    جاري المزامنة
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/80 text-slate-300 break-all select-all flex items-center justify-between">
              <span>libsql://forex-trade-analysis-fadyezzaat.aws-eu-west-1.turso.io</span>
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 ml-2" />
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

          {/* Recent Signals Saved */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">آخر الصفقات المحفوظة في السحابة:</span>
              <button
                onClick={fetchDatabaseInfo}
                disabled={loading}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {savedSignals.length === 0 && !loading ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/50 border border-slate-800 text-slate-500 text-xs">
                لا توجد صفقات مخزنة بعد. يقوم سيرفر الـ 24/7 بحفظ أي إشارة مؤكدة تلقائياً بمجرد رصدها.
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
                          sig.status === 'CLOSED_PROFIT'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : sig.status === 'CLOSED_LOSS'
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
            محمية ومحفوظة سحابياً بنظام LibSQL الموزع
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
