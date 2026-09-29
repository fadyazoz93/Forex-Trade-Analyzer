import React, { useState } from 'react';
import {
  Compass,
  Layers,
  Maximize2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  calculateSquareOf9Target,
  GANN_ANGLES,
  getUniversalScaleFactor,
} from '../services/gannEngine';
import { calculateEMA } from '../services/indicators';
import { getCandles, getLatestTick } from '../services/marketDataFeed';
import { SopGatesEvaluation, SymbolConfig, Timeframe } from '../types';

interface GannModalProps {
  symbol: SymbolConfig;
  isOpen: boolean;
  onClose: () => void;
  evaluation?: { evalLong: SopGatesEvaluation; evalShort: SopGatesEvaluation };
}

export const GannModal: React.FC<GannModalProps> = ({
  symbol,
  isOpen,
  onClose,
  evaluation,
}) => {
  const [selectedTf, setSelectedTf] = useState<Timeframe>('H4');

  if (!isOpen) return null;

  const tick = getLatestTick(symbol.id);
  const currentPrice = tick ? (tick.bid + tick.ask) / 2 : symbol.initialPrice;
  const candles = getCandles(symbol.id, selectedTf);

  const factor = getUniversalScaleFactor(currentPrice);
  const normPrice = currentPrice * factor;
  const sqrtP = Math.sqrt(normPrice);

  // Compute key Square of 9 levels
  const sq9Levels = GANN_ANGLES.map((angle) => {
    const resLevel = calculateSquareOf9Target(currentPrice, angle, true);
    const supLevel = calculateSquareOf9Target(currentPrice, angle, false);
    return {
      angle,
      resistance: resLevel,
      support: supLevel,
    };
  });

  // Calculate EMA for chart
  const ema200 = calculateEMA(candles, selectedTf === 'D1' ? 50 : 200);

  // Simple SVG Chart data preparation
  const recentCandles = candles.slice(-40);
  const minPrice = recentCandles.reduce((min, c) => Math.min(min, c.low), currentPrice * 0.98);
  const maxPrice = recentCandles.reduce((max, c) => Math.max(max, c.high), currentPrice * 1.02);
  const priceRange = Math.max(0.0001, maxPrice - minPrice);

  const chartHeight = 220;
  const chartWidth = 560;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-3 sm:p-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shrink-0">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">{symbol.symbol}</h2>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                  مربع التسعة (Sq9)
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400">{symbol.nameAr} • {symbol.nameEn}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Summary Math Info Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono">
              <div className="text-[11px] text-slate-400">السعر اللحظي الحالي</div>
              <div className="text-sm sm:text-base font-black text-cyan-400">
                {currentPrice.toFixed(symbol.digits)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono">
              <div className="text-[11px] text-slate-400">معامل التطبيع الشامل</div>
              <div className="text-sm sm:text-base font-black text-white">
                ×{factor.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono">
              <div className="text-[11px] text-slate-400">جذر السعر المطبع (√P)</div>
              <div className="text-sm sm:text-base font-black text-amber-400">
                {sqrtP.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono">
              <div className="text-[11px] text-slate-400">التسامح الديناميكي (15%)</div>
              <div className="text-sm sm:text-base font-black text-emerald-400">
                {(symbol.point * 25).toFixed(symbol.digits)}
              </div>
            </div>
          </div>

          {/* Interactive Chart Section */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">
                  الرسم البياني الفني ومستويات الدعم والمقاومة لجان
                </span>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                {(['D1', 'H4', 'H1', 'M15', 'M5'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTf(tf)}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      selectedTf === tf
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Candlestick Chart */}
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-52 bg-slate-950/60 rounded-xl"
              >
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((ratio) => {
                  const y = chartHeight * ratio;
                  const priceAtY = maxPrice - ratio * priceRange;
                  return (
                    <g key={ratio}>
                      <line
                        x1="0"
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <text x="5" y={y - 4} fill="#64748b" fontSize="9" fontFamily="monospace">
                        {priceAtY.toFixed(symbol.digits)}
                      </text>
                    </g>
                  );
                })}

                {/* Candles */}
                {recentCandles.map((c, idx) => {
                  const candleWidth = (chartWidth - 40) / recentCandles.length;
                  const x = 30 + idx * candleWidth;
                  const isUp = c.close >= c.open;
                  const yHigh = getY(c.high);
                  const yLow = getY(c.low);
                  const yOpen = getY(c.open);
                  const yClose = getY(c.close);
                  const bodyTop = Math.min(yOpen, yClose);
                  const bodyHeight = Math.max(2, Math.abs(yOpen - yClose));
                  const color = isUp ? '#10b981' : '#f43f5e';

                  return (
                    <g key={idx}>
                      <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                      <rect
                        x={x - candleWidth * 0.35}
                        y={bodyTop}
                        width={candleWidth * 0.7}
                        height={bodyHeight}
                        fill={color}
                        rx="1"
                      />
                    </g>
                  );
                })}

                {/* Current Price Line */}
                <line
                  x1="0"
                  y1={getY(currentPrice)}
                  x2={chartWidth}
                  y2={getY(currentPrice)}
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
          </div>

          {/* Square of 9 Angles Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>مستويات زوايا جان لمربع التسعة (45° إلى 720°)</span>
              </h3>
              <span className="text-xs text-slate-400">محسوبة لحظياً بدقة رياضية متناهية</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {sq9Levels.map((lvl) => (
                <div
                  key={lvl.angle}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-cyan-400">{lvl.angle}°</span>
                    <span className="text-[10px] text-slate-500">
                      دورة {(lvl.angle / 360).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-rose-400 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> مقاومة:
                    </span>
                    <span className="font-bold text-slate-200">
                      {lvl.resistance.toFixed(symbol.digits)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" /> دعم:
                    </span>
                    <span className="font-bold text-slate-200">
                      {lvl.support.toFixed(symbol.digits)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
