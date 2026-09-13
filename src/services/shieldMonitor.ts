import { ShieldStatus } from '../types';

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

  // 5. Weekend Market Closure (Friday 21:00 UTC through Sunday 21:00 UTC)
  const isWeekendBlocked =
    utcDay === 6 || // All of Saturday
    (utcDay === 0 && curMin < 21 * 60) || // Sunday before 21:00 UTC
    (utcDay === 5 && curMin >= 21 * 60); // Friday after 21:00 UTC

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
