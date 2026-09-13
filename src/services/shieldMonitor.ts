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

  // Active Sessions
  const activeSessions: string[] = [];
  if (curMin >= 0 && curMin < 9 * 60) activeSessions.push('طوكيو (Asian)');
  if (curMin >= 8 * 60 && curMin < 17 * 60) activeSessions.push('لندن (London)');
  if (curMin >= 13 * 60 && curMin < 22 * 60) activeSessions.push('نيويورك (New York)');

  // Main trading window 08:00 - 19:00 server (UTC+2 = 06:00 - 17:00 UTC)
  const isSessionActive =
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
    isSessionActive,
    isNewsUpcoming: false,
    isDailyLossHit: false,
    isDailyTargetHit: false,
    serverTimeUTC: `${String(utcHour).padStart(2, '0')}:${String(utcMin).padStart(2, '0')} UTC`,
    activeSessions,
  };
}
