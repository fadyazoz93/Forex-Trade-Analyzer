import React, { useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  DollarSign,
  Percent,
  Shield,
  ShieldAlert,
  X,
} from 'lucide-react';
import { TARGET_SYMBOLS } from '../data/symbols';
import { AccountRiskSettings, SymbolConfig } from '../types';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccountRiskSettings;
  onSaveSettings: (settings: AccountRiskSettings) => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [balance, setBalance] = useState(settings.balance);
  const [riskPercent, setRiskPercent] = useState(settings.riskPercent);
  const [maxRiskDollars, setMaxRiskDollars] = useState(settings.maxRiskDollars);
  const [selectedSymbolId, setSelectedSymbolId] = useState('XAUUSD');
  const [customSlPips, setCustomSlPips] = useState(30);
  const [useStrictMicroLot, setUseStrictMicroLot] = useState(settings.useStrictMicroLot ?? true);

  if (!isOpen) return null;

  const currentSym = TARGET_SYMBOLS.find((s) => s.id === selectedSymbolId) || TARGET_SYMBOLS[0];

  // Dynamic lot computation
  const riskDollars = Math.min(balance * (riskPercent / 100), maxRiskDollars);
  const slDistance = customSlPips * currentSym.point * 10;
  const slPoints = customSlPips * 10;

  let calculatedLot = 0.01;
  if (!useStrictMicroLot) {
    if (slPoints > 0) {
      calculatedLot =
        riskDollars / (slPoints * (currentSym.tickValue / currentSym.tickSize * currentSym.point));
    }
    if (currentSym.category === 'metal') {
      calculatedLot *= 0.30; // 30% reduction for metals
    }
    calculatedLot = Math.min(settings.maxLotPerTrade, Math.max(currentSym.minLot, calculatedLot));
    calculatedLot = Number(calculatedLot.toFixed(2));
  } else {
    calculatedLot = 0.01;
  }

  const pointValPerLot = (currentSym.tickValue / currentSym.tickSize) * currentSym.point;
  const actualRiskForLot = (slPoints * pointValPerLot * calculatedLot).toFixed(2);

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      balance,
      riskPercent,
      maxRiskDollars,
      useStrictMicroLot,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                محرك إدارة رأس المال واللوت الديناميكي
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                قواعد شركات التمويل (Prop-Firm Guard & Circuit Breaker)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                رصيد الحساب ($ Balance)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-500 text-sm font-mono">
                  $
                </span>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                نسبة المخاطرة لكل صفقة (%)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-500 text-sm font-mono">
                  %
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                أقصى خسارة دولار للصفقة (Hard Cap)
              </label>
              <input
                type="number"
                value={maxRiskDollars}
                onChange={(e) => setMaxRiskDollars(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                فحص حساب العقد للأصل
              </label>
              <select
                value={selectedSymbolId}
                onChange={(e) => setSelectedSymbolId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                {TARGET_SYMBOLS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.symbol} ({s.nameAr})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Strict Micro-Lot 0.01 Shield Switch */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <strong className="text-xs text-white block">
                  درع تثبيت 0.01 Lot الصارم (Strict Micro-Lot Guard)
                </strong>
                <p className="text-[11px] text-slate-400">
                  قفل العقد عند 0.01 لوت وحظر الأحجام الكبيرة لحماية الحساب من أي تراجع مفاجئ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseStrictMicroLot(!useStrictMicroLot)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer ${
                useStrictMicroLot
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {useStrictMicroLot ? '✓ مفعل (0.01 صارم)' : 'غير مفعل (حساب تلقائي)'}
            </button>
          </div>

          {/* Results Display */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>المبلغ المعرض للمخاطرة:</span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                ${useStrictMicroLot ? actualRiskForLot : riskDollars.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>نمط العقد المعتمد:</span>
              <span className="font-bold text-cyan-400">
                {useStrictMicroLot ? '🔒 0.01 Micro-Lot مقفل للأمان' : 'ديناميكي معادل للمخاطرة'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">حجم العقد المحسوب (Lot):</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {calculatedLot} Lot
              </span>
            </div>
          </div>

          {/* Prop Firm Safeguards */}
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">قاطع الخسارة اليومي (Circuit Breaker 5%):</span>
                <span className="mr-1">
                  إيقاف فوري للتداول عند بلوغ تراجع اليوم -${(balance * 0.05).toFixed(2)}.
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">قاطع الأرباح اليومي (Target Lock 10%):</span>
                <span className="mr-1">
                  تأمين وقفل أرباح اليوم تلقائياً عند تحقيق +${(balance * 0.10).toFixed(2)}.
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-cyan-600/20"
            >
              حفظ إعدادات المخاطرة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
