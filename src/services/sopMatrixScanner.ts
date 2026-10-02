import { TARGET_SYMBOLS } from '../data/symbols';
import {
  Candle,
  EngineMode,
  GateStatus,
  MarketTick,
  QuadTargets,
  SopGatesEvaluation,
  SymbolConfig,
  TradeSignal,
} from '../types';
import {
  calculateSquareOf9Target,
  calculateStructuralSL,
  checkGannTimeCycle,
  checkSquareOf9Confluence,
  getLatestGannSwingAnchor,
} from './gannEngine';
import {
  calculateATR,
  calculateEMA,
  calculateRSI,
  checkCandleRejection,
  checkMicroBOS,
  checkVolumeSurge,
  isTrendSlopeHealthy,
} from './indicators';
import { getCandles, getLatestTick } from './marketDataFeed';
import { isWeekendMarketClosed } from './shieldMonitor';

export interface ScanOptions {
  engine?: EngineMode;
  scoreNeeded?: number;
  useHybridExecution?: boolean;
}

/**
 * Evaluates the 5 SOP Gates for a given symbol and candidate direction
 * Strictly executes Intraday Swing/Intraday logic (Scalping is completely disabled)
 */
export function evaluateSopGates(
  symbolConfig: SymbolConfig,
  engine: EngineMode = 'intraday',
  isLong: boolean,
  currentTick: MarketTick
): SopGatesEvaluation {
  const sym = symbolConfig;

  // Retrieve multi-timeframe candles:
  // D1 (Daily Macro Bias) -> H4 (Trend & Gann Anchor) -> M15 (Clean RSI Momentum) -> M5 (BOS Trigger)
  const d1Candles = getCandles(sym.id, 'D1');
  const h4Candles = getCandles(sym.id, 'H4');
  const m15Candles = getCandles(sym.id, 'M15');
  const m5Candles = getCandles(sym.id, 'M5');

  // Strictly Intraday timeframes for high probability and noise rejection
  const trendCandles = h4Candles;
  const gannAnchorCandles = h4Candles;
  const rsiCandles = m15Candles;
  const triggerCandles = m5Candles;

  const currentPrice = isLong ? currentTick.ask : currentTick.bid;

  // --- GATE 1: Daily Macro Bias (D1 EMA 50) + Higher TF Trend (H4 EMA 200) + Slope ---
  const d1Ema50 = calculateEMA(d1Candles, 50);
  const latestD1Close = d1Candles.length > 0 ? d1Candles[d1Candles.length - 1].close : currentPrice;
  const latestD1Ema = d1Ema50.length > 0 ? d1Ema50[d1Ema50.length - 1] : currentPrice;
  const dailyMacroOk = isLong ? latestD1Close >= latestD1Ema : latestD1Close <= latestD1Ema;

  const trendEma200 = calculateEMA(trendCandles, 200);
  const latestTrendEma = trendEma200.length > 0 ? trendEma200[trendEma200.length - 1] : currentPrice;
  const trendAboveEma = isLong ? currentPrice > latestTrendEma : currentPrice < latestTrendEma;
  const slopeHealthy = isTrendSlopeHealthy(trendEma200, sym.point, isLong, 2.0);

  const gate1Passed = dailyMacroOk && trendAboveEma && slopeHealthy;
  const gate1: GateStatus = {
    passed: gate1Passed,
    name: 'Daily Macro & 200 EMA Trend',
    nameAr: 'الاتجاه الكلي اليومي و200 EMA وميلان المسار',
    detail: isLong
      ? `D1 Close (${latestD1Close.toFixed(sym.digits)}) ≥ EMA50 (${latestD1Ema.toFixed(sym.digits)}), Trend > 200 EMA`
      : `D1 Close (${latestD1Close.toFixed(sym.digits)}) ≤ EMA50 (${latestD1Ema.toFixed(sym.digits)}), Trend < 200 EMA`,
    value: `${dailyMacroOk ? '✓ Macro' : '✗ Macro'} | ${trendAboveEma ? '✓ EMA200' : '✗ EMA200'} | ${slopeHealthy ? '✓ Slope' : '✗ Slope'}`,
  };

  // --- GATE 2: Gann Square of 9 Confluence (مربع التسعة متعدد الدورات) ---
  const anchor = getLatestGannSwingAnchor(gannAnchorCandles, 2, isLong, 50);
  let gate2Passed = false;
  let targetSq9Level = 0;
  let angleUsed = 0;

  if (anchor.found && ((isLong && currentPrice > anchor.price) || (!isLong && currentPrice < anchor.price))) {
    const sq9Res = checkSquareOf9Confluence(currentPrice, anchor.price, isLong, 0.15);
    gate2Passed = sq9Res.isConfluent;
    targetSq9Level = sq9Res.closestLevel;
    angleUsed = sq9Res.angle;
  }

  const gate2: GateStatus = {
    passed: gate2Passed,
    name: 'Gann Square of 9 Confluence',
    nameAr: 'توافق زوايا مربع التسعة لجان (Sq9)',
    detail: gate2Passed
      ? `تطابق سعري مع زاوية ${angleUsed}° لمربع التسعة عند المستوى ${targetSq9Level.toFixed(sym.digits)}`
      : `لا يوجد توافق لحظي مع زوايا مربع التسعة (نسبة التسامح 15%)`,
    value: gate2Passed ? `${angleUsed}° (${targetSq9Level.toFixed(sym.digits)})` : 'غير متوافق',
  };

  // --- GATE 3: Gann Dynamic 1x1 Slope & Harmonic Time Cycles ---
  const trendAtr = calculateATR(trendCandles, 14);
  const dynamicSlope = trendAtr / 48.0;
  const barsElapsed = anchor.found ? anchor.barsElapsed : 10;
  const expected1x1 = isLong
    ? anchor.price + barsElapsed * dynamicSlope
    : Math.max(0, anchor.price - barsElapsed * dynamicSlope);

  const priceNear1x1 = isLong
    ? currentPrice >= expected1x1 - currentPrice * 0.002
    : currentPrice <= expected1x1 + currentPrice * 0.002;

  const cycleOk = checkGannTimeCycle(barsElapsed, anchor.price || currentPrice);
  const gate3Passed = anchor.found && (priceNear1x1 || cycleOk);

  const gate3: GateStatus = {
    passed: gate3Passed,
    name: 'Gann 1x1 Slope & Harmonic Cycles',
    nameAr: 'مقياس زاوية جان 1x1 والدورات التوافقية (144)',
    detail: `شمعة الدورة: ${barsElapsed % 144} | خط الزاوية 1x1: ${expected1x1.toFixed(sym.digits)}`,
    value: `${priceNear1x1 ? '✓ زاوية 1x1' : '✗ زاوية 1x1'} | ${cycleOk ? '✓ دورة جان' : '✗ دورة'}`,
  };

  // --- GATE 4: RSI Momentum Filter (Clean Intraday Band) ---
  const rsiValue = calculateRSI(rsiCandles, 14);
  const gate4Passed = isLong ? rsiValue >= 32.0 && rsiValue <= 58.0 : rsiValue >= 42.0 && rsiValue <= 68.0;

  const gate4: GateStatus = {
    passed: gate4Passed,
    name: 'RSI Momentum Confirmation',
    nameAr: 'فلتر زخم RSI (النطاق النظيف للتداول اليومي)',
    detail: `قيمة RSI الحالية: ${rsiValue.toFixed(1)} (المطلوب اليومي: ${isLong ? '32-58' : '42-68'})`,
    value: `RSI = ${rsiValue.toFixed(1)}`,
  };

  // --- GATE 5: Clean Execution (Volume Surge + Wick Rejection + Micro BOS) ---
  const volOk = checkVolumeSurge(triggerCandles, 1.10);
  const lastCompletedBar = triggerCandles.length > 1 ? triggerCandles[triggerCandles.length - 2] : triggerCandles[0];
  const paOk = lastCompletedBar ? checkCandleRejection(lastCompletedBar, isLong, 0.18) : true;
  const bosOk = checkMicroBOS(triggerCandles, isLong);

  // Clean execution confirmed if structure breaks with volume or rejection wick (at least 2 confirmations)
  const gate5Passed = (bosOk && (volOk || paOk)) || (volOk && paOk);
  const gate5: GateStatus = {
    passed: gate5Passed,
    name: 'Volume Surge, Wick Rejection & Micro BOS',
    nameAr: 'تأكيد السلوك السعري، الفوليوم وكسر الهيكل المصغر (Micro BOS)',
    detail: `فوليوم متفوق: ${volOk ? 'نعم' : 'لا'} | ذيل رفض: ${paOk ? 'نعم' : 'لا'} | كسر هيكل: ${bosOk ? 'نعم' : 'لا'}`,
    value: `${volOk ? '✓ Vol' : '✗ Vol'} | ${paOk ? '✓ Wick' : '✗ Wick'} | ${bosOk ? '✓ BOS' : '✗ BOS'}`,
  };

  // Total Confluence Score
  const score =
    (gate1Passed ? 1 : 0) +
    (gate2Passed ? 1 : 0) +
    (gate3Passed ? 1 : 0) +
    (gate4Passed ? 1 : 0) +
    (gate5Passed ? 1 : 0);

  // Stop loss and risk distance calculation
  const atrTrigger = calculateATR(rsiCandles, 14);
  const multiplier = sym.category === 'metal' ? 2.5 : 2.0;

  let riskDistFallback = atrTrigger > 0 ? atrTrigger * multiplier : sym.point * 100;
  if (sym.minSLPoints && riskDistFallback < sym.minSLPoints * sym.point) {
    riskDistFallback = sym.minSLPoints * sym.point;
  }

  const structuralSL = calculateStructuralSL(
    gannAnchorCandles,
    isLong,
    currentPrice,
    riskDistFallback,
    trendAtr,
    sym.digits,
    sym.point
  );

  const actualRisk = Math.abs(currentPrice - structuralSL);

  return {
    score,
    needed: 4,
    passed: gate1Passed && score >= 4,
    direction: isLong ? 'BUY' : 'SELL',
    gate1_macroAndEma: gate1,
    gate2_gannSq9: gate2,
    gate3_gann1x1AndCycles: gate3,
    gate4_rsi: gate4,
    gate5_priceActionAndBos: gate5,
    sq9Level: targetSq9Level || currentPrice,
    structuralSL,
    riskDist: actualRisk || riskDistFallback,
    entryPrice: currentPrice,
    anchorPrice: anchor.price,
    barsElapsed,
    rsiValue,
    dailyEmaValue: latestD1Ema,
    higherTfEmaValue: latestTrendEma,
  };
}

