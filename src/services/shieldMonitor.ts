import { ShieldStatus } from '../types';

// 5. Weekend Market Closure (Friday 21:00 UTC through Sunday 21:00 UTC)
export function isWeekendMarketClosed(date = new Date()): boolean {
  const utcDay = date.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const utcHour = date.getUTCHours();
  const utcMin = date.getUTCMinutes();
  const curMin = utcHour * 60 + utcMin;

  return (
    utcDay === 6 || // All of Saturday
    (utcDay === 0 && curMin < 21 * 60) || // Sunday before 21:00 UTC
    (utcDay === 5 && curMin >= 21 * 60) // Friday after 21:00 UTC
  );
}

/**
 * Late New York & Rollover Shield: 19:00 - 23:15 UTC
 * Prevents entries when New York volume dies down and spreads widen.
 */
export function isLateNyOrRolloverBlocked(date = new Date()): boolean {
  const utcHour = date.getUTCHours();
  const utcMin = date.getUTCMinutes();
  const curMin = utcHour * 60 + utcMin;
  return curMin >= 19 * 60 && curMin <= 23 * 60 + 15;
}

/**
 * Asian Session Cross-Pairs Shield
 * Blocks volatile cross pairs (GBPJPY, EURJPY, GBPAUD) during Asian hours (23:00 - 07:30 UTC)
 * because Asian action is largely a consolidation trap that gets whipped out at London Open.
 */
export function isAsianCrossPairBlocked(symbol: string, date = new Date()): boolean {
  const symClean = symbol.replace(/[^A-Za-z]/g, '').toUpperCase();
  const isVolatileCross =
    symClean.includes('GBPJPY') ||
    symClean.includes('EURJPY') ||
    symClean.includes('GBPAUD') ||
    symClean.includes('EURAUD');

  if (!isVolatileCross) return false;

  const utcHour = date.getUTCHours();
  const utcMin = date.getUTCMinutes();
  const curMin = utcHour * 60 + utcMin;

  // Between 23:00 UTC and 07:30 UTC (until 30 mins after London opens)
  return curMin >= 23 * 60 || curMin < 7 * 60 + 30;
}

export function getShieldStatus(): ShieldStatus {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Sun, 5 = Fri
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const curMin = utcHour * 60 + utcMin;

  // 1. London Fix: 15:45 - 16:15 UTC (945 - 975 mins)
  const isLondonFixBlocked = curMin >= 15 * 60 + 45 && curMin <= 16 * 60 + 15;

  // 2. Rollover Window: 21:45 - 23:15 UTC (1305 - 1395 mins)
  const isRolloverBlocked = curMin >= 21 * 60 + 45 && curMin <= 23 * 60 + 15;

  // 3. Friday Afternoon Filter: No entry after 13:00 UTC on Friday
  const isFridayAfternoonBlocked = utcDay === 5 && utcHour >= 13;

  // 4. Sunday Open: 21:00 - 23:30 UTC
  const isSundayOpenBlocked = utcDay === 0 && curMin >= 21 * 60 && curMin <= 23 * 60 + 30;

  // 5. Weekend Market Closure
  const isWeekendBlocked = isWeekendMarketClosed(now);

  // Active Sessions (Only populated if NOT in weekend closure)
  const activeSessions: string[] = [];
  if (!isWeekendBlocked) {
    if (curMin >= 0 && curMin < 9 * 60) activeSessions.push('طوكيو (Asian)');
    if (curMin >= 8 * 60 && curMin < 17 * 60) activeSessions.push('لندن (London)');
    if (curMin >= 13 * 60 && curMin < 22 * 60) activeSessions.push('نيويورك (New York)');
  }

  // Main trading window
  const isSessionActive =
    !isWeekendBlocked &&
    !isLondonFixBlocked &&
    !isRolloverBlocked &&
    !isFridayAfternoonBlocked &&
    !isSundayOpenBlocked &&
    activeSessions.length > 0;

  return {
    isLondonFixBlocked,
    isRolloverBlocked,
    isFridayAfternoonBlocked,
    isSundayOpenBlocked,
    isWeekendBlocked,
    isSessionActive,
    isNewsUpcoming: false,
    isDailyLossHit: false,
    isDailyTargetHit: false,
    serverTimeUTC: `${String(utcHour).padStart(2, '0')}:${String(utcMin).padStart(2, '0')} UTC`,
    activeSessions,
  };
}
