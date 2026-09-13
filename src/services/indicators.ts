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
