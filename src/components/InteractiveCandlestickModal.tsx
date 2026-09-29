import React, { useState, useMemo, useRef } from 'react';
import {
  Compass,
  Layers,
  Maximize2,
  Minimize2,
  TrendingDown,
  TrendingUp,
  X,
  Eye,
  EyeOff,
  BarChart3,
  Sliders,
  Target,
  Shield,
  Activity,
  ArrowRight,
  Crosshair,
} from 'lucide-react';
import {
  calculateSquareOf9Target,
  GANN_ANGLES,
  getLatestGannSwingAnchor,
} from '../services/gannEngine';
import { calculateEMA, calculateATR } from '../services/indicators';
import { getCandles, getLatestTick } from '../services/marketDataFeed';
import { Candle, SopGatesEvaluation, SymbolConfig, Timeframe, TradeSignal } from '../types';

interface InteractiveCandlestickModalProps {
  symbol: SymbolConfig;
  isOpen: boolean;
  onClose: () => void;
  evaluation?: { evalLong: SopGatesEvaluation; evalShort: SopGatesEvaluation };
  signal?: TradeSignal;
  onOpenRiskCalc?: () => void;
}

export const InteractiveCandlestickModal: React.FC<InteractiveCandlestickModalProps> = ({
  symbol,
  isOpen,
  onClose,
  evaluation,
  signal,
  onOpenRiskCalc,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('H4');
  const [showSq9, setShowSq9] = useState<boolean>(true);
  const [showGann1x1, setShowGann1x1] = useState<boolean>(true);
  const [showEmas, setShowEmas] = useState<boolean>(true);
  const [showSignalLevels, setShowSignalLevels] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(45);

  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const tick = getLatestTick(symbol.id);
  const currentPrice = tick ? (tick.bid + tick.ask) / 2 : symbol.initialPrice;
  const spreadPts = tick ? tick.spreadPts : symbol.typicalSpreadPts;

  // Retrieve multi-tf candles
  const allCandles = getCandles(symbol.id, timeframe);
  const candles = allCandles.slice(-visibleCount);

  // EMA Calculations
  const ema50Values = useMemo(() => calculateEMA(allCandles, 50).slice(-visibleCount), [allCandles, visibleCount]);
  const ema200Values = useMemo(() => calculateEMA(allCandles, 200).slice(-visibleCount), [allCandles, visibleCount]);

  // Active signal details (if any)
  const activeEval = evaluation
    ? evaluation.evalLong.score >= evaluation.evalShort.score
      ? evaluation.evalLong
      : evaluation.evalShort
    : null;

  // Gann Anchor & Slope calculation
  const h4Candles = getCandles(symbol.id, 'H4');
  const anchor = useMemo(() => {
    const isBullish = activeEval ? activeEval.direction === 'BUY' : true;
    const lowAnchor = getLatestGannSwingAnchor(h4Candles, 2, true, 50);
    const highAnchor = getLatestGannSwingAnchor(h4Candles, 2, false, 50);

    if (isBullish && lowAnchor.found) {
      return { found: true, price: lowAnchor.price, isHigh: false };
    }
    if (!isBullish && highAnchor.found) {
      return { found: true, price: highAnchor.price, isHigh: true };
    }
    return lowAnchor.found
      ? { found: true, price: lowAnchor.price, isHigh: false }
      : { found: highAnchor.found, price: highAnchor.price, isHigh: true };
  }, [h4Candles, activeEval]);

  const trendAtr = useMemo(() => calculateATR(h4Candles, 14), [h4Candles]);
  const dynamicSlope = trendAtr / 48.0;

  // Square of 9 key levels (Resistances & Supports)
  const sq9Levels = useMemo(() => {
    return [45, 90, 180, 270, 360].map((angle) => ({
      angle,
      res: calculateSquareOf9Target(currentPrice, angle, true),
      sup: calculateSquareOf9Target(currentPrice, angle, false),
    }));
  }, [currentPrice]);

  // Chart dimensions & scaling
  const chartWidth = 900;
  const mainHeight = 340;
  const volumeHeight = showVolume ? 70 : 0;
  const totalHeight = mainHeight + volumeHeight;
  const paddingRight = 85; // space for price Y-axis
  const paddingLeft = 15;
  const plotWidth = chartWidth - paddingRight - paddingLeft;

  // Min / Max price calculation including padding
  const minCandle = candles.reduce((min, c) => Math.min(min, c.low), currentPrice * 0.99);
  const maxCandle = candles.reduce((max, c) => Math.max(max, c.high), currentPrice * 1.01);
  const priceBuffer = Math.max(symbol.point * 40, (maxCandle - minCandle) * 0.08);
  const minPrice = minCandle - priceBuffer;
  const maxPrice = maxCandle + priceBuffer;
  const priceRange = Math.max(0.00001, maxPrice - minPrice);

  // Volume scale
  const maxVolume = Math.max(1, ...candles.map((c) => c.volume || 1000));

  const getY = (price: number) => {
    return mainHeight - ((price - minPrice) / priceRange) * mainHeight;
  };

  const getX = (index: number) => {
    if (candles.length <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (candles.length - 1)) * plotWidth;
  };

  const candleSpacing = plotWidth / Math.max(1, candles.length);
  const candleBodyWidth = Math.max(2, candleSpacing * 0.65);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleX = chartWidth / rect.width;
    const chartMouseX = mouseX * scaleX;

    const relativeX = chartMouseX - paddingLeft;
    if (relativeX < 0 || relativeX > plotWidth) {
      setHoveredCandle(null);
      setHoverPos(null);
      return;
    }

    const index = Math.min(
      candles.length - 1,
      Math.max(0, Math.round((relativeX / plotWidth) * (candles.length - 1)))
    );

    setHoveredCandle(candles[index]);
    setHoverPos({ x: getX(index), y: mouseY * (totalHeight / rect.height) });
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    const scaleX = chartWidth / rect.width;
    const chartTouchX = touchX * scaleX;

    const relativeX = chartTouchX - paddingLeft;
    if (relativeX < 0 || relativeX > plotWidth) {
      setHoveredCandle(null);
      setHoverPos(null);
      return;
    }

    const index = Math.min(
      candles.length - 1,
      Math.max(0, Math.round((relativeX / plotWidth) * (candles.length - 1)))
    );

    setHoveredCandle(candles[index]);
    setHoverPos({ x: getX(index), y: touchY * (totalHeight / rect.height) });
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
    setHoverPos(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden sm:overflow-y-auto">
      <div
        ref={containerRef}
        className={`bg-slate-900 border-0 sm:border border-slate-700 rounded-none sm:rounded-3xl w-full flex flex-col shadow-2xl transition-all h-[100dvh] sm:h-auto ${
          isFullscreen ? 'max-w-full h-full rounded-none' : 'max-w-6xl sm:max-h-[94vh]'
        }`}
      >
        {/* Modal Top Bar */}
        <div className="bg-slate-900/95 border-b border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-cyan-500/20 shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">{symbol.symbol}</h2>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                    5SOP Gann
                  </span>
                  {signal && (
                    <span
                      className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        signal.orderType.includes('BUY')
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {signal.orderType}
                    </span>
                  )}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span>{symbol.nameAr}</span>
                  <span>•</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {currentPrice.toFixed(symbol.digits)}
                  </span>
                  <span>•</span>
                  <span>السبريد: {spreadPts} نقطة</span>
                </div>
              </div>
            </div>

            {/* Mobile close button on top right */}
            <button
              onClick={onClose}
              className="sm:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Timeframe selector & Modal Actions */}
          <div className="flex items-center justify-between sm:justify-end flex-wrap gap-2 w-full sm:w-auto">
            {/* Timeframe Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['D1', 'H4', 'M15', 'M5'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    timeframe === tf
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={
                    tf === 'D1'
                      ? 'الاتجاه الكلي اليومي D1 EMA 50'
                      : tf === 'H4'
                      ? 'موجات جان وزاوية 1x1 و EMA 200'
                      : tf === 'M15'
                      ? 'فلتر زخم RSI 14 النظيف'
                      : 'كسر الهيكل والدخول النظيف M5 BOS'
                  }
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Candle Count Zoom Controls */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setVisibleCount((c) => Math.min(80, c + 15))}
                className="px-2 py-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
                title="إظهار شموع أكثر (تصغير)"
              >
                -
              </button>
              <span className="px-1 text-slate-300">{visibleCount}</span>
              <button
                onClick={() => setVisibleCount((c) => Math.max(25, c - 15))}
                className="px-2 py-0.5 rounded text-slate-400 hover:text-white cursor-pointer"
                title="إظهار شموع أقل (تكبير)"
              >
                +
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer hidden sm:block"
              title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Desktop Close Button */}
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overlays Toggle Strip (Horizontally scrollable on mobile) */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0 text-[11px] sm:text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              التراكبات:
            </span>

            {/* Sq9 Toggle */}
            <button
              onClick={() => setShowSq9(!showSq9)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs ${
                showSq9
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>مربع 9</span>
            </button>

            {/* Gann 1x1 Ray Toggle */}
            <button
              onClick={() => setShowGann1x1(!showGann1x1)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs ${
                showGann1x1
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>زاوية 1x1</span>
            </button>

            {/* EMAs Toggle */}
            <button
              onClick={() => setShowEmas(!showEmas)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs ${
                showEmas
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <span>EMA 50/200</span>
            </button>

            {/* Signal Levels Toggle */}
            {(signal || activeEval) && (
              <button
                onClick={() => setShowSignalLevels(!showSignalLevels)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs ${
                  showSignalLevels
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                <Target className="w-3 h-3" />
                <span>المستويات</span>
              </button>
            )}

            {/* Volume Toggle */}
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs ${
                showVolume
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <span>الفوليوم</span>
            </button>
          </div>

          {/* Real-time OHLC inspection badge */}
          {hoveredCandle ? (
            <div className="flex items-center gap-2.5 font-mono text-[11px] text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700 overflow-x-auto whitespace-nowrap scrollbar-none">
              <span className="text-slate-400">
                {new Date(hoveredCandle.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>O: <strong className="text-white">{hoveredCandle.open.toFixed(symbol.digits)}</strong></span>
              <span>H: <strong className="text-emerald-400">{hoveredCandle.high.toFixed(symbol.digits)}</strong></span>
              <span>L: <strong className="text-rose-400">{hoveredCandle.low.toFixed(symbol.digits)}</strong></span>
              <span>C: <strong className="text-cyan-400">{hoveredCandle.close.toFixed(symbol.digits)}</strong></span>
              {showVolume && <span>V: <strong className="text-slate-300">{hoveredCandle.volume}</strong></span>}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              <span>مرر أو اسحب لعرض بيانات OHLC ومستويات جان</span>
            </div>
          )}
        </div>

        {/* Main Chart Canvas Area (SVG Engine) */}
        <div className="relative flex-1 p-2 sm:p-4 bg-slate-950 overflow-hidden select-none touch-none">
          <svg
            viewBox={`0 0 ${chartWidth} ${totalHeight}`}
            className="w-full h-full min-h-[320px] sm:min-h-[380px] max-h-[520px] bg-slate-950 rounded-xl"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
          >
            <defs>
              <linearGradient id="bullishVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="bearishVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Price Tags */}
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((ratio) => {
              const y = mainHeight * ratio;
              const priceAtY = maxPrice - ratio * priceRange;
              return (
                <g key={ratio}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    strokeOpacity="0.7"
                  />
                  <text
                    x={chartWidth - paddingRight + 8}
                    y={y + 3}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {priceAtY.toFixed(symbol.digits)}
                  </text>
                </g>
              );
            })}

            {/* Square of 9 Levels Overlay */}
            {showSq9 &&
              sq9Levels.map((lvl) => {
                const yRes = getY(lvl.res);
                const ySup = getY(lvl.sup);
                return (
                  <g key={lvl.angle}>
                    {/* Resistance line */}
                    {yRes >= 0 && yRes <= mainHeight && (
                      <>
                        <line
                          x1={paddingLeft}
                          y1={yRes}
                          x2={chartWidth - paddingRight}
                          y2={yRes}
                          stroke="#f59e0b"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                          strokeOpacity="0.7"
                        />
                        <rect
                          x={chartWidth - paddingRight + 4}
                          y={yRes - 8}
                          width={paddingRight - 8}
                          height="16"
                          rx="3"
                          fill="#78350f"
                          fillOpacity="0.6"
                        />
                        <text
                          x={chartWidth - paddingRight + 7}
                          y={yRes + 3}
                          fill="#fcd34d"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          R{lvl.angle}° {lvl.res.toFixed(symbol.digits)}
                        </text>
                      </>
                    )}

                    {/* Support line */}
                    {ySup >= 0 && ySup <= mainHeight && (
                      <>
                        <line
                          x1={paddingLeft}
                          y1={ySup}
                          x2={chartWidth - paddingRight}
                          y2={ySup}
                          stroke="#10b981"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                          strokeOpacity="0.7"
                        />
                        <rect
                          x={chartWidth - paddingRight + 4}
                          y={ySup - 8}
                          width={paddingRight - 8}
                          height="16"
                          rx="3"
                          fill="#064e3b"
                          fillOpacity="0.6"
                        />
                        <text
                          x={chartWidth - paddingRight + 7}
                          y={ySup + 3}
                          fill="#6ee7b7"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          S{lvl.angle}° {lvl.sup.toFixed(symbol.digits)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

            {/* Gann 1x1 Dynamic Slope Ray */}
            {showGann1x1 && anchor.found && (
              <g>
                {(() => {
                  const startY = getY(anchor.price);
                  const endPrice = anchor.isHigh
                    ? anchor.price - candles.length * dynamicSlope
                    : anchor.price + candles.length * dynamicSlope;
                  const endY = getY(endPrice);

                  return (
                    <>
                      <line
                        x1={paddingLeft}
                        y1={startY}
                        x2={chartWidth - paddingRight}
                        y2={endY}
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="6 3"
                        strokeOpacity="0.8"
                      />
                      <text
                        x={paddingLeft + 10}
                        y={startY - 6}
                        fill="#06b6d4"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        زاوية جان 1x1 ({anchor.isHigh ? 'قمة H4' : 'قاع H4'})
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {/* EMA 50 Line */}
            {showEmas && ema50Values.length > 1 && (
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.6"
                strokeOpacity="0.85"
                points={ema50Values
                  .map((val, idx) => `${getX(idx)},${getY(val)}`)
                  .join(' ')}
              />
            )}

            {/* EMA 200 Line */}
            {showEmas && ema200Values.length > 1 && (
              <polyline
                fill="none"
                stroke="#eab308"
                strokeWidth="1.8"
                strokeOpacity="0.85"
                points={ema200Values
                  .map((val, idx) => `${getX(idx)},${getY(val)}`)
                  .join(' ')}
              />
            )}

            {/* Signal Levels Overlay: Entry, Stop Loss & Take Profits */}
            {showSignalLevels && signal && (
              <g>
                {/* Entry Price */}
                {(() => {
                  const y = getY(signal.entryPrice);
                  return (
                    y >= 0 && y <= mainHeight && (
                      <g>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke="#38bdf8"
                          strokeWidth="1.8"
                        />
                        <rect
                          x={chartWidth - paddingRight + 4}
                          y={y - 8}
                          width={paddingRight - 8}
                          height="16"
                          rx="3"
                          fill="#0284c7"
                        />
                        <text
                          x={chartWidth - paddingRight + 8}
                          y={y + 3}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          دخول: {signal.entryPrice.toFixed(symbol.digits)}
                        </text>
                      </g>
                    )
                  );
                })()}

                {/* Stop Loss (SL) */}
                {(() => {
                  const y = getY(signal.slPrice);
                  return (
                    y >= 0 && y <= mainHeight && (
                      <g>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke="#f43f5e"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                        <rect
                          x={chartWidth - paddingRight + 4}
                          y={y - 8}
                          width={paddingRight - 8}
                          height="16"
                          rx="3"
                          fill="#be123c"
                        />
                        <text
                          x={chartWidth - paddingRight + 8}
                          y={y + 3}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          وقف SL: {signal.slPrice.toFixed(symbol.digits)}
                        </text>
                      </g>
                    )
                  );
                })()}

                {/* Target 1 (TP1) */}
                {(() => {
                  const y = getY(signal.tpTargets.tp1);
                  return (
                    y >= 0 && y <= mainHeight && (
                      <g>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke="#10b981"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={chartWidth - paddingRight + 8}
                          y={y + 3}
                          fill="#34d399"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          TP1: {signal.tpTargets.tp1.toFixed(symbol.digits)}
                        </text>
                      </g>
                    )
                  );
                })()}

                {/* Target 4 (TP4 - Full 1:2 R:R) */}
                {(() => {
                  const y = getY(signal.tpTargets.tp4);
                  return (
                    y >= 0 && y <= mainHeight && (
                      <g>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={chartWidth - paddingRight}
                          y2={y}
                          stroke="#10b981"
                          strokeWidth="1.8"
                        />
                        <rect
                          x={chartWidth - paddingRight + 4}
                          y={y - 8}
                          width={paddingRight - 8}
                          height="16"
                          rx="3"
                          fill="#047857"
                        />
                        <text
                          x={chartWidth - paddingRight + 8}
                          y={y + 3}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          TP4 (1:2): {signal.tpTargets.tp4.toFixed(symbol.digits)}
                        </text>
                      </g>
                    )
                  );
                })()}
              </g>
            )}

            {/* Candlesticks Layer */}
            {candles.map((c, idx) => {
              const x = getX(idx);
              const isUp = c.close >= c.open;
              const yHigh = getY(c.high);
              const yLow = getY(c.low);
              const yOpen = getY(c.open);
              const yClose = getY(c.close);

              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(1.8, Math.abs(yOpen - yClose));
              const color = isUp ? '#10b981' : '#f43f5e';

              return (
                <g key={c.time} className="transition-opacity">
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  {/* Body */}
                  <rect
                    x={x - candleBodyWidth / 2}
                    y={bodyTop}
                    width={candleBodyWidth}
                    height={bodyHeight}
                    rx="1"
                    fill={color}
                    stroke={color}
                    strokeWidth="0.5"
                  />
                </g>
              );
            })}

            {/* Volume Sub-Chart Layer */}
            {showVolume && (
              <g>
                <line
                  x1={paddingLeft}
                  y1={mainHeight}
                  x2={chartWidth - paddingRight}
                  y2={mainHeight}
                  stroke="#334155"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft + 5}
                  y={mainHeight + 14}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  الحجم (Volume)
                </text>

                {candles.map((c, idx) => {
                  const x = getX(idx);
                  const isUp = c.close >= c.open;
                  const volH = Math.max(2, (c.volume / maxVolume) * (volumeHeight - 15));
                  const volY = totalHeight - volH;
                  const fill = isUp ? 'url(#bullishVol)' : 'url(#bearishVol)';

                  return (
                    <rect
                      key={`vol_${c.time}`}
                      x={x - candleBodyWidth / 2}
                      y={volY}
                      width={candleBodyWidth}
                      height={volH}
                      rx="0.5"
                      fill={fill}
                    />
                  );
                })}
              </g>
            )}

            {/* Current Tick Live Price Horizontal Line */}
            {(() => {
              const curY = getY(currentPrice);
              return (
                curY >= 0 && curY <= mainHeight && (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={curY}
                      x2={chartWidth - paddingRight}
                      y2={curY}
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                    <circle cx={chartWidth - paddingRight} cy={curY} r="3" fill="#38bdf8" />
                    <rect
                      x={chartWidth - paddingRight + 4}
                      y={curY - 8}
                      width={paddingRight - 8}
                      height="16"
                      rx="3"
                      fill="#0284c7"
                    />
                    <text
                      x={chartWidth - paddingRight + 8}
                      y={curY + 3}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {currentPrice.toFixed(symbol.digits)}
                    </text>
                  </g>
                )
              );
            })()}

            {/* Crosshair Cursor on Hover */}
            {hoverPos && (
              <g>
                {/* Vertical crosshair line */}
                <line
                  x1={hoverPos.x}
                  y1={0}
                  x2={hoverPos.x}
                  y2={totalHeight}
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  strokeOpacity="0.8"
                />
                {/* Horizontal crosshair line */}
                <line
                  x1={paddingLeft}
                  y1={hoverPos.y}
                  x2={chartWidth - paddingRight}
                  y2={hoverPos.y}
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                  strokeOpacity="0.8"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Bottom Technical Indicators & SOP Alignment Bar */}
        <div className="bg-slate-900/95 border-t border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-slate-400 font-bold flex items-center gap-1.5 shrink-0">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              جاهزية قواعد 5SOP:
            </span>

            {activeEval ? (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                    activeEval.score === 5
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : activeEval.score >= 4
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {activeEval.score}/5 بوابات
                </span>

                <span className="text-slate-400 font-sans hidden md:inline">
                  • ماكرو D1: {activeEval.gate1_macroAndEma?.passed ? '✓ اجتاز' : '✗ مخالف'}
                </span>
                <span className="text-slate-400 font-sans hidden md:inline">
                  • مربع 9: {activeEval.gate2_gannSq9?.passed ? '✓ متوافق' : '✗ غير متوافق'}
                </span>
                <span className="text-slate-400 font-sans hidden md:inline">
                  • زاوية 1x1: {activeEval.gate3_gann1x1AndCycles?.passed ? '✓ سليمة' : '✗ خارجها'}
                </span>
                <span className="text-slate-400 font-sans hidden md:inline">
                  • كسر الهيكل: {activeEval.gate5_priceActionAndBos?.passed ? '✓ تحقق' : '✗ لم يتحقق'}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 text-[11px]">جاري مسح البوابات على الشموع الحالية...</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            {onOpenRiskCalc && (
              <button
                onClick={onOpenRiskCalc}
                className="flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px] sm:min-h-auto text-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>حاسبة اللوت</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial justify-center px-4 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer min-h-[40px] sm:min-h-auto text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
