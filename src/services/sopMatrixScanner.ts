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
  calculateADR,
  calculateADX,
  calculateATR,
  calculateDynamicAtrStop,
  calculateEMA,
  calculateRSI,
  calculateSessionVWAP,
  calculateVolumeProfile,
  checkCandleRejection,
  checkCorrectionD1Trend,
  checkMicroBOS,
  checkMoveExhaustion,
  checkVolumeProfileConfluence,
  checkVolumeSurge,
  detectLiquiditySweepAndMSS,
  isTrendSlopeHealthy,
} from './indicators';
import { getCandles, getLatestTick } from './marketDataFeed';
import {
  isAsianCrossPairBlocked,
  isLateNyOrRolloverBlocked,
  isPreNyOpenBlocked,
  isWeekendMarketClosed,
} from './shieldMonitor';

// ─────────────────────────────────────────────────────────────
// Post-SL Cooldown Penalty Shield (6 Hours Freeze per Symbol)
// ─────────────────────────────────────────────────────────────
const symbolSlHitPenalty = new Map<string, number>();
const SL_COOLDOWN_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export function recordSymbolSlHit(symbol: string): void {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  symbolSlHitPenalty.set(clean, Date.now());
  console.log(`🛑 [SL Penalty Box] Symbol ${clean} is frozen for 6 hours after hitting Stop Loss.`);
}

