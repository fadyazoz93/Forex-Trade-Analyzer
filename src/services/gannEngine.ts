import { Candle } from '../types';

export const GANN_ANGLES = [
  45, 90, 135, 180, 225, 270, 315, 360, 405, 450, 495, 540, 585, 630, 675, 720
];

/**
 * Universal Scale Factor for Square of 9 normalization across FX, Metals, and Crypto
 * As defined in EA V42.00
 */
export function getUniversalScaleFactor(price: number): number {
  if (price <= 0) return 1.0;
  if (price < 5.0) return 10000.0;     // Forex majors (e.g. 1.0845 -> 10845)
  if (price < 150.0) return 1000.0;    // Silver & Commodities (e.g. 64.50 -> 64500)
  if (price < 500.0) return 100.0;     // JPY pairs (e.g. 153.45 -> 15345)
  if (price < 10000.0) return 10.0;    // Gold spot (e.g. 4348.50 -> 43485)
  return 1.0;
}

/**
 * Calculate Square of 9 target level for a given base price and angle
 */
export function calculateSquareOf9Target(
  basePrice: number,
  angleDeg: number,
  isResistance: boolean
): number {
  if (basePrice <= 0) return 0.0;
  const factor = getUniversalScaleFactor(basePrice);
  const normPrice = basePrice * factor;
  const sqrtP = Math.sqrt(normPrice);
  const angleFactor = angleDeg / 180.0;
  const targetNorm = isResistance ? (sqrtP + angleFactor) : (sqrtP - angleFactor);
  if (targetNorm <= 0) return 0.0;
  return (targetNorm * targetNorm) / factor;
}

/**
 * Checks confluence with Square of 9 angle levels within dynamic tolerance (15%)
 */
export function checkSquareOf9Confluence(
  currentPrice: number,
  anchorPrice: number,
  isLong: boolean,
  toleranceFactor: number = 0.15
): { isConfluent: boolean; closestLevel: number; angle: number; diff: number; tolerance: number } {
  if (anchorPrice <= 0 || currentPrice <= 0) {
    return { isConfluent: false, closestLevel: 0, angle: 0, diff: 0, tolerance: 0 };
  }

  const factor = getUniversalScaleFactor(anchorPrice);
  const normPrice = anchorPrice * factor;
  const sqrtP = Math.sqrt(normPrice);

  // Step distance for 45° (45/180 = 0.25)
  const nextAngleNorm = (sqrtP + 0.25) * (sqrtP + 0.25);
  const stepDistance = Math.abs((nextAngleNorm - normPrice) / factor);
  const dynamicTolerance = stepDistance * toleranceFactor;

  let minDiff = Number.MAX_VALUE;
  let bestAngle = 45;
  let bestLevel = currentPrice;

  for (const angle of GANN_ANGLES) {
    const target = calculateSquareOf9Target(anchorPrice, angle, isLong);
    const diff = Math.abs(currentPrice - target);
    if (diff < minDiff) {
      minDiff = diff;
      bestAngle = angle;
      bestLevel = target;
    }
  }

  const isConfluent = minDiff <= dynamicTolerance;
  return {
    isConfluent,
    closestLevel: bestLevel,
    angle: bestAngle,
    diff: minDiff,
    tolerance: dynamicTolerance,
  };
}

/**
 * Swing pivot anchor detector (2-bar strength lookback as in MQL5)
 */
export function getLatestGannSwingAnchor(
  candles: Candle[],
  swingStrength: number = 2,
  findLow: boolean = true,
  maxLookback: number = 60
): { found: boolean; price: number; time: number; barsElapsed: number } {
  if (!candles || candles.length < swingStrength * 2 + 1) {
    return { found: false, price: 0, time: 0, barsElapsed: 0 };
  }

  const total = candles.length;
  const lookback = Math.min(maxLookback, total - swingStrength - 1);

  for (let i = total - 1 - swingStrength; i >= total - lookback; i--) {
    let isPivot = true;
    if (findLow) {
      for (let k = 1; k <= swingStrength; k++) {
        if (candles[i].low >= candles[i - k].low || candles[i].low >= candles[i + k].low) {
          isPivot = false;
          break;
        }
      }
      if (isPivot) {
        return {
          found: true,
          price: candles[i].low,
          time: candles[i].time,
          barsElapsed: total - 1 - i,
        };
      }
    } else {
      for (let k = 1; k <= swingStrength; k++) {
        if (candles[i].high <= candles[i - k].high || candles[i].high <= candles[i + k].high) {
          isPivot = false;
          break;
        }
      }
      if (isPivot) {
        return {
          found: true,
          price: candles[i].high,
          time: candles[i].time,
          barsElapsed: total - 1 - i,
        };
      }
    }
  }

  // Fallback to simple local min/max
  const recent = candles.slice(-20);
  if (findLow) {
    const minCandle = recent.reduce((min, c) => (c.low < min.low ? c : min), recent[0]);
    const idx = candles.indexOf(minCandle);
    return {
      found: true,
      price: minCandle.low,
      time: minCandle.time,
      barsElapsed: total - 1 - idx,
    };
  } else {
    const maxCandle = recent.reduce((max, c) => (c.high > max.high ? c : max), recent[0]);
    const idx = candles.indexOf(maxCandle);
    return {
      found: true,
      price: maxCandle.high,
      time: maxCandle.time,
      barsElapsed: total - 1 - idx,
    };
  }
}

/**
 * Checks harmonic Gann time cycle nodes (144 bar cycle: 21, 35, 49, 90, 144 or sqrt(price))
 */
export function checkGannTimeCycle(barsElapsed: number, anchorPrice: number): boolean {
  if (barsElapsed <= 0) return true;
  const factor = getUniversalScaleFactor(anchorPrice);
  const sqrtBars = Math.round(Math.sqrt(anchorPrice * factor));
  const cycleBar = barsElapsed % 144;

  if (
    Math.abs(cycleBar - 21) <= 1 ||
    Math.abs(cycleBar - 35) <= 1 ||
    Math.abs(cycleBar - 49) <= 1 ||
    Math.abs(cycleBar - 90) <= 2 ||
    Math.abs(cycleBar - 144) <= 2 ||
    (sqrtBars > 0 && Math.abs(barsElapsed % sqrtBars) <= 1)
  ) {
    return true;
  }
  return false;
}

/**
 * Calculates Structural Stop Loss below Swing Low or above Swing High + ATR buffer
 */
export function calculateStructuralSL(
  candles: Candle[],
  isLong: boolean,
  entryPrice: number,
  riskDistFallback: number,
  atr: number,
  digits: number = 5,
  point: number = 0.00001
): number {
  const atrBufferDist = atr > 0 ? atr * 0.5 : 10 * point;
  const anchor = getLatestGannSwingAnchor(candles, 2, isLong, 40);

  if (anchor.found) {
    const calculatedSL = isLong ? anchor.price - atrBufferDist : anchor.price + atrBufferDist;
    const dist = Math.abs(entryPrice - calculatedSL);

    // If within reasonable bounds (0.75x to 1.75x of fallback)
    if (dist >= riskDistFallback * 0.75 && dist <= riskDistFallback * 1.75) {
      return Number(calculatedSL.toFixed(digits));
    }
  }

  const fallback = isLong ? entryPrice - riskDistFallback : entryPrice + riskDistFallback;
  return Number(fallback.toFixed(digits));
}
