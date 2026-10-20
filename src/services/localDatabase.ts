import fs from 'fs';
import path from 'path';
import { TradeSignal } from '../types';

// In-memory cache for high-speed, zero-cloud operations
const inMemorySignals: Map<string, TradeSignal> = new Map();

// Distributed in-memory anti-duplicate broadcast locks (symbol -> timestamp)
const broadcastLocks: Map<string, number> = new Map();

// Local file storage configuration (capped at 100 signals max to keep file size < 50 KB)
const MAX_STORED_SIGNALS = 100;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'signals_store.json');
const METADATA_FILE = path.join(DATA_DIR, 'storage_metadata.json');

let saveTimeout: NodeJS.Timeout | null = null;
let lastWeeklyCleanupTime: number = 0;

/**
 * Load metadata including last weekly cleanup timestamp
 */
function loadMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const meta = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
      if (meta && meta.lastWeeklyCleanupTime) {
        lastWeeklyCleanupTime = Number(meta.lastWeeklyCleanupTime);
      }
    }
  } catch (err) {
    console.warn('⚠️ [Local Database] Could not read metadata file:', err);
  }
}

/**
 * Save metadata to disk
 */
function saveMetadata() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      METADATA_FILE,
      JSON.stringify(
        {
          lastWeeklyCleanupTime,
          weeklyCleanupEnabled: true,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (err) {
    console.warn('⚠️ [Local Database] Could not save metadata file:', err);
  }
}

/**
 * Initialize local storage system: load existing signals from disk into memory
 */
export async function initializeDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    loadMetadata();

    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      if (content.trim()) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          inMemorySignals.clear();
          for (const sig of parsed) {
            if (sig && sig.id) {
              inMemorySignals.set(sig.id, sig);
            }
          }
          console.log(`✅ [Local Database] Loaded ${inMemorySignals.size} signals from local storage.`);
        }
      }
    }

    console.log('✅ [Local Database] Local lightweight storage initialized successfully (Zero Cloud Quota, No Turso).');
    
    // Check if initial weekly cleanup is due
    checkAndRunScheduledWeeklyCleanup();

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ [Local Database] Init warning (continuing with in-memory):', errorMsg);
    return { success: true }; // Still succeed with in-memory
  }
}

/**
 * Persist in-memory signals to disk asynchronously with debounce to protect disk I/O
 */
function scheduleDiskSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const signalsList = Array.from(inMemorySignals.values())
        .sort((a, b) => b.time - a.time)
        .slice(0, MAX_STORED_SIGNALS);

      fs.writeFileSync(DATA_FILE, JSON.stringify(signalsList, null, 2), 'utf-8');
    } catch (err) {
      console.warn('⚠️ [Local Database] Failed to write signals to disk:', err);
    }
  }, 1000);
}

/**
 * Save or update a trade signal in local memory & disk
 */
export async function saveTradeSignalToDb(signal: TradeSignal): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = inMemorySignals.get(signal.id);
    if (existing) {
      // Merge updates
      inMemorySignals.set(signal.id, {
        ...existing,
        ...signal,
        currentPrice: signal.currentPrice ?? existing.currentPrice ?? signal.entryPrice,
        status: signal.status || existing.status,
        livePips: signal.livePips ?? existing.livePips,
        livePnL: signal.livePnL ?? existing.livePnL,
        highestTargetHit: signal.highestTargetHit ?? existing.highestTargetHit,
        telegramSent: signal.telegramSent ?? existing.telegramSent,
      });
    } else {
      inMemorySignals.set(signal.id, {
        ...signal,
        comment: 'Local Storage Persistent',
      });
    }

    // Enforce max limit by evicting oldest if exceeded
    if (inMemorySignals.size > MAX_STORED_SIGNALS * 1.5) {
      const sorted = Array.from(inMemorySignals.values()).sort((a, b) => b.time - a.time);
      const pruned = sorted.slice(0, MAX_STORED_SIGNALS);
      inMemorySignals.clear();
      for (const s of pruned) inMemorySignals.set(s.id, s);
    }

    scheduleDiskSave();
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [Local Database] Failed to save signal ${signal.id}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get trade signals from local storage, ordered by latest
 */
export async function getTradeSignalsFromDb(limit = 100): Promise<{ signals: TradeSignal[]; error?: string }> {
  try {
    const signals = Array.from(inMemorySignals.values())
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);

    return { signals };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { signals: [], error: errorMsg };
  }
}

/**
 * Get Database Statistics from local storage
 */
export async function getDatabaseStats(): Promise<{
  totalCount: number;
  activeCount: number;
  tpCount: number;
  slCount: number;
  storageType: string;
  lastWeeklyCleanupTime: number;
  weeklyCleanupEnabled: boolean;
  error?: string;
}> {
  try {
    const signals = Array.from(inMemorySignals.values());
    const totalCount = signals.length;
    let activeCount = 0;
    let tpCount = 0;
    let slCount = 0;

    for (const sig of signals) {
      if (sig.status === 'ACTIVE') {
        activeCount++;
      } else if (
        sig.status === 'TP1_HIT' ||
        sig.status === 'TP2_HIT' ||
        sig.status === 'TP3_HIT' ||
        sig.status === 'TP4_HIT' ||
        sig.status === 'BREAKEVEN_HIT' ||
        sig.highestTargetHit === 'TP1' ||
        sig.highestTargetHit === 'TP2' ||
        sig.highestTargetHit === 'TP3' ||
        sig.highestTargetHit === 'TP4'
      ) {
        tpCount++;
      } else if (sig.status === 'SL_HIT') {
        slCount++;
      }
    }

    return {
      totalCount,
      activeCount,
      tpCount,
      slCount,
      storageType: 'Local High-Speed Storage (No Turso)',
      lastWeeklyCleanupTime,
      weeklyCleanupEnabled: true,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      totalCount: 0,
      activeCount: 0,
      tpCount: 0,
      slCount: 0,
      storageType: 'Local',
      lastWeeklyCleanupTime,
      weeklyCleanupEnabled: true,
      error: errorMsg,
    };
  }
}