export function isSymbolInSlCooldown(symbol: string): boolean {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const lastSlTime = symbolSlHitPenalty.get(clean);
  if (!lastSlTime) return false;
  return Date.now() - lastSlTime < SL_COOLDOWN_DURATION_MS;
}

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
  // D1 (Daily Macro Bias) -> H4 (Macro Structure) -> H1 (200 EMA Trend Anchor) -> M15 (RSI Momentum) -> M5 (BOS Trigger)
  const d1Candles = getCandles(sym.id, 'D1');
  const h4Candles = getCandles(sym.id, 'H4');
  const h1Candles = getCandles(sym.id, 'H1');
  const m15Candles = getCandles(sym.id, 'M15');
  const m5Candles = getCandles(sym.id, 'M5');

  // Strictly Intraday timeframes for high probability and noise rejection
  const trendCandles = h1Candles.length >= 50 ? h1Candles : h4Candles;
  const gannAnchorCandles = h4Candles.length > 0 ? h4Candles : h1Candles;
  const rsiCandles = m15Candles;
  const triggerCandles = m5Candles;

  const currentPrice = isLong ? currentTick.ask : currentTick.bid;

  // --- GATE 1: Session VWAP Institutional Bias & 200 EMA Macro Trend ---
  const sessionVwapData = calculateSessionVWAP(h1Candles.length > 0 ? h1Candles : m15Candles);
  const vwapAligned = isLong ? currentPrice >= sessionVwapData.vwap : currentPrice <= sessionVwapData.vwap;

  const d1Ema50 = calculateEMA(d1Candles, 50);
  const latestD1Close = d1Candles.length > 0 ? d1Candles[d1Candles.length - 1].close : currentPrice;
  const latestD1Ema = d1Ema50.length > 0 ? d1Ema50[d1Ema50.length - 1] : currentPrice;
  const dailyMacroOk = isLong ? latestD1Close >= latestD1Ema : latestD1Close <= latestD1Ema;

  // Calculate 200 EMA on H1 (the global standard for MetaTrader trend alignment)
  const h1Ema200 = calculateEMA(h1Candles, 200);
  const latestH1Ema = h1Ema200.length > 0 ? h1Ema200[h1Ema200.length - 1] : currentPrice;
  const h1TrendAbove = currentPrice >= latestH1Ema;

  // Strict trend alignment: NEVER sell if price is above 200 EMA; NEVER buy if price is below 200 EMA
  const trendAlignmentOk = isLong ? h1TrendAbove : !h1TrendAbove;
  const slopeHealthy = isTrendSlopeHealthy(h1Ema200.length > 0 ? h1Ema200 : d1Ema50, sym.point, isLong, 1.5);

  // ADX Choppiness Filter: If ADX < 20, market is in choppy non-trending range (prevents USDJPY 6x chop traps)
  const adxVal = calculateADX(trendCandles, 14);
  const trendHasMomentum = adxVal >= 20;

  // Multi-day correction filter: prevents buying into heavy multi-day downward cascades
  const correctionCheck = checkCorrectionD1Trend(d1Candles, isLong);
  const correctionHealthy = correctionCheck.isHealthy;

  const gate1Passed = trendAlignmentOk && (vwapAligned || dailyMacroOk || slopeHealthy) && trendHasMomentum && correctionHealthy;
  
  let gate1Detail = '';
  if (!trendHasMomentum) {
    gate1Detail = `سوق في نطاق تذبذب عرضي رتيب (ADX = ${adxVal} < 20) - التداول محظور لتجنب الفخاخ`;
  } else if (!correctionHealthy) {
    gate1Detail = correctionCheck.reason;
  } else {
    gate1Detail = isLong
      ? `السعر (${currentPrice.toFixed(sym.digits)}) ${vwapAligned ? '≥' : 'قريب من'} VWAP (${sessionVwapData.vwap.toFixed(sym.digits)}) | 200 EMA: ${latestH1Ema.toFixed(sym.digits)} [تدفق تراكمي صاعد]`
      : `السعر (${currentPrice.toFixed(sym.digits)}) ${vwapAligned ? '≤' : 'قريب من'} VWAP (${sessionVwapData.vwap.toFixed(sym.digits)}) | 200 EMA: ${latestH1Ema.toFixed(sym.digits)} [تدفق تصريفي هابط]`;
  }

  const gate1: GateStatus = {
    passed: gate1Passed,
    name: 'Session VWAP, 200 EMA & ADX Trend',
    nameAr: 'سيولة Session VWAP المؤسسية وموفينج 200 وزخم ADX',
    detail: gate1Detail,
    value: `${trendHasMomentum ? `✓ ADX: ${adxVal}` : `✗ Chop: ${adxVal}`} | ${trendAlignmentOk ? '✓ 200 EMA' : '✗ 200 EMA'}`,
  };

  // --- GATE 2: Gann Square of 9 & Volume Profile (POC / VAH / VAL) Confluence ---
  const anchor = getLatestGannSwingAnchor(gannAnchorCandles, 2, isLong, 50);
  let sq9Confluent = false;
  let targetSq9Level = 0;
  let angleUsed = 0;

  if (anchor.found && ((isLong && currentPrice > anchor.price) || (!isLong && currentPrice < anchor.price))) {
    const sq9Res = checkSquareOf9Confluence(currentPrice, anchor.price, isLong, 0.15);
    sq9Confluent = sq9Res.isConfluent;
    targetSq9Level = sq9Res.closestLevel;
    angleUsed = sq9Res.angle;
  }

  // Calculate Volume Profile across recent intraday action
  const vp = calculateVolumeProfile(h1Candles.length >= 20 ? h1Candles : m15Candles, 28);
  const vpConf = checkVolumeProfileConfluence(
    vp,
    targetSq9Level > 0 ? targetSq9Level : currentPrice,
    sym.point,
    sym.category === 'metal' ? 25 : 15
  );

  const gate2Passed = sq9Confluent && (vpConf.isConfluent || (currentPrice >= vp.val && currentPrice <= vp.vah));

  const gate2: GateStatus = {
    passed: gate2Passed,
    name: 'Gann Sq9 & Volume Profile (POC/VAH/VAL)',
    nameAr: 'مربع 9 لجان وتوافق بروفايل السيولة الحجمي (POC/VAH/VAL)',
    detail: gate2Passed
      ? `تطابق هندسي زاوية ${angleUsed}° لمربع 9 مع عقدة حجمية ${vpConf.confluentLevelName !== 'NONE' ? vpConf.confluentLevelName : 'منطقة القيمة'} (POC: ${vp.poc.toFixed(sym.digits)})`
      : `زاوية مربع 9: ${angleUsed}° | POC: ${vp.poc.toFixed(sym.digits)} (بانتظار تطابق السيولة)`,
    value: gate2Passed
      ? `${angleUsed}° + ${vpConf.confluentLevelName !== 'NONE' ? vpConf.confluentLevelName : 'Value Area'}`
      : 'غير متوافق',
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

  // --- GATE 4: SMC Liquidity Sweep & Market Structure Shift (MSS) ---
  const keyLevelForSweep = targetSq9Level > 0 ? targetSq9Level : currentPrice;
  const smcPattern = detectLiquiditySweepAndMSS(triggerCandles, keyLevelForSweep, isLong, sym.point);
  const rsiValue = calculateRSI(rsiCandles, 14);
  const rsiBandOk = isLong ? rsiValue >= 30.0 && rsiValue <= 62.0 : rsiValue >= 38.0 && rsiValue <= 70.0;

  const gate4Passed = (smcPattern.mssConfirmed || smcPattern.sweepDetected) && rsiBandOk;

  const gate4: GateStatus = {
    passed: gate4Passed,
    name: 'Liquidity Sweep & Market Structure Shift (MSS)',
    nameAr: 'كنس السيولة (Sweep) وتغير هيكل السوق (MSS)',
    detail: `${smcPattern.patternDetail} | زخم RSI: ${rsiValue.toFixed(1)}`,
    value: `${smcPattern.sweepDetected ? '✓ Sweep' : '•'} | ${smcPattern.mssConfirmed ? '✓ MSS' : '•'} | RSI: ${rsiValue.toFixed(1)}`,
  };

  // --- GATE 5: FVG Retest & Volume Displacement (No Blind Limit Orders) ---
  const volOk = checkVolumeSurge(triggerCandles, 1.10);
  const lastCompletedBar = triggerCandles.length > 1 ? triggerCandles[triggerCandles.length - 2] : triggerCandles[0];
  const paOk = lastCompletedBar ? checkCandleRejection(lastCompletedBar, isLong, 0.18) : true;
  const bosOk = checkMicroBOS(triggerCandles, isLong);

  // Execution triggered when displacement volume appears or FVG is formed/retested
  const gate5Passed = (smcPattern.hasFvg && (volOk || paOk)) || (bosOk && volOk) || (smcPattern.mssConfirmed && paOk);

  const gate5: GateStatus = {
    passed: gate5Passed,
    name: 'FVG Retest & Volume Displacement Trigger',
    nameAr: 'زناد الدخول: اختبار فجوة القيمة (FVG) وإزاحة الفوليوم',
    detail: `فجوة FVG: ${smcPattern.hasFvg ? 'نعم (تم رصد اختلال كفاءة)' : 'لا'} | إزاحة الفوليوم: ${volOk ? 'مرتفعة 🔥' : 'معيارية'} | ذيل رفض: ${paOk ? 'نعم' : 'لا'}`,
    value: `${smcPattern.hasFvg ? '✓ FVG' : '•'} | ${volOk ? '✓ Displacement' : '•'} | ${paOk ? '✓ Rejection' : '•'}`,
  };

  // Total Confluence Score
  const score =
    (gate1Passed ? 1 : 0) +
    (gate2Passed ? 1 : 0) +
    (gate3Passed ? 1 : 0) +
    (gate4Passed ? 1 : 0) +
    (gate5Passed ? 1 : 0);

  // Dynamic ATR-Based Stop Loss: SL = Gann Level ± (n * ATR)
  const atrTrigger = calculateATR(rsiCandles, 14);
  const dynamicAtrMultiplier = sym.category === 'metal' ? 2.5 : 1.8;
  const baseGannLevel = targetSq9Level > 0 ? targetSq9Level : currentPrice;
  const dynamicAtrResult = calculateDynamicAtrStop(baseGannLevel, atrTrigger, isLong, sym.digits, dynamicAtrMultiplier);

  // --- CONTROLLED VOLATILITY STOP LOSS (HARD CAP & DOLLAR GUARD) ---
  let safeDistance = dynamicAtrResult.distance;

  // 1. Minimum SL Points Cushion (prevent noise stop-outs)
  if (sym.minSLPoints && safeDistance < sym.minSLPoints * sym.point) {
    safeDistance = sym.minSLPoints * sym.point;
  }

  // 2. Strict Maximum SL Points Ceiling (Prevents distant anchor pivots from blowing up SL)
  if (sym.maxSLPoints && safeDistance > sym.maxSLPoints * sym.point) {
    safeDistance = sym.maxSLPoints * sym.point;
  }

  // 3. Absolute Hard Dollar Loss Guard:
  // Dynamically sized according to asset class:
  // For Gold (XAUUSD): allows up to $8.50 cushion (still only ~0.2% of price at $4000+)
  // For Forex pairs: keeps strict ~$4.50 ceiling on 0.01 micro lot
  const pointValuePerLot = (sym.tickValue / sym.tickSize) * sym.point;
  if (pointValuePerLot > 0) {
    const maxDollarCap = sym.category === 'metal' ? 8.50 : 4.50;
    const maxDollarLossPoints = maxDollarCap / (0.01 * pointValuePerLot);
    const maxSafeDollarDistance = maxDollarLossPoints * sym.point;
    if (safeDistance > maxSafeDollarDistance) {
      safeDistance = maxSafeDollarDistance;
    }
  }

  // Stop Loss is directly and safely pegged to safeDistance from current entry!
  const finalSL = Number(
    (isLong ? currentPrice - safeDistance : currentPrice + safeDistance).toFixed(sym.digits)
  );

  const actualRisk = Number(safeDistance.toFixed(sym.digits));

  // --- SHIELD: Anti-Chasing & ADR Move Exhaustion Filter ---
  const exhaustionShield = checkMoveExhaustion(
    d1Candles,
    currentPrice,
    isLong,
    sessionVwapData.vwap,
    atrTrigger,
    sym.point
  );

  const passed = gate1Passed && score >= 4 && !exhaustionShield.isExhausted;

  return {
    score,
    needed: 4,
    passed,
    direction: isLong ? 'BUY' : 'SELL',
    gate1_macroAndEma: gate1,
    gate2_gannSq9: gate2,
    gate3_gann1x1AndCycles: gate3,
    gate4_rsi: gate4,
    gate5_priceActionAndBos: gate5,
    sq9Level: targetSq9Level || currentPrice,
    structuralSL: finalSL,
    riskDist: actualRisk > 0 ? actualRisk : Number((sym.volatilityAtr || 0.005).toFixed(sym.digits)),
    entryPrice: currentPrice,
    anchorPrice: anchor.price,
    barsElapsed,
    rsiValue,
    dailyEmaValue: latestD1Ema,
    higherTfEmaValue: latestH1Ema,
    // Institutional Additions:
    volumeProfile: {
      poc: vp.poc,
      vah: vp.vah,
      val: vp.val,
      isConfluent: vpConf.isConfluent,
      confluentLevelName: vpConf.confluentLevelName,
      confluenceDistancePips: vpConf.confluenceDistancePips,
    },
    sessionVwap: {
      vwap: sessionVwapData.vwap,
      aligned: vwapAligned,
      distancePoints: Math.abs(currentPrice - sessionVwapData.vwap),
    },
    smcTrigger: {
      sweepDetected: smcPattern.sweepDetected,
      mssConfirmed: smcPattern.mssConfirmed,
      hasFvg: smcPattern.hasFvg,
      fvgZone: smcPattern.fvgZone,
      triggerDescription: smcPattern.patternDetail,
    },
    dynamicAtrStop: dynamicAtrResult.slPrice,
    exhaustionShield,
  };
}

