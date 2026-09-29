import React, { useState, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Compass,
  DollarSign,
  Edit3,
  Filter,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { LiveFeedStatus, MarketTick, SopGatesEvaluation, SymbolConfig } from '../types';

type CategoryFilter = 'all' | 'majors' | 'crosses' | 'metals';
type StatusFilter = 'all' | 'perfect5' | 'buy' | 'sell' | 'watch';
type SortOption = 'default' | 'score' | 'change' | 'spread';

interface MarketWatchProps {
  symbols: SymbolConfig[];
  ticks: Record<string, MarketTick>;
  evaluations: Record<string, { evalLong: SopGatesEvaluation; evalShort: SopGatesEvaluation }>;
  selectedSymbolId: string;
  liveFeedStatus?: LiveFeedStatus;
  onSelectSymbol: (symbolId: string) => void;
  onInspectGann: (symbol: SymbolConfig) => void;
  onUpdateCustomPrice?: (symbolId: string, price: number) => void;
  onForceSync?: () => void;
}

const MAJOR_IDS = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD']);
const CROSS_IDS = new Set(['EURGBP', 'EURJPY', 'GBPJPY']);
const METAL_IDS = new Set(['XAUUSD', 'XAGUSD']);

export const MarketWatch: React.FC<MarketWatchProps> = ({
  symbols,
  ticks,
  evaluations,
  selectedSymbolId,
  liveFeedStatus,
  onSelectSymbol,
  onInspectGann,
  onUpdateCustomPrice,
  onForceSync,
}) => {
  const [calibratingSymbol, setCalibratingSymbol] = useState<SymbolConfig | null>(null);
  const [customPriceVal, setCustomPriceVal] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Smart Filtering & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Filter & Sort computation
  const filteredSymbols = useMemo(() => {
    return symbols
      .filter((sym) => {
        // 1. Search query (symbol, nameAr, nameEn, id)
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchesSym = sym.symbol.toLowerCase().includes(q);
          const matchesId = sym.id.toLowerCase().includes(q);
          const matchesAr = sym.nameAr.toLowerCase().includes(q);
          const matchesEn = sym.nameEn.toLowerCase().includes(q);
          if (!matchesSym && !matchesId && !matchesAr && !matchesEn) {
            return false;
          }
        }

        // 2. Category filter
        if (categoryFilter === 'majors' && !MAJOR_IDS.has(sym.id)) return false;
        if (categoryFilter === 'crosses' && !CROSS_IDS.has(sym.id)) return false;
        if (categoryFilter === 'metals' && !METAL_IDS.has(sym.id)) return false;

        // 3. Status filter
        const evals = evaluations[sym.id];
        const bestEval = evals
          ? evals.evalLong.score >= evals.evalShort.score
            ? evals.evalLong
            : evals.evalShort
          : null;

        if (statusFilter === 'perfect5') {
          if (!bestEval || bestEval.score < 5) return false;
        } else if (statusFilter === 'buy') {
          if (!bestEval || bestEval.direction !== 'BUY' || !bestEval.gate1_macroAndEma.passed) return false;
        } else if (statusFilter === 'sell') {
          if (!bestEval || bestEval.direction !== 'SELL' || !bestEval.gate1_macroAndEma.passed) return false;
        } else if (statusFilter === 'watch') {
          if (!bestEval || bestEval.score < 3) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          const evalA = evaluations[a.id];
          const evalB = evaluations[b.id];
          const scoreA = evalA ? Math.max(evalA.evalLong.score, evalA.evalShort.score) : 0;
          const scoreB = evalB ? Math.max(evalB.evalLong.score, evalB.evalShort.score) : 0;
          return scoreB - scoreA;
        }
        if (sortBy === 'change') {
          const tickA = ticks[a.id];
          const tickB = ticks[b.id];
          const changeA = tickA ? Math.abs(tickA.change24hPct) : 0;
          const changeB = tickB ? Math.abs(tickB.change24hPct) : 0;
          return changeB - changeA;
        }
        if (sortBy === 'spread') {
          const tickA = ticks[a.id];
          const tickB = ticks[b.id];
          const spA = tickA ? tickA.spreadPts : a.typicalSpreadPts;
          const spB = tickB ? tickB.spreadPts : b.typicalSpreadPts;
          return spA - spB;
        }
        return 0;
      });
  }, [symbols, searchQuery, categoryFilter, statusFilter, sortBy, evaluations, ticks]);

  const handleManualSync = async () => {
    if (!onForceSync || isSyncing) return;
    setIsSyncing(true);
    try {
      await onForceSync();
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  const handleOpenCalibrate = (e: React.MouseEvent, sym: SymbolConfig) => {
    e.stopPropagation();
    setCalibratingSymbol(sym);
    const tick = ticks[sym.id];
    const cur = tick ? ((tick.bid + tick.ask) / 2).toFixed(sym.digits) : sym.initialPrice.toFixed(sym.digits);
    setCustomPriceVal(cur);
    setSuccessMsg(null);
  };

  const handleApplyPrice = () => {
    if (!calibratingSymbol || !onUpdateCustomPrice) return;
    const num = parseFloat(customPriceVal);
    if (isNaN(num) || num <= 0) return;

    onUpdateCustomPrice(calibratingSymbol.id, num);
    setSuccessMsg(`تم تحديث سعر ${calibratingSymbol.symbol} بنجاح!`);
    setTimeout(() => {
      setCalibratingSymbol(null);
      setSuccessMsg(null);
    }, 900);
  };

  const handleResetToDefault = () => {
    if (!calibratingSymbol || !onUpdateCustomPrice) return;
    onUpdateCustomPrice(calibratingSymbol.id, calibratingSymbol.initialPrice);
    setCustomPriceVal(calibratingSymbol.initialPrice.toFixed(calibratingSymbol.digits));
    setSuccessMsg(`تمت استعادة السعر الافتراضي (${calibratingSymbol.initialPrice})`);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 1200);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Top Bar: Title & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-3 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <h2 className="text-sm sm:text-base font-extrabold text-white">
            مراقبة السوق اللحظية (Market Watch)
          </h2>
          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800 font-mono font-bold">
            {symbols.length} أصول نخبوية (جان & وايكوف)
          </span>
        </div>
        <div className="text-[11px] sm:text-xs text-slate-400">
          تحديث لحظي لأسعار العرض والطلب والسبريد وفلاتر جان
        </div>
      </div>

      {/* Cloud Real-Time Live Feed Banner (Zero-Setup / No MT5 required) */}
      <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-cyan-950/40 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                بث الأسعار الحية المباشرة (Cloud Feed)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[9px] sm:text-[10px] border border-emerald-500/40">
                لحظة بلحظة
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
              متصل تلقائياً بشبكة السيولة العالمية (Binance Spot + Interbank Forex) دون الحاجة لفتح أي تطبيق خارجي.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 text-xs font-mono w-full md:w-auto">
          {liveFeedStatus && (
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 bg-slate-950/70 border border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-lg w-full sm:w-auto">
              <div className="flex items-center gap-1 text-amber-400 text-[11px]">
                <span className="text-[10px] text-slate-400 font-sans">الذهب:</span>
                <span className="font-bold">${liveFeedStatus.goldSpot.toFixed(2)}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-200 text-[11px]">
                <span className="text-[10px] text-slate-400 font-sans">الفضة:</span>
                <span className="font-bold">${liveFeedStatus.silverSpot.toFixed(2)}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-cyan-400 text-[11px]">
                <span className="text-[10px] text-slate-500 font-sans">Ping:</span>
                <span className="font-bold">{liveFeedStatus.latencyMs}ms</span>
              </div>
            </div>
          )}

          {onForceSync && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 min-h-[38px] sm:min-h-auto"
              title="سحب آخر تحديث فوري لأسعار السوق العالمية"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جارِ التحديث...' : 'تحديث فوري'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Smart Symbol Filtering & Search Toolbar */}
      <div className="mb-4 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-3">
        {/* Top row: Search input & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالرمز أو اسم الأصل (مثال: XAU, EUR, ذهب, ين)..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-9 pl-8 py-2 sm:py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-500 hover:text-white cursor-pointer p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Count */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs w-full sm:w-auto">
            <span className="text-slate-400 text-[11px] hidden sm:inline">ترتيب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 sm:flex-initial bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer min-h-[36px]"
            >
              <option value="default">الترتيب الافتراضي</option>
              <option value="score">الأعلى توافقاً مع 5SOP</option>
              <option value="change">الأعلى تحركاً 24h %</option>
              <option value="spread">الأقل سبريد (Spread)</option>
            </select>

            <span className="bg-slate-800 text-slate-300 font-mono text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 shrink-0">
              {filteredSymbols.length}/{symbols.length}
            </span>
          </div>
        </div>

        {/* Bottom row: Category Tabs & Signal Status Pills (Horizontally scrollable on mobile) */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <span className="text-slate-500 text-[11px] font-bold ml-1 shrink-0">التصنيف:</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] sm:text-xs ${
                categoryFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الكل ({symbols.length})
            </button>
            <button
              onClick={() => setCategoryFilter('majors')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] sm:text-xs ${
                categoryFilter === 'majors'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الرئيسية (7)
            </button>
            <button
              onClick={() => setCategoryFilter('crosses')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] sm:text-xs ${
                categoryFilter === 'crosses'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              التقاطعات (3)
            </button>
            <button
              onClick={() => setCategoryFilter('metals')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-[11px] sm:text-xs ${
                categoryFilter === 'metals'
                  ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                  : 'bg-slate-900 text-amber-300/80 hover:text-amber-200 border border-slate-800'
              }`}
            >
              المعادن (2)
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <span className="text-slate-500 text-[11px] font-bold ml-1 shrink-0">الحالة:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-200 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              الجميع
            </button>
            <button
              onClick={() => setStatusFilter('perfect5')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'perfect5'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-emerald-950/40 text-emerald-300 hover:text-white border border-emerald-500/30'
              }`}
            >
              ⭐ 5/5 مكتملة
            </button>
            <button
              onClick={() => setStatusFilter('buy')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'buy'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-cyan-950/40 text-cyan-300 hover:text-white border border-cyan-500/30'
              }`}
            >
              🟢 فرص شراء
            </button>
            <button
              onClick={() => setStatusFilter('sell')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'sell'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'bg-rose-950/40 text-rose-300 hover:text-white border border-rose-500/30'
              }`}
            >
              🔴 فرص بيع
            </button>
            <button
              onClick={() => setStatusFilter('watch')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'watch'
                  ? 'bg-purple-500 text-white font-bold'
                  : 'bg-purple-950/40 text-purple-300 hover:text-white border border-purple-500/30'
              }`}
            >
              👁️ للمراقبة
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Symbol Cards */}
      {filteredSymbols.length === 0 ? (
        <div className="py-12 px-4 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
          <Filter className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">لا توجد أصول مطابقة لمعايير البحث الحالية</h4>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            جرّب تغيير كلمات البحث أو إعادة تعيين الفلاتر لعرض جميع أصول الفوركس والذهب.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
              setSortBy('default');
            }}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            إعادة تعيين جميع الفلاتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredSymbols.map((sym) => {
            const tick = ticks[sym.id];
            const evals = evaluations[sym.id];
            const isSelected = sym.id === selectedSymbolId;

            const bestEval = evals
              ? evals.evalLong.score >= evals.evalShort.score
                ? evals.evalLong
                : evals.evalShort
              : null;

            const hasSignal = bestEval && bestEval.score >= 4 && bestEval.gate1_macroAndEma.passed;
          const isLong = bestEval ? bestEval.direction === 'BUY' : true;
          const isMetal = sym.category === 'metal';
          const isGold = sym.id === 'XAUUSD';

          return (
            <div
              key={sym.id}
              onClick={() => onSelectSymbol(sym.id)}
              className={`relative group rounded-xl p-3.5 border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-950/70 hover:bg-slate-800/50 border-slate-800/90 hover:border-slate-700'
              } ${
                hasSignal
                  ? isLong
                    ? 'ring-1 ring-emerald-500/60'
                    : 'ring-1 ring-rose-500/60'
                  : ''
              }`}
            >
              {/* Card Header: Symbol & Name */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      isGold
                        ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/30'
                        : isMetal
                        ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-cyan-300 border border-slate-700'
                    }`}
                  >
                    {isGold ? 'Au' : isMetal ? 'Ag' : sym.symbol.split('/')[0]}
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5">
                      {sym.symbol}
                      {isGold && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 font-bold border border-amber-500/50">
                          ذهب فوري
                        </span>
                      )}
                      {!isGold && isMetal && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-200 font-bold border border-slate-600">
                          فضة
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">
                      {sym.nameAr}
                    </div>
                  </div>
                </div>

                {/* Macro Bias Indicator & Calibrate button */}
                <div className="flex items-center gap-1">
                  {onUpdateCustomPrice && (
                    <button
                      onClick={(e) => handleOpenCalibrate(e, sym)}
                      className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                      title="معايرة سعر الأصل طبقاً لوسيطك (Broker Quote)"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}

                  {bestEval && (
                    <div
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                        bestEval.gate1_macroAndEma.passed
                          ? isLong
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={bestEval.gate1_macroAndEma.detail}
                    >
                      {bestEval.gate1_macroAndEma.passed ? (
                        isLong ? (
                          <>
                            <TrendingUp className="w-2.5 h-2.5" />
                            <span>صاعد</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-2.5 h-2.5" />
                            <span>هابط</span>
                          </>
                        )
                      ) : (
                        <span>حيادي</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Price Row (Bid & Ask & Spread) */}
              <div className="flex items-baseline justify-between mb-2.5 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/60 font-mono">
                <div>
                  <div className="text-[10px] text-slate-500">طلب (Ask)</div>
                  <div className="text-xs font-bold text-slate-200">
                    {tick ? tick.ask.toFixed(sym.digits) : sym.initialPrice.toFixed(sym.digits)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[10px] text-slate-500">السبريد</div>
                  <div className="text-[11px] font-semibold text-cyan-400">
                    {tick ? tick.spreadPts : sym.typicalSpreadPts} <span className="text-[9px]">نقطة</span>
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-[10px] text-slate-500">عرض (Bid)</div>
                  <div className="text-xs font-bold text-slate-200">
                    {tick ? tick.bid.toFixed(sym.digits) : sym.initialPrice.toFixed(sym.digits)}
                  </div>
                </div>
              </div>

              {/* 5-SOP Confluence Gates Bar */}
              {bestEval && (
                <div className="mb-2.5">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span>مصفوفة 5SOP:</span>
                      <span className="font-bold text-white">{bestEval.score}/5</span>
                    </span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        hasSignal
                          ? isLong
                            ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                            : 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                          : bestEval.score >= 3
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {hasSignal
                        ? isLong
                          ? '⚡ إشارة شراء'
                          : '⚡ إشارة بيع'
                        : bestEval.score >= 3
                        ? 'قريب من الهدف'
                        : 'انتظار التوافق'}
                    </span>
                  </div>

                  {/* 5 Gates Dots */}
                  <div className="grid grid-cols-5 gap-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        bestEval.gate1_macroAndEma.passed ? 'bg-emerald-400' : 'bg-slate-800'
                      }`}
                      title="البوابة 1: الاتجاه الكلي اليومي و200 EMA"
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        bestEval.gate2_gannSq9.passed ? 'bg-cyan-400' : 'bg-slate-800'
                      }`}
                      title="البوابة 2: توافق زوايا مربع التسعة لجان"
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        bestEval.gate3_gann1x1AndCycles.passed ? 'bg-blue-400' : 'bg-slate-800'
                      }`}
                      title="البوابة 3: زاوية 1x1 ودورات جان التوافقية"
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        bestEval.gate4_rsi.passed ? 'bg-purple-400' : 'bg-slate-800'
                      }`}
                      title="البوابة 4: فلتر زخم RSI النظيف"
                    />
                    <div
                      className={`h-1.5 rounded-full ${
                        bestEval.gate5_priceActionAndBos.passed ? 'bg-amber-400' : 'bg-slate-800'
                      }`}
                      title="البوابة 5: ذيل الرفض والفوليوم وMicro BOS"
                    />
                  </div>
                </div>
              )}

              {/* Card Footer: Action Button */}
              <div className="pt-2 border-t border-slate-800/60">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectGann(sym);
                  }}
                  className="w-full min-h-[38px] py-1.5 px-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-700/80 cursor-pointer active:scale-98"
                  title="فاحص زوايا جان ومربع التسعة"
                >
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>فاحص زوايا جان ومربع 9</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Price Calibration Dialog Modal */}
      {calibratingSymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    معايرة وتعديل سعر {calibratingSymbol.symbol}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {calibratingSymbol.nameAr} • مطابقة وسيطك اللحظي
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCalibratingSymbol(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {calibratingSymbol.id === 'XAUUSD' && (
              <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <span>سعر الذهب الفوري (Spot Gold 2026):</span>
                  <span className="font-mono text-amber-300 font-extrabold text-sm">$4,348.50</span>
                </div>
                <p className="text-[11px] text-amber-300/80">
                  نطاق تداول الذهب اليومي الحالي يتراوح بين $4,295.20 و $4,403.20 للأونصة. يمكنك كتابة أي سعر تريده بدقة ليتطابق مع منصة ميتاتريدر (MT4/MT5) الخاصة بك.
                </p>
              </div>
            )}

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  أدخل السعر الجديد (Price):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={calibratingSymbol.point}
                    value={customPriceVal}
                    onChange={(e) => setCustomPriceVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-base focus:outline-none focus:border-cyan-500"
                    placeholder={`مثال: ${calibratingSymbol.initialPrice}`}
                  />
                  <div className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                    {calibratingSymbol.quoteCurrency}
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons for Gold */}
              {calibratingSymbol.id === 'XAUUSD' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCustomPriceVal('4348.50')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-mono"
                  >
                    السعر الفوري المباشر ($4,348.50)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPriceVal('4400.00')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                  >
                    مستوى 4,400$
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPriceVal('4300.00')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono"
                  >
                    مستوى 4,300$
                  </button>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleApplyPrice}
                className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-cyan-600/20"
              >
                تطبيق السعر وإعادة الحساب فوراً
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs"
                title="استعادة السعر القياسي"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
