import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Radio,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { TradeSignal } from '../types';
import { formatSignalTelegramMessage } from '../services/telegramService';

interface SignalFeedProps {
  signals: TradeSignal[];
  onSendTelegram: (signal: TradeSignal) => Promise<void>;
  isSendingTelegram: boolean;
  onSelectSignalForInspection?: (signal: TradeSignal) => void;
  onOpenChartForSignal?: (signal: TradeSignal) => void;
  isAudioOn?: boolean;
  onToggleAudio?: () => void;
  tickCount?: number;
}

export const SignalFeed: React.FC<SignalFeedProps> = ({
  signals,
  onSendTelegram,
  isSendingTelegram,
  onSelectSignalForInspection,
  onOpenChartForSignal,
  isAudioOn = true,
  onToggleAudio,
  tickCount = 0,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedGatesId, setExpandedGatesId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleCopy = (signal: TradeSignal) => {
    const text = formatSignalTelegramMessage(signal, false);
    navigator.clipboard.writeText(text);
    setCopiedId(signal.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendTelegram = async (signal: TradeSignal) => {
    setSendingId(signal.id);
    await onSendTelegram(signal);
    setSendingId(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Header bar with Real-time Streaming status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5 sm:mt-0">
            <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-white flex flex-wrap items-center gap-2">
              <span>شريط إشارات التداول اللحظية</span>
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {signals.length} إشارة نشطة
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>تحديث On-Tick فوري</span>
              <span>•</span>
              <span>مصفوفة 5SOP ومربع 9 لجان وتقسيم 1:2 R:R</span>
            </p>
          </div>
        </div>

        {/* Real-time Indicator & Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {onToggleAudio && (
            <button
              onClick={onToggleAudio}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[38px] cursor-pointer ${
                isAudioOn
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={isAudioOn ? 'التنبيه الصوتي اللحظي نشط' : 'التنبيه الصوتي معطل'}
            >
              {isAudioOn ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-[11px] sm:text-xs">
                {isAudioOn ? 'صوت نشط' : 'صامت'}
              </span>
            </button>
          )}

          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 min-h-[38px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-sans text-slate-400">Ping:</span>
            <span>&lt; 30ms</span>
          </div>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            جاري فحص السوق لحظياً على كل تيك (On-Tick Scanner Active)
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            يراقب المحرك اللحظي أزواج العملات الـ 10 بالإضافة للذهب والفضة. يتم اقتناص الإشارة فور اكتمال 4 بوابات على الأقل (مع شرط اتجاه Daily Macro ومربع التسعة).
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/30 font-medium">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>بث الإشارات متصل ونشط لحظياً • يتم الالتقاط فور حدوث التوافق</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signals.map((signal) => {
            const isBuy = signal.orderType.includes('BUY');
            const isExpanded = expandedGatesId === signal.id;
            const isSending = sendingId === signal.id;
            const livePips = signal.livePips ?? 0;
            const livePnL = signal.livePnL ?? 0;
            const isProfit = livePips >= 0;
            const currentPrice = signal.currentPrice || signal.entryPrice;

            // Target progress calculation (0 to 100%)
            const totalTargetDistance = Math.abs(signal.tpTargets.tp4 - signal.entryPrice);
            const currentTravelDistance = isBuy
              ? Math.max(0, currentPrice - signal.entryPrice)
              : Math.max(0, signal.entryPrice - currentPrice);
            const progressPct = Math.min(100, Math.max(0, Math.round((currentTravelDistance / totalTargetDistance) * 100)));

            return (
              <div
                key={signal.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all bg-slate-950/95 relative overflow-hidden ${
                  isBuy
                    ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/60'
                    : 'border-rose-500/40 shadow-lg shadow-rose-500/5 hover:border-rose-500/60'
                }`}
              >
                {/* Real-time Glowing Corner Pulse */}
                <div
                  className={`absolute top-0 left-0 w-24 h-24 blur-2xl opacity-15 rounded-full pointer-events-none ${
                    isBuy ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />

                {/* Signal Card Top Bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md ${
                        isBuy ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {isBuy ? (
                        <ArrowUpRight className="w-6 h-6" />
                      ) : (
                        <ArrowDownRight className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-white">
                          {signal.symbol}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-extrabold border ${
                            isBuy
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {signal.orderType}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                          Intraday #1001
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{signal.timeFormatted}</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-semibold">
                          توافق: {signal.score}/5 SOP
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          لحظي
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Floating P&L and Pips Meter */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 font-mono">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                          isProfit
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {isProfit ? `+${livePips}` : livePips} نقطة
                      </span>
                    </div>
                    <div
                      className={`text-sm font-extrabold font-mono mt-0.5 ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isProfit ? `+$${livePnL}` : `-$${Math.abs(livePnL)}`}
                    </div>
                  </div>
                </div>

                {/* Real-time Live Price & Break-Even Banner */}
                <div className="mb-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs text-slate-400">السعر المباشر الآن:</span>
                    <span className="text-sm font-black font-mono text-white tracking-wider">
                      {currentPrice}
                    </span>
                  </div>

                  {signal.breakEvenActive ? (
                    <div className="text-[11px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Break-Even نشط (الوقف مؤمّن على الدخول)</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-mono">
                      عقد مقترح: <span className="text-cyan-300 font-bold">{signal.lotSize} Lot</span>
                    </div>
                  )}
                </div>

                {/* Entry & Stop Loss Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono">
                    <div className="text-[11px] text-slate-400 mb-0.5">سعر الدخول المقترح</div>
                    <div className="text-sm sm:text-base font-black text-white">
                      {signal.entryPrice}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {signal.isLimit ? 'أمر معلق (Limit Order)' : 'تنفيذ فوري / ماركت'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono">
                    <div className="text-[11px] text-rose-400 mb-0.5 flex items-center justify-between">
                      <span>وقف الخسارة (الهيكلي)</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        -{signal.riskDistance.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-rose-300">
                      {signal.trailingSlPrice || signal.slPrice}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {signal.breakEvenActive ? 'نُقل لنقطة التعادل' : 'أسفل القاع الهيكلي + هامش ATR'}
                    </div>
                  </div>
                </div>

                {/* Target Progress Bar towards TP4 */}
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                    <span>مسار تحقيق الأهداف (Target Pipeline)</span>
                    <span className="text-cyan-400 font-bold">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-emerald-300 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* The 4 Quad Targets (1:2 R:R Structure) */}
                <div className="mb-3 p-3 rounded-xl bg-slate-900/95 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Target className="w-3.5 h-3.5" />
                      الأهداف الرباعية لمصفوفة جان (1:2 R:R)
                    </span>
                    <span className="text-[10px] text-slate-400">تقسيم 25% لكل هدف</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-center">
                    <div
                      className={`p-2 rounded-lg border transition-all ${
                        signal.highestTargetHit === 'TP1' || signal.highestTargetHit === 'TP2' || signal.highestTargetHit === 'TP3' || signal.highestTargetHit === 'TP4'
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <span>TP1 (0.5R)</span>
                        {(signal.highestTargetHit === 'TP1' || signal.highestTargetHit === 'TP2' || signal.highestTargetHit === 'TP3' || signal.highestTargetHit === 'TP4') && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-0.5">
                        {signal.tpTargets.tp1}
                      </div>
                      <div className="text-[9px] text-cyan-400 mt-0.5">نقل الوقف للدخول</div>
                    </div>

                    <div
                      className={`p-2 rounded-lg border transition-all ${
                        signal.highestTargetHit === 'TP2' || signal.highestTargetHit === 'TP3' || signal.highestTargetHit === 'TP4'
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <span>TP2 (1.0R)</span>
                        {(signal.highestTargetHit === 'TP2' || signal.highestTargetHit === 'TP3' || signal.highestTargetHit === 'TP4') && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-0.5">
                        {signal.tpTargets.tp2}
                      </div>
                      <div className="text-[9px] text-cyan-400 mt-0.5">قفل +0.5R</div>
                    </div>

                    <div
                      className={`p-2 rounded-lg border transition-all ${
                        signal.highestTargetHit === 'TP3' || signal.highestTargetHit === 'TP4'
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <span>TP3 (1.5R)</span>
                        {(signal.highestTargetHit === 'TP3' || signal.highestTargetHit === 'TP4') && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-xs font-black text-emerald-400 mt-0.5">
                        {signal.tpTargets.tp3}
                      </div>
                      <div className="text-[9px] text-cyan-400 mt-0.5">تأمين 75% + تريلنج</div>
                    </div>

                    <div
                      className={`p-2 rounded-lg border transition-all ${
                        signal.highestTargetHit === 'TP4'
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-emerald-500/30 text-slate-300'
                      }`}
                    >
                      <div className="text-[10px] text-emerald-300 flex items-center justify-center gap-1">
                        <span>TP4 (2.0R 1:2)</span>
                        {signal.highestTargetHit === 'TP4' && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-xs font-black text-emerald-300 mt-0.5">
                        {signal.tpTargets.tp4}
                      </div>
                      <div className="text-[9px] text-emerald-400 mt-0.5">الهدف النهائي الصلب</div>
                    </div>
                  </div>
                </div>

                {/* Collapsible 5-SOP Gates Details */}
                <div className="mb-3">
                  <button
                    onClick={() => setExpandedGatesId(isExpanded ? null : signal.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تفاصيل بوابات الـ 5SOP ومربع التسعة</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-800/60">
                        <span className="text-slate-400">
                          بوابة 1 (الاتجاه الكلي اليومي و200 EMA):
                        </span>
                        <span className="font-semibold text-emerald-400 text-right">
                          {signal.gates.gate1_macroAndEma.detail}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-800/60">
                        <span className="text-slate-400">بوابة 2 (مربع التسعة لجان Sq9):</span>
                        <span className="font-semibold text-cyan-400 text-right">
                          {signal.gates.gate2_gannSq9.detail}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-800/60">
                        <span className="text-slate-400">بوابة 3 (زاوية 1x1 ودورات جان):</span>
                        <span className="font-semibold text-blue-400 text-right">
                          {signal.gates.gate3_gann1x1AndCycles.detail}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-800/60">
                        <span className="text-slate-400">بوابة 4 (فلتر زخم RSI النظيف):</span>
                        <span className="font-semibold text-purple-400 text-right">
                          {signal.gates.gate4_rsi.detail}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400">بوابة 5 (السلوك السعري، الفوليوم وBOS):</span>
                        <span className="font-semibold text-amber-400 text-right">
                          {signal.gates.gate5_priceActionAndBos.detail}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions: Send to Telegram + View Interactive Chart + Copy */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleSendTelegram(signal)}
                    disabled={isSending || signal.telegramSent}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 min-h-[40px] cursor-pointer active:scale-98 ${
                      signal.telegramSent
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                    }`}
                  >
                    <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
                    <span>
                      {signal.telegramSent
                        ? 'تم الإرسال لتليجرام ✓'
                        : isSending
                        ? 'جاري الإرسال...'
                        : 'إرسال إلى تليجرام'}
                    </span>
                  </button>

                  {onOpenChartForSignal && (
                    <button
                      onClick={() => onOpenChartForSignal(signal)}
                      className="min-h-[40px] py-2 px-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 hover:text-white transition-colors border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      title="عرض شارت الشموع وتراكبات أهداف الصفقة"
                    >
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span className="hidden sm:inline">شارت الشموع</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCopy(signal)}
                    className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center justify-center cursor-pointer active:scale-98"
                    title="نسخ بيانات الإشارة"
                  >
                    {copiedId === signal.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