/**
 * Institutional Major Round Number Front-Running Buffer:
 * Major round numbers (e.g. 4000.00, 4050.00 on Gold) act as massive defense zones
 * where institutional counter-orders sit. This function front-runs round barriers so take profit fills BEFORE
 * the institutional defense wall triggers an adverse reversal.
 */
function applyRoundNumberBuffer(rawTarget: number, isLong: boolean, digits: number): number {
  if (digits === 2) {
    // Metals (Gold / Silver)
    const remainder = Math.abs(rawTarget % 10);
    // If long target lands right at or slightly above round level (e.g. 4000.20 or 4001.50)
    // Front-run resistance wall
    if (isLong && (remainder <= 1.5 || remainder >= 8.5)) {
      const nearestTen = Math.round(rawTarget / 10) * 10;
      if (rawTarget >= nearestTen - 1.5 && rawTarget <= nearestTen + 2.5) {
        return Number((nearestTen - 1.80).toFixed(digits));
      }
    }
    // If short target lands right at or slightly below round level (e.g. 4000.27 or 3998.80)
    // Front-run institutional buy bounce wall
    if (!isLong && (remainder <= 1.5 || remainder >= 8.5)) {
      const nearestTen = Math.round(rawTarget / 10) * 10;
      if (rawTarget <= nearestTen + 1.5 && rawTarget >= nearestTen - 2.5) {
        return Number((nearestTen + 1.80).toFixed(digits));
      }
    }
  }
  return Number(rawTarget.toFixed(digits));
}

