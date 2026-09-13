import React from 'react';
import { CheckCircle2, Download, FileSpreadsheet, History, XCircle } from 'lucide-react';
import { TradeSignal } from '../types';

interface SignalHistoryTableProps {
  history: TradeSignal[];
  onExportCSV: () => void;
}

export const SignalHistoryTable: React.FC<SignalHistoryTableProps> = ({
  history,
  onExportCSV,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white">سجل إشارات وصفقات التداول</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {history.length}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              توثيق مستويات الدخول، تأمين الوقف (BE)، ونقاط الأرباح الأربعة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onExportCSV}
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-auto cursor-pointer"
            title="تصدير ملف التحليلات بصيغة CSV المتوافقة مع الإكسبرت"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>تصدير CSV (SOP_Gann_Analytics_V42.csv)</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full min-w-[720px] text-right text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold whitespace-nowrap">
              <th className="py-2.5 px-3">التوقيت</th>
              <th className="py-2.5 px-3">الأصل</th>
              <th className="py-2.5 px-3">النوع</th>
              <th className="py-2.5 px-3">النمط</th>
              <th className="py-2.5 px-3">الدخول</th>
              <th className="py-2.5 px-3">الوقف الهيكلي</th>
              <th className="py-2.5 px-3">TP1 (0.5R)</th>
              <th className="py-2.5 px-3">TP4 (1:2)</th>
              <th className="py-2.5 px-3">مصفوفة 5SOP</th>
              <th className="py-2.5 px-3">الحالة</th>
              <th className="py-2.5 px-3 text-left">تليجرام</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono whitespace-nowrap">
            {history.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-slate-500 font-sans">
                  لم يتم تسجيل صفقات سابقة بعد
                </td>
              </tr>
            ) : (
              history.map((sig) => {
                const isBuy = sig.orderType.includes('BUY');

                return (
                  <tr key={sig.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {sig.timeFormatted}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white font-sans">
                      {sig.symbol}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBuy
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {sig.orderType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-sans text-[11px]">
                      تداول يومي (Intraday #1001)
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{sig.entryPrice}</td>
                    <td className="py-2.5 px-3 text-rose-300">{sig.slPrice}</td>
                    <td className="py-2.5 px-3 text-emerald-400">{sig.tpTargets.tp1}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">
                      {sig.tpTargets.tp4}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold text-[10px]">
                        {sig.score}/5
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300">
                        {sig.status === 'ACTIVE' ? 'نشطة' : sig.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-left font-sans">
                      {sig.telegramSent ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>مرسلة</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">معلقة</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