/**
 * Computes Quad scale-out targets (TP1 to TP4 optimized for 1:3 R:R)
 */
export function calculateQuadTargets(
  entryPrice: number,
  riskDist: number,
  isLong: boolean,
  digits: number
): QuadTargets {
  const sign = isLong ? 1 : -1;
  return {
    tp1: Number((entryPrice + sign * (riskDist * 1.0)).toFixed(digits)), // 1.0 R (Secure Profit & Move SL to BE)
    tp2: Number((entryPrice + sign * (riskDist * 1.5)).toFixed(digits)), // 1.5 R (Lock +0.5R)
    tp3: Number((entryPrice + sign * (riskDist * 2.0)).toFixed(digits)), // 2.0 R (Lock +1.0R & Trailing)
    tp4: Number((entryPrice + sign * (riskDist * 3.0)).toFixed(digits)), // 3.0 R (Runner for High Reward)
  };
}

/**
 * Scan all 12 assets and return candidates that meet or are closest to meeting strategy criteria
 */
export function scanMarketWatchSymbols(
  options: ScanOptions
): { signals: TradeSignal[]; candidates: Array<{ symbol: SymbolConfig; evalLong: SopGatesEvaluation; evalShort: SopGatesEvaluation }> } {
  const signals: TradeSignal[] = [];
  const candidates: Array<{ symbol: SymbolConfig; evalLong: SopGatesEvaluation; evalShort: SopGatesEvaluation }> = [];

  TARGET_SYMBOLS.forEach((sym) => {
    const tick = getLatestTick(sym.id);
    if (!tick) return;

    const evalLong = evaluateSopGates(sym, 'intraday', true, tick);
    const evalShort = evaluateSopGates(sym, 'intraday', false, tick);

    candidates.push({ symbol: sym, evalLong, evalShort });

    // Weekend Market Closure Shield: No live signals are ever generated when global markets are closed
    if (isWeekendMarketClosed()) {
      return;
    }

    // Check if long triggers
    if (evalLong.passed && evalLong.score >= (options.scoreNeeded || 4)) {
      const liveEntryPrice = tick.ask;
      const riskDistance = evalLong.riskDist;
      let structuralSL = evalLong.structuralSL;
      if (structuralSL >= liveEntryPrice) {
        structuralSL = Number((liveEntryPrice - riskDistance).toFixed(sym.digits));
      }
      const actualRisk = Math.abs(liveEntryPrice - structuralSL);
      const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, true, sym.digits);
      const lotInfo = calculateLotPreview(sym, liveEntryPrice, structuralSL);

      signals.push({
        id: `SIG_${sym.id}_LONG_${Date.now()}`,
        symbol: sym.symbol,
        engine: 'intraday',
        magicNumber: 1001,
        orderType: 'BUY',
        isLimit: false,
        entryPrice: liveEntryPrice,
        currentPrice: tick.ask,
        slPrice: structuralSL,
        tpTargets: quadTP,
        riskDistance: actualRisk,
        riskRewardRatio: '1:3 (Quad 1.0R, 1.5R, 2.0R, 3.0R)',
        score: evalLong.score,
        gates: evalLong,
        status: 'ACTIVE',
        time: Date.now(),
        timeFormatted: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        comment: 'Gann Intraday V42',
        telegramSent: false,
        lotSize: lotInfo.lot,
        riskDollars: lotInfo.riskDollars,
        pipRisk: lotInfo.pipRisk,
      });
    }

    // Check if short triggers
    if (evalShort.passed && evalShort.score >= (options.scoreNeeded || 4)) {
      const liveEntryPrice = tick.bid;
      const riskDistance = evalShort.riskDist;
      let structuralSL = evalShort.structuralSL;
      if (structuralSL <= liveEntryPrice) {
        structuralSL = Number((liveEntryPrice + riskDistance).toFixed(sym.digits));
      }
      const actualRisk = Math.abs(liveEntryPrice - structuralSL);
      const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, false, sym.digits);
      const lotInfo = calculateLotPreview(sym, liveEntryPrice, structuralSL);

      signals.push({
        id: `SIG_${sym.id}_SHORT_${Date.now()}`,
        symbol: sym.symbol,
        engine: 'intraday',
        magicNumber: 1001,
        orderType: 'SELL',
        isLimit: false,
        entryPrice: liveEntryPrice,
        currentPrice: tick.bid,
        slPrice: structuralSL,
        tpTargets: quadTP,
        riskDistance: actualRisk,
        riskRewardRatio: '1:3 (Quad 1.0R, 1.5R, 2.0R, 3.0R)',
        score: evalShort.score,
        gates: evalShort,
        status: 'ACTIVE',
        time: Date.now(),
        timeFormatted: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        comment: 'Gann Intraday V42',
        telegramSent: false,
        lotSize: lotInfo.lot,
        riskDollars: lotInfo.riskDollars,
        pipRisk: lotInfo.pipRisk,
      });
    }
  });

  return { signals, candidates };
}

