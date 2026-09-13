import { createClient } from '@libsql/client';
import { TradeSignal } from '../types';

export const TURSO_DATABASE_URL =
  process.env.TURSO_DATABASE_URL ||
  'libsql://forex-trade-analysis-fadyezzaat.aws-eu-west-1.turso.io';

export const TURSO_AUTH_TOKEN =
  process.env.TURSO_AUTH_TOKEN ||
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkyNTQ1MjIsImlkIjoiMDFhMDk3ZDgtNTcwMS03YTY1LWEzYjItYzc2MjdlNTY5YTkwIiwia2lkIjoidks5OUtiM0x1aVJpa0NDQjBtQWhYVXpnVGJ4ZTEtaTBtZ3hLZFo0czhjUSIsInJpZCI6IjNiYTU0YzkyLTljMDctNGY4Ny04MzhkLTQxZjQ1MzIwZTNmNyJ9.WQlSAAXDsWeUlOK-EUAVcaWIptWNJkzhOf6eoLXV7El4-r_O_h47BDMM7nNpLum-wzMjveblud-t8apmYsNGCg';

export const tursoClient = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

/**
 * Initialize Database Schema on Turso
 */
export async function initializeDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS trade_signals (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        engine TEXT NOT NULL,
        magic_number INTEGER,
        order_type TEXT NOT NULL,
        is_limit INTEGER DEFAULT 0,
        entry_price REAL NOT NULL,
        current_price REAL,
        sl_price REAL NOT NULL,
        tp1 REAL,
        tp2 REAL,
        tp3 REAL,
        tp4 REAL,
        risk_distance REAL,
        risk_reward_ratio TEXT,
        score INTEGER,
        status TEXT DEFAULT 'ACTIVE',
        lot_size REAL,
        live_pips REAL DEFAULT 0,
        live_pnl REAL DEFAULT 0,
        highest_target_hit TEXT,
        telegram_sent INTEGER DEFAULT 0,
        time INTEGER NOT NULL,
        time_formatted TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_signals_time ON trade_signals(time DESC);
    `);

    console.log('✅ [Turso Database] Schema initialized successfully on LibSQL cloud!');
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ [Turso Database] Initialization failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Save or update a trade signal in Turso database
 */
export async function saveTradeSignalToDb(signal: TradeSignal): Promise<{ success: boolean; error?: string }> {
  try {
    const tp1 = signal.tpTargets?.tp1 ?? null;
    const tp2 = signal.tpTargets?.tp2 ?? null;
    const tp3 = signal.tpTargets?.tp3 ?? null;
    const tp4 = signal.tpTargets?.tp4 ?? null;
    const isLimit = signal.isLimit ? 1 : 0;
    const telegramSent = signal.telegramSent ? 1 : 0;
    const currentPrice = signal.currentPrice ?? signal.entryPrice;

    await tursoClient.execute({
      sql: `
        INSERT INTO trade_signals (
          id, symbol, engine, magic_number, order_type, is_limit,
          entry_price, current_price, sl_price, tp1, tp2, tp3, tp4,
          risk_distance, risk_reward_ratio, score, status, lot_size,
          live_pips, live_pnl, highest_target_hit, telegram_sent,
          time, time_formatted
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          current_price = excluded.current_price,
          status = excluded.status,
          live_pips = excluded.live_pips,
          live_pnl = excluded.live_pnl,
          highest_target_hit = excluded.highest_target_hit,
          telegram_sent = excluded.telegram_sent;
      `,
      args: [
        signal.id,
        signal.symbol,
        signal.engine || 'intraday',
        signal.magicNumber || 1001,
        signal.orderType,
        isLimit,
        signal.entryPrice,
        currentPrice,
        signal.slPrice,
        tp1,
        tp2,
        tp3,
        tp4,
        signal.riskDistance || 0,
        signal.riskRewardRatio || '1:2',
        signal.score || 5,
        signal.status || 'ACTIVE',
        signal.lotSize || 0.1,
        signal.livePips || 0,
        signal.livePnL || 0,
        signal.highestTargetHit || null,
        telegramSent,
        signal.time,
        signal.timeFormatted || new Date(signal.time).toISOString(),
      ],
    });

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [Turso Database] Failed to save signal ${signal.id}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get all trade signals from Turso database, ordered by latest
 */
export async function getTradeSignalsFromDb(limit = 100): Promise<{ signals: TradeSignal[]; error?: string }> {
  try {
    const res = await tursoClient.execute({
      sql: `
        SELECT * FROM trade_signals
        ORDER BY time DESC
        LIMIT ?;
      `,
      args: [limit],
    });

    const signals: TradeSignal[] = res.rows.map((row) => ({
      id: String(row.id),
      symbol: String(row.symbol),
      engine: (row.engine as any) || 'intraday',
      magicNumber: Number(row.magic_number) || 1001,
      orderType: String(row.order_type) as any,
      isLimit: Boolean(row.is_limit),
      entryPrice: Number(row.entry_price),
      currentPrice: row.current_price !== null ? Number(row.current_price) : undefined,
      slPrice: Number(row.sl_price),
      tpTargets: {
        tp1: Number(row.tp1),
        tp2: Number(row.tp2),
        tp3: Number(row.tp3),
        tp4: Number(row.tp4),
      },
      riskDistance: Number(row.risk_distance),
      riskRewardRatio: String(row.risk_reward_ratio),
      score: Number(row.score),
      gates: {} as any, // Gates details can be retrieved or populated as needed
      status: (row.status as any) || 'ACTIVE',
      time: Number(row.time),
      timeFormatted: String(row.time_formatted),
      comment: 'Turso Persistent',
      telegramSent: Boolean(row.telegram_sent),
      lotSize: Number(row.lot_size),
      livePips: Number(row.live_pips),
      livePnL: Number(row.live_pnl),
      highestTargetHit: (row.highest_target_hit as any) || null,
    }));

    return { signals };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ [Turso Database] Failed to fetch signals:', errorMsg);
    return { signals: [], error: errorMsg };
  }
}

/**
 * Get Database Statistics
 */
export async function getDatabaseStats(): Promise<{
  totalCount: number;
  activeCount: number;
  tpCount: number;
  slCount: number;
  error?: string;
}> {
  try {
    const countRes = await tursoClient.execute('SELECT COUNT(*) as count FROM trade_signals;');
    const activeRes = await tursoClient.execute("SELECT COUNT(*) as count FROM trade_signals WHERE status = 'ACTIVE';");
    const tpRes = await tursoClient.execute("SELECT COUNT(*) as count FROM trade_signals WHERE status = 'CLOSED_PROFIT' OR highest_target_hit IS NOT NULL;");
    const slRes = await tursoClient.execute("SELECT COUNT(*) as count FROM trade_signals WHERE status = 'CLOSED_LOSS';");

    return {
      totalCount: Number(countRes.rows[0]?.count ?? 0),
      activeCount: Number(activeRes.rows[0]?.count ?? 0),
      tpCount: Number(tpRes.rows[0]?.count ?? 0),
      slCount: Number(slRes.rows[0]?.count ?? 0),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { totalCount: 0, activeCount: 0, tpCount: 0, slCount: 0, error: errorMsg };
  }
}