/**
 * Anti-Duplicate Broadcast Lock: Prevents duplicate signal broadcasting for the same symbol
 * Operates purely in-memory with automatic TTL cleanup — no external cloud queries or quota usage!
 */
export async function claimTelegramSignalBroadcast(
  symbol: string,
  orderType: string,
  entryPrice: number,
  cooldownMinutes: number = 60
): Promise<boolean> {
  const cleanSym = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;

  // Cleanup expired locks periodically
  broadcastLocks.forEach((lockTime, sym) => {
    if (now - lockTime > cooldownMs) {
      broadcastLocks.delete(sym);
    }
  });

  const lastSentTime = broadcastLocks.get(cleanSym);
  if (lastSentTime && now - lastSentTime < cooldownMs) {
    const minutesLeft = Math.ceil((cooldownMs - (now - lastSentTime)) / (60 * 1000));
    console.log(`🛑 [Local Lock] Blocked duplicate broadcast for ${cleanSym}: cooldown active (${minutesLeft}m remaining)`);
    return false;
  }

  // Claim lock
  broadcastLocks.set(cleanSym, now);
  console.log(`🔒 [Local Lock] Claimed broadcast lock for ${cleanSym} (${orderType} @ ${entryPrice})`);
  return true;
}

/**
 * Perform weekly data cleanup:
 * - Keeps live active trades intact if preserveActive is true
 * - Cleans past closed/completed trades from the previous week
 * - Clears stale broadcast locks
 * - Saves optimized storage state to disk
 */
export async function performWeeklyCleanup(
  options: { preserveActive?: boolean } = { preserveActive: true }
): Promise<{
  success: boolean;
  removedCount: number;
  retainedCount: number;
  lastWeeklyCleanupTime: number;
  error?: string;
}> {
  try {
    const preserveActive = options.preserveActive ?? true;
    const initialCount = inMemorySignals.size;
    const retainedSignals: TradeSignal[] = [];

    for (const sig of inMemorySignals.values()) {
      if (preserveActive && sig.status === 'ACTIVE') {
        retainedSignals.push(sig);
      }
    }

    // Reset store with retained active signals (or empty if preserveActive = false)
    inMemorySignals.clear();
    for (const sig of retainedSignals) {
      inMemorySignals.set(sig.id, sig);
    }

    // Clear broadcast locks for the fresh week
    broadcastLocks.clear();

    // Update cleanup timestamp
    lastWeeklyCleanupTime = Date.now();
    saveMetadata();

    // Write clean state to disk immediately
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(retainedSignals, null, 2), 'utf-8');

    const removedCount = initialCount - retainedSignals.length;
    console.log(
      `🧹 [Local Database] Weekly cleanup completed: ${removedCount} closed trades removed, ${retainedSignals.length} active trades retained. Storage pristine for the new trading week!`
    );

    return {
      success: true,
      removedCount,
      retainedCount: retainedSignals.length,
      lastWeeklyCleanupTime,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ [Local Database] Weekly cleanup failed:', errorMsg);
    return {
      success: false,
      removedCount: 0,
      retainedCount: inMemorySignals.size,
      lastWeeklyCleanupTime,
      error: errorMsg,
    };
  }
}

/**
 * Scheduled check: triggers weekly cleanup automatically on weekends (Saturday / Sunday)
 * or if > 6.5 days have passed since the last cleanup.
 */
export function checkAndRunScheduledWeeklyCleanup(): boolean {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const msSinceLastCleanup = Date.now() - lastWeeklyCleanupTime;
  const daysSinceLast = msSinceLastCleanup / (24 * 60 * 60 * 1000);

  // Run on Saturday or Sunday if at least 5 days have passed since last cleanup
  const isWeekend = utcDay === 6 || utcDay === 0;

  if (isWeekend && daysSinceLast >= 5) {
    console.log(`⏰ [Local Database] Weekend detected (Day ${utcDay}). Executing scheduled weekly maintenance...`);
    performWeeklyCleanup({ preserveActive: true }).catch((err) =>
      console.warn('Weekly scheduled cleanup error:', err)
    );
    return true;
  }

  // Fallback: if more than 7 days have passed regardless of day, run weekly maintenance
  if (lastWeeklyCleanupTime > 0 && daysSinceLast >= 7) {
    console.log(`⏰ [Local Database] 7 days elapsed since last maintenance. Executing weekly cleanup...`);
    performWeeklyCleanup({ preserveActive: true }).catch((err) =>
      console.warn('Weekly scheduled cleanup error:', err)
    );
    return true;
  }

  return false;
}

/**
 * Clear all stored signals completely (Manual Full Reset)
 */
export async function clearLocalDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    inMemorySignals.clear();
    broadcastLocks.clear();
    if (fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    }
    lastWeeklyCleanupTime = Date.now();
    saveMetadata();
    console.log('🧹 [Local Database] Storage cleared completely.');
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}