/**
 * High-frequency OnTick Evaluator for a single symbol
 * Immediately tests confluence as each market tick arrives without waiting for batch timers
 */
export function evaluateSingleSymbolOnTick(
  sym: SymbolConfig,
  engine: EngineMode = 'intraday',
  currentTick: MarketTick,
  scoreNeeded = 4
): {
  newSignal: TradeSignal | null;
  evalLong: SopGatesEvaluation;
  evalShort: SopGatesEvaluation;
} {
  const evalLong = evaluateSopGates(sym, 'intraday', true, currentTick);
  const evalShort = evaluateSopGates(sym, 'intraday', false, currentTick);

  let newSignal: TradeSignal | null = null;

  // If market is closed on weekend, do not generate live signals
  if (isWeekendMarketClosed()) {
    return { newSignal: null, evalLong, evalShort };
  }

  if (evalLong.passed && evalLong.score >= scoreNeeded) {
    const liveEntryPrice = currentTick.ask;
    const riskDistance = evalLong.riskDist;
    let structuralSL = evalLong.structuralSL;
    if (structuralSL >= liveEntryPrice) {
      structuralSL = Number((liveEntryPrice - riskDistance).toFixed(sym.digits));
    }
    const actualRisk = Math.abs(liveEntryPrice - structuralSL);
    const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, true, sym.digits);
    const lotInfo = calculateLotPreview(sym, liveEntryPrice, structuralSL);

    newSignal = {
      id: `SIG_${sym.id}_LONG_${Date.now()}`,
      symbol: sym.symbol,
      engine: 'intraday',
      magicNumber: 1001,
      orderType: 'BUY',
      isLimit: false,
      entryPrice: liveEntryPrice,
      currentPrice: currentTick.ask,
      slPrice: structuralSL,
      tpTargets: quadTP,
      riskDistance: actualRisk,
      riskRewardRatio: '1:3 (Quad 1.0R, 1.5R, 2.0R, 3.0R)',
      score: evalLong.score,
      gates: evalLong,
      status: 'ACTIVE',
      time: Date.now(),
      timeFormatted: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      comment: 'Gann Intraday V42',
      telegramSent: false,
      lotSize: lotInfo.lot,
      riskDollars: lotInfo.riskDollars,
      pipRisk: lotInfo.pipRisk,
      livePips: 0,
      livePnL: 0,
      breakEvenActive: false,
      highestTargetHit: null,
      isRealtimeUpdate: true,
    };
  } else if (evalShort.passed && evalShort.score >= scoreNeeded) {
    const liveEntryPrice = currentTick.bid;
    const riskDistance = evalShort.riskDist;
    let structuralSL = evalShort.structuralSL;
    if (structuralSL <= liveEntryPrice) {
      structuralSL = Number((liveEntryPrice + riskDistance).toFixed(sym.digits));
    }
    const actualRisk = Math.abs(liveEntryPrice - structuralSL);
    const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, false, sym.digits);
    const lotInfo = calculateLotPreview(sym, liveEntryPrice, structuralSL);

    newSignal = {
      id: `SIG_${sym.id}_SHORT_${Date.now()}`,
      symbol: sym.symbol,
      engine: 'intraday',
      magicNumber: 1001,
      orderType: 'SELL',
      isLimit: false,
      entryPrice: liveEntryPrice,
      currentPrice: currentTick.bid,
      slPrice: structuralSL,
      tpTargets: quadTP,
      riskDistance: actualRisk,
      riskRewardRatio: '1:3 (Quad 1.0R, 1.5R, 2.0R, 3.0R)',
      score: evalShort.score,
      gates: evalShort,
      status: 'ACTIVE',
      time: Date.now(),
      timeFormatted: new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      comment: 'Gann Intraday V42',
      telegramSent: false,
      lotSize: lotInfo.lot,
      riskDollars: lotInfo.riskDollars,
      pipRisk: lotInfo.pipRisk,
      livePips: 0,
      livePnL: 0,
      breakEvenActive: false,
      highestTargetHit: null,
      isRealtimeUpdate: true,
    };
  }

  return { newSignal, evalLong, evalShort };
}