/**
 * Computes Quad scale-out targets (TP1 to TP4 optimized for 1:3 R:R with Round Number Buffer)
 */
export function calculateQuadTargets(
  entryPrice: number,
  riskDist: number,
  isLong: boolean,
  digits: number
): QuadTargets {
  const sign = isLong ? 1 : -1;
  const raw1 = entryPrice + sign * (riskDist * 1.0);
  const raw2 = entryPrice + sign * (riskDist * 1.5);
  const raw3 = entryPrice + sign * (riskDist * 2.0);
  const raw4 = entryPrice + sign * (riskDist * 3.0);

  return {
    tp1: applyRoundNumberBuffer(raw1, isLong, digits), // 1.0 R (Secure Profit & Move SL to BE)
    tp2: applyRoundNumberBuffer(raw2, isLong, digits), // 1.5 R (Lock +0.5R)
    tp3: applyRoundNumberBuffer(raw3, isLong, digits), // 2.0 R (Lock +1.0R & Trailing)
    tp4: applyRoundNumberBuffer(raw4, isLong, digits), // 3.0 R (Runner for High Reward)
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

    // 1. Weekend Market Closure Shield: No live signals when global markets are closed
    if (isWeekendMarketClosed()) {
      return;
    }

    // 2. Late NY & Rollover Thin Liquidity Shield (19:00 - 23:15 UTC)
    if (isLateNyOrRolloverBlocked()) {
      return;
    }

    // 3. Asian Cross Pairs Shield (Blocks GBPJPY / EURJPY Asian false traps until London Open)
    if (isAsianCrossPairBlocked(sym.symbol)) {
      return;
    }

    // 4. Pre-New York Open Volatility & Stop-Hunt Shield (13:10-13:40 & 14:10-14:35 UTC)
    if (isPreNyOpenBlocked()) {
      return;
    }

    // 5. Post-SL Cooldown Penalty Shield: Freeze symbol for 6 hours if it recently hit Stop Loss!
    if (isSymbolInSlCooldown(sym.symbol)) {
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

      // Spread-to-Stop Ratio Shield: if broker spread eats > 18% of SL, reject
      const spreadDist = tick.spreadPts * sym.point;
      if (spreadDist > actualRisk * 0.18) {
        return;
      }

      const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, true, sym.digits);
      // Minimum R:R Shield: ensure TP2 is at least 1.2x risk
      if (Math.abs(quadTP.tp2 - liveEntryPrice) < actualRisk * 1.2) {
        return;
      }

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

      // Spread-to-Stop Ratio Shield: if broker spread eats > 18% of SL, reject
      const spreadDist = tick.spreadPts * sym.point;
      if (spreadDist > actualRisk * 0.18) {
        return;
      }

      const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, false, sym.digits);
      // Minimum R:R Shield: ensure TP2 is at least 1.2x risk
      if (Math.abs(quadTP.tp2 - liveEntryPrice) < actualRisk * 1.2) {
        return;
      }

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

  // 1. Weekend Market Closure Shield
  if (isWeekendMarketClosed()) {
    return { newSignal: null, evalLong, evalShort };
  }

  // 2. Late New York & High-Spread Rollover Shield (19:00 - 23:15 UTC)
  if (isLateNyOrRolloverBlocked()) {
    return { newSignal: null, evalLong, evalShort };
  }

  // 3. Asian Cross Pairs Shield (Blocks volatile GBPJPY / EURJPY Asian traps)
  if (isAsianCrossPairBlocked(sym.symbol)) {
    return { newSignal: null, evalLong, evalShort };
  }

  // 4. Post-SL Cooldown Penalty Shield (Freeze for 6h after taking a stop loss)
  if (isSymbolInSlCooldown(sym.symbol)) {
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

    // Spread-to-Stop Ratio Shield: reject if spread consumes > 18% of SL
    const spreadDist = currentTick.spreadPts * sym.point;
    if (spreadDist > actualRisk * 0.18) {
      return { newSignal: null, evalLong, evalShort };
    }

    const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, true, sym.digits);
    // Minimum R:R Shield: ensure TP2 is at least 1.2x risk
    if (Math.abs(quadTP.tp2 - liveEntryPrice) < actualRisk * 1.2) {
      return { newSignal: null, evalLong, evalShort };
    }

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

    // Spread-to-Stop Ratio Shield: reject if spread consumes > 18% of SL
    const spreadDist = currentTick.spreadPts * sym.point;
    if (spreadDist > actualRisk * 0.18) {
      return { newSignal: null, evalLong, evalShort };
    }

    const quadTP = calculateQuadTargets(liveEntryPrice, actualRisk, false, sym.digits);
    // Minimum R:R Shield: ensure TP2 is at least 1.2x risk
    if (Math.abs(quadTP.tp2 - liveEntryPrice) < actualRisk * 1.2) {
      return { newSignal: null, evalLong, evalShort };
    }

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
      if (breakEvenActive) {
        status = 'BREAKEVEN_HIT';
      } else {
        status = 'SL_HIT';
        recordSymbolSlHit(signal.symbol);
      }
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
      if (breakEvenActive) {
        status = 'BREAKEVEN_HIT';
      } else {
        status = 'SL_HIT';
        recordSymbolSlHit(signal.symbol);
      }
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
  riskPct = 1.0,
  useStrictMicroLot = true
): { lot: number; riskDollars: number; pipRisk: number } {
  const diff = Math.abs(entry - sl);
  let pipRisk = 0;
  if (sym.category === 'metal') {
    pipRisk = Number((diff / 0.10).toFixed(1));
  } else if (sym.symbol.includes('JPY')) {
    pipRisk = Number((diff / 0.01).toFixed(1));
  } else {
    pipRisk = Number((diff / 0.0001).toFixed(1));
  }

  // Strict Micro-Lot Mode: Clamped to 0.01 for accounts under $3,000 or when safety is locked
  if (useStrictMicroLot || balance <= 3000) {
    const slPoints = diff / sym.point;
    const pointValuePerLot = (sym.tickValue / sym.tickSize) * sym.point;
    const exactRiskDollars = Math.max(0.5, slPoints * pointValuePerLot * 0.01);
    return {
      lot: 0.01,
      riskDollars: Number(exactRiskDollars.toFixed(2)),
      pipRisk: Number(pipRisk.toFixed(1)),
    };
  }

  const safeBalance = balance > 0 ? balance : 1000;
  const safeRiskPct = riskPct > 0 ? riskPct : 1.0;
  const riskDollars = safeBalance * (safeRiskPct / 100);

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
