// Turso database has been decommissioned and replaced by lightweight local storage
// to eliminate external storage quotas and cloud limits per user request.

export {
  initializeDatabase,
  saveTradeSignalToDb,
  getTradeSignalsFromDb,
  getDatabaseStats,
  claimTelegramSignalBroadcast,
  clearLocalDatabase,
  performWeeklyCleanup,
  checkAndRunScheduledWeeklyCleanup,
} from './localDatabase';

export const TURSO_DATABASE_URL = 'local://in-memory-storage';
export const TURSO_AUTH_TOKEN = '';