/**
 * Updates an active signal with real-time tick metrics: live pips, live P&L, TP scale-out hit detection & Break-Even
 */
export function updateSignalRealtimeMetrics(
  signal: TradeSignal,
  currentTick: MarketTick,
  sym: SymbolConfig
): TradeSignal {
  const isBuy = signal.orderType.includes('BUY');
  const currentPrice = isBuy ? currentTick.bid : currentTick.ask;
  const pipMultiplier = sym.digits === 3 || sym.digits === 5 ? 10 * sym.point : sym.point;

  // Calculate live pips
  const rawDiff = isBuy ? currentPrice - signal.entryPrice : signal.entryPrice - currentPrice;
  const livePips = Number((rawDiff / pipMultiplier).toFixed(1));

  // Calculate live PnL in USD
  const pipsVal = rawDiff / sym.point;
  const tickDollarVal = (sym.tickValue / sym.tickSize) * sym.point;
  const livePnL = Number((pipsVal * tickDollarVal * signal.lotSize).toFixed(2));

  // Determine stage & target hits
  let highestTargetHit = signal.highestTargetHit || null;
  let breakEvenActive = signal.breakEvenActive || false;
  let trailingSlPrice = signal.trailingSlPrice || signal.slPrice;
  let status = signal.status;

  if (isBuy) {
    if (currentPrice >= signal.tpTargets.tp4) {
      status = 'TP4_HIT';
      highestTargetHit = 'TP4';
    } else if (currentPrice >= signal.tpTargets.tp3) {
      highestTargetHit = 'TP3';
      trailingSlPrice = Math.max(trailingSlPrice, signal.tpTargets.tp2);
    } else if (currentPrice >= signal.tpTargets.tp2) {
      highestTargetHit = 'TP2';
      trailingSlPrice = Math.max(trailingSlPrice, signal.tpTargets.tp1);
    } else if (currentPrice >= signal.tpTargets.tp1) {
      highestTargetHit = 'TP1';
      breakEvenActive = true;
      trailingSlPrice = Number((signal.entryPrice + 2 * pipMultiplier).toFixed(sym.digits));
    }

    const effectiveSL = breakEvenActive ? Math.max(signal.slPrice, trailingSlPrice) : signal.slPrice;
    if (currentPrice <= effectiveSL && status === 'ACTIVE') {
      status = 'SL_HIT';
    }
  } else {
    // SELL
    if (currentPrice <= signal.tpTargets.tp4) {
      status = 'TP4_HIT';
      highestTargetHit = 'TP4';
    } else if (currentPrice <= signal.tpTargets.tp3) {
      highestTargetHit = 'TP3';
      trailingSlPrice = Math.min(trailingSlPrice, signal.tpTargets.tp2);
    } else if (currentPrice <= signal.tpTargets.tp2) {
      highestTargetHit = 'TP2';
      trailingSlPrice = Math.min(trailingSlPrice, signal.tpTargets.tp1);
    } else if (currentPrice <= signal.tpTargets.tp1) {
      highestTargetHit = 'TP1';
      breakEvenActive = true;
      trailingSlPrice = Number((signal.entryPrice - 2 * pipMultiplier).toFixed(sym.digits));
    }

    const effectiveSL = breakEvenActive ? Math.min(signal.slPrice, trailingSlPrice) : signal.slPrice;
    if (currentPrice >= effectiveSL && status === 'ACTIVE') {
      status = 'SL_HIT';
    }
  }

  return {
    ...signal,
    currentPrice,
    livePips,
    livePnL,
    breakEvenActive,
    trailingSlPrice,
    highestTargetHit,
    status,
    isRealtimeUpdate: true,
  };
}

