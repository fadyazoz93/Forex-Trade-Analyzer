import { Candle } from '../types';

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): number[] {
  if (!candles || candles.length === 0) return [];
  const k = 2 / (period + 1);
  const emaValues: number[] = [];

  // Simple average for initial seed
  let sum = 0;
  const seedLength = Math.min(period, candles.length);
  for (let i = 0; i < seedLength; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / seedLength;
  emaValues.push(prevEma);

  for (let i = seedLength; i < candles.length; i++) {
    const currentEma = candles[i].close * k + prevEma * (1 - k);
    emaValues.push(currentEma);
    prevEma = currentEma;
  }

  return emaValues;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number {
  if (!candles || candles.length < 2) return 0;
  const trValues: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trValues.push(tr);
  }

  const lookback = Math.min(period, trValues.length);
  const slice = trValues.slice(-lookback);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / lookback;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(candles: Candle[], period: number = 14): number {
  if (!candles || candles.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Checks trend slope health based on EMA(0) vs EMA(4)
 */
export function isTrendSlopeHealthy(
  emaSeries: number[],
  point: number,
  isLong: boolean,
  minSlopePoints: number = 2.0
): boolean {
  if (!emaSeries || emaSeries.length < 5 || point <= 0) return true;
  const latest = emaSeries[emaSeries.length - 1];
  const fiveBarsAgo = emaSeries[emaSeries.length - 5];

  const slopeDistance = Math.abs(latest - fiveBarsAgo) / point;
  if (slopeDistance < minSlopePoints) return false;

  if (isLong && latest <= fiveBarsAgo) return false;
  if (!isLong && latest >= fiveBarsAgo) return false;

  return true;
}

/**
 * Checks Candle Price Action rejection wicks (>= 20% of range)
 */
export function checkCandleRejection(
  candle: Candle,
  isLong: boolean,
  minWickRatio: number = 0.20
): boolean {
  const range = candle.high - candle.low;
  if (range <= 0) return true;

  if (isLong) {
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    return candle.close >= candle.open && lowerWick / range >= minWickRatio;
  } else {
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    return candle.close <= candle.open && upperWick / range >= minWickRatio;
  }
}

/**
 * Checks Micro Break of Structure (Micro BOS)
 */
export function checkMicroBOS(
  candles: Candle[],
  isLong: boolean
): boolean {
  if (!candles || candles.length < 4) return true;
  const bar1 = candles[candles.length - 2];
  const bar2 = candles[candles.length - 3];
  const bar3 = candles[candles.length - 4];

  if (isLong) {
    return bar1.close >= Math.max(bar2.high, bar3.high);
  } else {
    return bar1.close <= Math.min(bar2.low, bar3.low);
  }
}

/**
 * Checks Volume Surge against average of previous 14 bars
 */
export function checkVolumeSurge(
  candles: Candle[],
  multiplier: number = 1.15
): boolean {
  if (!candles || candles.length < 16) return true;
  const bar1 = candles[candles.length - 2];
  let sumVol = 0;
  for (let k = candles.length - 3; k >= candles.length - 16; k--) {
    sumVol += candles[k].volume;
  }
  const avgVol = sumVol / 14;
  return bar1.volume >= avgVol * multiplier;
}

// ─────────────────────────────────────────────────────────────
// Institutional Upgrade 1: Session VWAP (Volume-Weighted Average Price)
// ─────────────────────────────────────────────────────────────

/**
 * Calculates Intraday Session VWAP
 * Cumulative (Typical Price * Volume) / Cumulative Volume
 */
export function calculateSessionVWAP(candles: Candle[]): {
  vwap: number;
  priceAboveVwap: boolean;
  distancePct: number;
} {
  if (!candles || candles.length === 0) {
    return { vwap: 0, priceAboveVwap: true, distancePct: 0 };
  }

  // Calculate cumulative sum over recent session bars (e.g. up to last 48 intraday bars)
  const lookback = Math.min(candles.length, 48);
  const slice = candles.slice(-lookback);

  let cumulativeTpVol = 0;
  let cumulativeVol = 0;

  for (const c of slice) {
    const typicalPrice = (c.high + c.low + c.close) / 3.0;
    const vol = Math.max(1, c.volume);
    cumulativeTpVol += typicalPrice * vol;
    cumulativeVol += vol;
  }

  const vwap = cumulativeVol > 0 ? cumulativeTpVol / cumulativeVol : slice[slice.length - 1].close;
  const currentPrice = slice[slice.length - 1].close;
  const priceAboveVwap = currentPrice >= vwap;
  const distancePct = vwap > 0 ? Math.abs((currentPrice - vwap) / vwap) * 100 : 0;

  return {
    vwap: Number(vwap.toFixed(5)),
    priceAboveVwap,
    distancePct: Number(distancePct.toFixed(3)),
  };
}

// ─────────────────────────────────────────────────────────────
// Institutional Upgrade 2: Volume Profile (POC / VAH / VAL)
// ─────────────────────────────────────────────────────────────

export interface VolumeProfileCalculation {
  poc: number;            // Point of Control (Highest Volume Node)
  vah: number;            // Value Area High (70% Volume Boundary)
  val: number;            // Value Area Low (70% Volume Boundary)
  totalVolume: number;
}

/**
 * Calculates Horizontal Volume Profile from recent price-action candles
 */
export function calculateVolumeProfile(
  candles: Candle[],
  binsCount: number = 30
): VolumeProfileCalculation {
  if (!candles || candles.length < 5) {
    return { poc: 0, vah: 0, val: 0, totalVolume: 0 };
  }

  const lookback = Math.min(candles.length, 60);
  const slice = candles.slice(-lookback);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVol = 0;

  for (const c of slice) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    totalVol += Math.max(1, c.volume);
  }

  const priceSpan = maxPrice - minPrice;
  if (priceSpan <= 0) {
    const p = slice[slice.length - 1].close;
    return { poc: p, vah: p, val: p, totalVolume: totalVol };
  }

  const binStep = priceSpan / binsCount;
  const bins = new Array(binsCount).fill(0);

  // Distribute volume into price bins
  for (const c of slice) {
    const vol = Math.max(1, c.volume);
    const mid = (c.high + c.low) / 2.0;
    const binIdx = Math.min(binsCount - 1, Math.max(0, Math.floor((mid - minPrice) / binStep)));
    bins[binIdx] += vol;
  }

  // Find POC (bin with max volume)
  let maxBinVol = -1;
  let pocBinIdx = 0;
  for (let i = 0; i < binsCount; i++) {
    if (bins[i] > maxBinVol) {
      maxBinVol = bins[i];
      pocBinIdx = i;
    }
  }

  const pocPrice = minPrice + (pocBinIdx + 0.5) * binStep;

  // Calculate Value Area (70% of total volume around POC)
  const targetAreaVol = totalVol * 0.70;
  let areaVol = bins[pocBinIdx];
  let lowerIdx = pocBinIdx;
  let upperIdx = pocBinIdx;

  while (areaVol < targetAreaVol && (lowerIdx > 0 || upperIdx < binsCount - 1)) {
    const nextDownVol = lowerIdx > 0 ? bins[lowerIdx - 1] : 0;
    const nextUpVol = upperIdx < binsCount - 1 ? bins[upperIdx + 1] : 0;

    if (nextDownVol >= nextUpVol && lowerIdx > 0) {
      lowerIdx--;
      areaVol += bins[lowerIdx];
    } else if (upperIdx < binsCount - 1) {
      upperIdx++;
      areaVol += bins[upperIdx];
    } else if (lowerIdx > 0) {
      lowerIdx--;
      areaVol += bins[lowerIdx];
    } else {
      break;
    }
  }

  const valPrice = minPrice + lowerIdx * binStep;
  const vahPrice = minPrice + (upperIdx + 1) * binStep;

  return {
    poc: Number(pocPrice.toFixed(5)),
    vah: Number(vahPrice.toFixed(5)),
    val: Number(valPrice.toFixed(5)),
    totalVolume: totalVol,
  };
}

/**
 * Checks confluence between Gann level and Volume Profile (POC / VAH / VAL)
 */
export function checkVolumeProfileConfluence(
  vp: VolumeProfileCalculation,
  targetPrice: number,
  point: number,
  tolerancePips: number = 15
): {
  isConfluent: boolean;
  confluentLevelName: 'POC' | 'VAH' | 'VAL' | 'NONE';
  confluenceDistancePips: number;
} {
  if (vp.poc === 0) {
    return { isConfluent: false, confluentLevelName: 'NONE', confluenceDistancePips: 999 };
  }

  const tolerancePrice = tolerancePips * (point * 10);

  const distPOC = Math.abs(targetPrice - vp.poc);
  const distVAH = Math.abs(targetPrice - vp.vah);
  const distVAL = Math.abs(targetPrice - vp.val);

  if (distPOC <= tolerancePrice) {
    return {
      isConfluent: true,
      confluentLevelName: 'POC',
      confluenceDistancePips: Number((distPOC / (point * 10)).toFixed(1)),
    };
  }

  if (distVAL <= tolerancePrice) {
    return {
      isConfluent: true,
      confluentLevelName: 'VAL',
      confluenceDistancePips: Number((distVAL / (point * 10)).toFixed(1)),
    };
  }

  if (distVAH <= tolerancePrice) {
    return {
      isConfluent: true,
      confluentLevelName: 'VAH',
      confluenceDistancePips: Number((distVAH / (point * 10)).toFixed(1)),
    };
  }

  const minDistance = Math.min(distPOC, distVAH, distVAL);
  return {
    isConfluent: false,
    confluentLevelName: 'NONE',
    confluenceDistancePips: Number((minDistance / (point * 10)).toFixed(1)),
  };
}

// ─────────────────────────────────────────────────────────────
// Institutional Upgrade 3: Sweep + MSS + FVG Trigger
// ─────────────────────────────────────────────────────────────

export interface SmcPatternAnalysis {
  sweepDetected: boolean;
  mssConfirmed: boolean;
  hasFvg: boolean;
  fvgZone?: { top: number; bottom: number };
  patternDetail: string;
}

/**
 * Detects ICT / SMC Liquidity Sweep & Market Structure Shift (MSS) on lower timeframe
 */
export function detectLiquiditySweepAndMSS(
  candles: Candle[],
  keyGannLevel: number,
  isLong: boolean,
  point: number
): SmcPatternAnalysis {
  if (!candles || candles.length < 8) {
    return {
      sweepDetected: false,
      mssConfirmed: true,
      hasFvg: false,
      patternDetail: 'شموع غير كافية - اعتماد كسر الهيكل الافتراضي',
    };
  }

  const recent = candles.slice(-8);
  const lastBar = recent[recent.length - 1];
  const prevBar = recent[recent.length - 2];
  const tolerance = point * 20;

  // 1. Liquidity Sweep: Price pierced beyond the Gann level with a wick but closed back inside
  let sweepDetected = false;
  if (isLong) {
    // Bullish Sweep: Low went below Gann level, but close finished above or near Gann level
    sweepDetected = recent.some((c) => c.low <= keyGannLevel + tolerance && c.close >= keyGannLevel - tolerance);
  } else {
    // Bearish Sweep: High went above Gann level, but close finished below or near Gann level
    sweepDetected = recent.some((c) => c.high >= keyGannLevel - tolerance && c.close <= keyGannLevel + tolerance);
  }

  // 2. Market Structure Shift (MSS): Displacement candle breaking opposing recent swing
  let mssConfirmed = false;
  if (isLong) {
    const priorSwingHigh = Math.max(recent[0].high, recent[1].high, recent[2].high);
    mssConfirmed = prevBar.close > priorSwingHigh || lastBar.close > priorSwingHigh;
  } else {
    const priorSwingLow = Math.min(recent[0].low, recent[1].low, recent[2].low);
    mssConfirmed = prevBar.close < priorSwingLow || lastBar.close < priorSwingLow;
  }

  // 3. Fair Value Gap (FVG): Imbalance across 3 consecutive candles
  let hasFvg = false;
  let fvgZone: { top: number; bottom: number } | undefined = undefined;

  for (let i = recent.length - 1; i >= 2; i--) {
    const c1 = recent[i - 2];
    const c3 = recent[i];

    if (isLong && c3.low > c1.high) {
      // Bullish FVG
      hasFvg = true;
      fvgZone = { top: c3.low, bottom: c1.high };
      break;
    } else if (!isLong && c3.high < c1.low) {
      // Bearish FVG
      hasFvg = true;
      fvgZone = { top: c1.low, bottom: c3.high };
      break;
    }
  }

  let patternDetail = '';
  if (sweepDetected && mssConfirmed && hasFvg) {
    patternDetail = 'نموذج مؤسسي مكتمل: كنس سيولة (Sweep) + كسر هيكل (MSS) + فجوة FVG';
  } else if (mssConfirmed) {
    patternDetail = 'كسر هيكل السوق (MSS) مؤكد بزخم صانع السوق';
  } else if (sweepDetected) {
    patternDetail = 'كنس سيولة (Sweep) حول مستوى جان - بانتظار إغلاق شمعة التأكيد';
  } else {
    patternDetail = 'تتبع تشكل نمط صانع السوق';
  }

  return {
    sweepDetected,
    mssConfirmed,
    hasFvg,
    fvgZone,
    patternDetail,
  };
}

// ─────────────────────────────────────────────────────────────
// Institutional Upgrade 4: Dynamic ATR-Based Stop Loss
// ─────────────────────────────────────────────────────────────

/**
 * Calculates Dynamic Volatility Stop Loss
 * SL = Gann Level ± (n * ATR)
 */
export function calculateDynamicAtrStop(
  gannLevel: number,
  atr: number,
  isLong: boolean,
  digits: number,
  multiplier: number = 1.8
): { slPrice: number; distance: number } {
  const safeAtr = atr > 0 ? atr : 0.0020;
  const buffer = safeAtr * multiplier;

  const slPrice = isLong ? gannLevel - buffer : gannLevel + buffer;
  const distance = Math.abs(gannLevel - slPrice);

  return {
    slPrice: Number(slPrice.toFixed(digits)),
    distance: Number(distance.toFixed(digits)),
  };
}

// ─────────────────────────────────────────────────────────────
// Institutional Upgrade 5: Anti-Chasing & Move Exhaustion Shield
// ─────────────────────────────────────────────────────────────

/**
 * Calculates Average Daily Range (ADR) from D1 candles
 */
export function calculateADR(d1Candles: Candle[], period: number = 14): number {
  if (!d1Candles || d1Candles.length < 2) return 0;
  const ranges: number[] = [];
  const lookback = Math.min(period, d1Candles.length);
  for (let i = d1Candles.length - lookback; i < d1Candles.length; i++) {
    ranges.push(d1Candles[i].high - d1Candles[i].low);
  }
  const sum = ranges.reduce((acc, r) => acc + r, 0);
  return sum / ranges.length;
}

/**
 * Anti-Chasing & Move Exhaustion Shield
 * Prevents selling the bottom or buying the top after an extended move
 */
export function checkMoveExhaustion(
  d1Candles: Candle[],
  currentPrice: number,
  isLong: boolean,
  sessionVwap: number,
  atr: number,
  point: number
): { isExhausted: boolean; adrUsagePct: number; reason: string } {
  if (!d1Candles || d1Candles.length === 0) {
    return { isExhausted: false, adrUsagePct: 0, reason: '' };
  }

  const todayBar = d1Candles[d1Candles.length - 1];
  const dayRange = todayBar.high - todayBar.low;
  const adr = calculateADR(d1Candles, 14);

  const adrUsagePct = adr > 0 ? Number(((dayRange / adr) * 100).toFixed(1)) : 50;

  // 1. ADR Exhaustion: If day range already consumed >= 75% of ADR and price is sitting at the extreme edge
  if (adrUsagePct >= 75) {
    if (!isLong && currentPrice <= todayBar.low + dayRange * 0.20) {
      // Selling at the absolute bottom of an exhausted day!
      return {
        isExhausted: true,
        adrUsagePct,
        reason: `حظر ملاحقة السعر: تم استهلاك ${adrUsagePct}% من المدى اليومي (ADR). السعر في قاع النطاق؛ البيع هنا شديد الخطورة وممنوع.`,
      };
    }
    if (isLong && currentPrice >= todayBar.high - dayRange * 0.20) {
      // Buying at the absolute top of an exhausted day!
      return {
        isExhausted: true,
        adrUsagePct,
        reason: `حظر ملاحقة السعر: تم استهلاك ${adrUsagePct}% من المدى اليومي (ADR). السعر في قمة النطاق؛ الشراء هنا شديد الخطورة وممنوع.`,
      };
    }
  }

  // 2. Over-extension from Session VWAP (Mean Reversion Risk)
  if (sessionVwap > 0 && atr > 0) {
    const vwapDistance = Math.abs(currentPrice - sessionVwap);
    if (!isLong && currentPrice < sessionVwap && vwapDistance >= 2.2 * atr) {
      return {
        isExhausted: true,
        adrUsagePct,
        reason: `تشبع بيعي مفرط: السعر يبتعد بأكثر من 2.2 ATR أسفل الـ VWAP. تصحيح صاعد وشيك؛ يُمنع البيع اللحظي.`,
      };
    }
    if (isLong && currentPrice > sessionVwap && vwapDistance >= 2.2 * atr) {
      return {
        isExhausted: true,
        adrUsagePct,
        reason: `تشبع شرائي مفرط: السعر يبتعد بأكثر من 2.2 ATR أعلى الـ VWAP. تصحيح هابط وشيك؛ يُمنع الشراء اللحظي.`,
      };
    }
  }

  return { isExhausted: false, adrUsagePct, reason: '' };
}