export function calculateLotPreview(
  sym: SymbolConfig,
  entry: number,
  sl: number,
  balance = 1000,
  riskPct = 1.0
): { lot: number; riskDollars: number; pipRisk: number } {
  const safeBalance = balance > 0 ? balance : 1000;
  const safeRiskPct = riskPct > 0 ? riskPct : 1.0;
  const riskDollars = safeBalance * (safeRiskPct / 100);

  const diff = Math.abs(entry - sl);
  let pipRisk = 0;
  if (sym.category === 'metal') {
    pipRisk = Number((diff / 0.10).toFixed(1));
  } else if (sym.symbol.includes('JPY')) {
    pipRisk = Number((diff / 0.01).toFixed(1));
  } else {
    pipRisk = Number((diff / 0.0001).toFixed(1));
  }

  const slPoints = diff / sym.point;
  if (slPoints <= 0) {
    return { lot: sym.minLot, riskDollars: Number(riskDollars.toFixed(2)), pipRisk: 10 };
  }

  const pointValuePerLot = (sym.tickValue / sym.tickSize) * sym.point;
  let rawLot = riskDollars / (slPoints * pointValuePerLot);

  if (sym.category === 'metal') {
    rawLot *= 0.30;
  }

  let finalLot = Math.max(sym.minLot, Math.min(sym.maxLot, Math.round(rawLot * 100) / 100));
  finalLot = Number(finalLot.toFixed(2));

  return {
    lot: finalLot,
    riskDollars: Number(riskDollars.toFixed(2)),
    pipRisk: Number(pipRisk.toFixed(1)),
  };
}
