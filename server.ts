import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  initializeMarketData,
  emitBatchMarketTicks,
  fetchLiveExchangeRates,
  forceSyncLivePrices,
  syncAllRealMarketData,
  getAllCandleStores,
  getAllTicks,
} from './src/services/marketDataFeed';
import {
  scanMarketWatchSymbols,
  updateSignalRealtimeMetrics,
} from './src/services/sopMatrixScanner';
import {
  sendTradeSignalToTelegram,
  sendTargetHitToTelegram,
  sendStopLossHitToTelegram,
  sendBreakevenToTelegram,
  testTelegramConnection,
} from './src/services/telegramService';
import { TARGET_SYMBOLS } from './src/data/symbols';
import { isWeekendMarketClosed } from './src/services/shieldMonitor';
import {
  initializeDatabase,
  saveTradeSignalToDb,
  getTradeSignalsFromDb,
  getDatabaseStats,
  TURSO_DATABASE_URL,
} from './src/services/tursoDatabase';
import { TradeSignal } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
// Dev server in AI Studio must always listen on port 3000, while production (Railway/Docker) uses process.env.PORT
const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3000 : (Number(process.env.PORT) || 3000);

// Middleware for JSON parsing
app.use(express.json());

// ──────────────────────────────────────────────
// Fixed & Built-in Telegram Credentials (No Setup Needed on Railway)
// ──────────────────────────────────────────────
const BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || '8676995594:AAGUvAV4X8P_pwk0NbIKHEWMyZ7NgbktjOc';
const CHANNEL_ID: string = process.env.TELEGRAM_CHANNEL_ID || '-1004433974736';
const AUTO_SEND: boolean = process.env.AUTO_SEND_TELEGRAM !== 'false'; // Always send automatically 24/7

// In-Memory Storage for 24/7 Signals on Railway
const serverSignals: TradeSignal[] = [];
let backgroundScansCount = 0;
let lastScanTimestamp = Date.now();
let serverStartTime = Date.now();

interface SignalCooldownEntry {
  symbol: string;
  orderType: string;
  entryPrice: number;
  timestamp: number;
}

// Cooldown tracker per symbol to ensure continuous intraday signals while avoiding rapid spam or flipping
const symbolSignalCooldowns = new Map<string, SignalCooldownEntry>();

// Cooldown duration: 60 minutes minimum between any signals for the SAME symbol (prevents rapid flipping/whipsaw)
const SIGNAL_COOLDOWN_MS = 60 * 60 * 1000;

function normalizeServerSymbol(sym: string): string {
  return sym.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function canDispatchSignal(sig: TradeSignal): boolean {
  const symKey = normalizeServerSymbol(sig.symbol);
  const now = Date.now();

  // 1. Strict Anti-Duplicate Check: If an active unclosed signal already exists for this same currency, DO NOT dispatch another!
  const hasActiveSignal = serverSignals.some((s) => {
    const sKey = normalizeServerSymbol(s.symbol);
    const isClosed = s.status === 'TP4_HIT' || s.status === 'SL_HIT' || s.status === 'CANCELLED';
    return sKey === symKey && !isClosed;
  });

  if (hasActiveSignal) {
    return false;
  }

  // 2. Cooldown check per symbol
  const lastEntry = symbolSignalCooldowns.get(symKey);
  if (lastEntry) {
    if (now - lastEntry.timestamp < SIGNAL_COOLDOWN_MS) {
      return false;
    }
  }

  return true;
}

function recordDispatchedSignal(sig: TradeSignal) {
  const symKey = normalizeServerSymbol(sig.symbol);
  symbolSignalCooldowns.set(symKey, {
    symbol: sig.symbol,
    orderType: sig.orderType,
    entryPrice: sig.entryPrice,
    timestamp: Date.now(),
  });
}

// Track notified events per signal to prevent duplicate Telegram alerts
const notifiedSignalEvents = new Map<string, Set<string>>();

/**
 * Tracks active signals in real-time against incoming market ticks,
 * automatically detecting TP1, TP2, TP3, TP4 (Full Win) and Stop Loss hits,
 * and dispatching instant Telegram update notifications.
 */
function trackActiveSignalsLifeCycle() {
  if (serverSignals.length === 0) return;
  const currentTicks = getAllTicks();

  for (const sig of serverSignals) {
    if (sig.status === 'TP4_HIT' || sig.status === 'SL_HIT' || sig.status === 'CANCELLED') {
      continue;
    }

    const sym = TARGET_SYMBOLS.find((s) => s.symbol === sig.symbol || s.id === sig.symbol);
    if (!sym) continue;
    const tick = currentTicks[sym.id];
    if (!tick) continue;

    // Update real-time metrics (pips, PnL, target hit flags, trailing stop)
    const updated = updateSignalRealtimeMetrics(sig, tick, sym);
    Object.assign(sig, updated);

    if (!notifiedSignalEvents.has(sig.id)) {
      notifiedSignalEvents.set(sig.id, new Set<string>());
    }
    const events = notifiedSignalEvents.get(sig.id)!;

    // 1. Check TP1 Hit
    if (
      (sig.highestTargetHit === 'TP1' ||
        sig.highestTargetHit === 'TP2' ||
        sig.highestTargetHit === 'TP3' ||
        sig.highestTargetHit === 'TP4') &&
      !events.has('TP1')
    ) {
      events.add('TP1');
      console.log(`🎯 [Railway 24/7 Worker] TP1 Hit for ${sig.symbol}! Broadcasting update to Telegram...`);
      saveTradeSignalToDb(sig).catch(() => {});
      if (AUTO_SEND) {
        sendTargetHitToTelegram(sig, 'TP1', sig.livePips || 0, BOT_TOKEN, [CHANNEL_ID]).catch((err) =>
          console.warn('Telegram TP1 broadcast error:', err)
        );
      }
    }

    // 2. Check TP2 Hit
    if (
      (sig.highestTargetHit === 'TP2' ||
        sig.highestTargetHit === 'TP3' ||
        sig.highestTargetHit === 'TP4') &&
      !events.has('TP2')
    ) {
      events.add('TP2');
      console.log(`🚀 [Railway 24/7 Worker] TP2 Hit for ${sig.symbol}! Broadcasting update to Telegram...`);
      saveTradeSignalToDb(sig).catch(() => {});
      if (AUTO_SEND) {
        sendTargetHitToTelegram(sig, 'TP2', sig.livePips || 0, BOT_TOKEN, [CHANNEL_ID]).catch((err) =>
          console.warn('Telegram TP2 broadcast error:', err)
        );
      }
    }

    // 3. Check TP3 Hit
    if (
      (sig.highestTargetHit === 'TP3' || sig.highestTargetHit === 'TP4') &&
      !events.has('TP3')
    ) {
      events.add('TP3');
      console.log(`🎯 [Railway 24/7 Worker] TP3 Hit for ${sig.symbol}! Broadcasting update to Telegram...`);
      saveTradeSignalToDb(sig).catch(() => {});
      if (AUTO_SEND) {
        sendTargetHitToTelegram(sig, 'TP3', sig.livePips || 0, BOT_TOKEN, [CHANNEL_ID]).catch((err) =>
          console.warn('Telegram TP3 broadcast error:', err)
        );
      }
    }

    // 4. Check TP4 Full Target Hit
    if ((updated.status as string) === 'TP4_HIT' && !events.has('TP4')) {
      events.add('TP4');
      console.log(`🏆 [Railway 24/7 Worker] ALL TARGETS HIT (TP4) for ${sig.symbol}! Broadcasting full win to Telegram...`);
      saveTradeSignalToDb(sig).catch(() => {});
      if (AUTO_SEND) {
        sendTargetHitToTelegram(sig, 'TP4', sig.livePips || 0, BOT_TOKEN, [CHANNEL_ID]).catch((err) =>
          console.warn('Telegram TP4 broadcast error:', err)
        );
      }
    }

    // 5. Check SL Hit
    if ((updated.status as string) === 'SL_HIT' && !events.has('SL')) {
      events.add('SL');
      console.log(`🛑 [Railway 24/7 Worker] Stop Loss Hit for ${sig.symbol}. Broadcasting transparency update to Telegram...`);
      // Enforce post-SL cooldown: reset cooldown timestamp so no new trade can open on this currency immediately
      recordDispatchedSignal(sig);
      saveTradeSignalToDb(sig).catch(() => {});
      if (AUTO_SEND) {
        sendStopLossHitToTelegram(sig, sig.livePips || 0, BOT_TOKEN, [CHANNEL_ID]).catch((err) =>
          console.warn('Telegram SL broadcast error:', err)
        );
      }
    }
  }
}

/**
 * 24/7 Background Market Scanner & Telegram Auto-Dispatcher Worker
 * Runs continuously on the server regardless of whether any browser is open.
 */
async function start24x7BackgroundScanner() {
  console.log('🚀 [Railway 24/7 Worker] Starting 24/7 Background Strategy Scanner...');
  console.log(`📡 Telegram Channel: ${CHANNEL_ID} | Auto-Send: ${AUTO_SEND}`);

  // Initialize market data and immediately sync genuine interbank prices & candles
  initializeMarketData();
  try {
    await syncAllRealMarketData();
    console.log('✅ [Market Data] Initial real-time market prices & candles synchronized.');
  } catch (err) {
    console.warn('⚠️ [Market Data] Initial price sync error:', err);
  }

  // Periodic real market candles sync every 30 seconds
  setInterval(() => {
    syncAllRealMarketData().catch((err) => console.warn('⚠️ [Market Data] Periodic sync error:', err));
  }, 30000);

  // Micro-fluctuation loop every 3 seconds for realistic active chart ticking & live signal life-cycle tracking
  setInterval(() => {
    // Only tick if market is not in weekend closure
    if (!isWeekendMarketClosed()) {
      emitBatchMarketTicks();
    }
    // Track active signals life cycle against real market prices (TP1, TP2, TP3, TP4, SL)
    try {
      trackActiveSignalsLifeCycle();
    } catch (err) {
      console.warn('⚠️ [Signal Tracking] Error in life-cycle loop:', err);
    }
  }, 3000);

  // Core strategy scan interval (runs every 6 seconds 24/7)
  setInterval(async () => {
    try {
      backgroundScansCount++;
      lastScanTimestamp = Date.now();

      // Weekend Protection: if global market is closed, skip scanning to avoid invalid signals
      if (isWeekendMarketClosed()) {
        return;
      }

      const { signals } = scanMarketWatchSymbols({
        engine: 'intraday',
        scoreNeeded: 4,
      });

      if (signals.length > 0) {
        for (const sig of signals) {
          // Check if this signal passes cooldown & price-distance deduplication
          if (canDispatchSignal(sig)) {
            recordDispatchedSignal(sig);

            // Add to in-memory active signals list
            serverSignals.unshift(sig);
            if (serverSignals.length > 50) serverSignals.pop();

            console.log(`⚡ [Railway 24/7 Worker] Confirmed Signal: ${sig.symbol} ${sig.orderType} (Score: ${sig.score}/5) @ ${sig.entryPrice}`);

            // Persist to Turso LibSQL Database
            saveTradeSignalToDb(sig)
              .then((res) => {
                if (res.success) {
                  console.log(`💾 [Turso Database] Signal ${sig.id} (${sig.symbol}) successfully persisted!`);
                }
              })
              .catch((err) => console.warn(`⚠️ [Turso Database] Save error:`, err));

            // Auto-send to Telegram if enabled
            if (AUTO_SEND) {
              const destinations = [CHANNEL_ID];

              console.log(`📤 [Railway 24/7 Worker] Auto-dispatching signal to Telegram targets:`, destinations);
              const sendResult = await sendTradeSignalToTelegram(sig, BOT_TOKEN, destinations);

              if (sendResult.success) {
                sig.telegramSent = true;
                console.log(`✅ [Railway 24/7 Worker] Signal ${sig.symbol} broadcasted to Telegram successfully!`);
                // Update telegram_sent status in database
                saveTradeSignalToDb(sig).catch(() => {});
              } else {
                console.warn(`⚠️ [Railway 24/7 Worker] Telegram send failed:`, sendResult.error);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ [Railway 24/7 Worker] Scan loop error:', err);
    }
  }, 6000);
}

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────

// Health check endpoint (Railway uses this to verify deployment health)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    serverPort: PORT,
  });
});

// Real-time market prices endpoint for client sync
app.get('/api/market-data', (req, res) => {
  const ticks = getAllTicks();
  res.json({
    ticks,
    timestamp: Date.now(),
    isWeekendClosed: isWeekendMarketClosed(),
  });
});

// Trigger immediate market price refresh from live feeds
app.post('/api/market-data/sync', async (req, res) => {
  await syncAllRealMarketData();
  const ticks = getAllTicks();
  res.json({
    success: true,
    ticks,
    timestamp: Date.now(),
    isWeekendClosed: isWeekendMarketClosed(),
  });
});

// Real-time market multi-timeframe candles endpoint (serves real market candles to frontend without CORS)
app.get('/api/market-candles', (req, res) => {
  const stores = getAllCandleStores();
  res.json({
    success: true,
    stores,
    timestamp: Date.now(),
  });
});

// Single symbol real candles endpoint
app.get('/api/market-candles/:id', (req, res) => {
  const stores = getAllCandleStores();
  const symbolId = req.params.id;
  res.json({
    success: true,
    symbolId,
    store: stores[symbolId] || null,
    timestamp: Date.now(),
  });
});

// Railway 24/7 Worker Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Forex Trade Analyzer 24/7 Engine',
    uptimeHours: Number((process.uptime() / 3600).toFixed(2)),
    startTime: new Date(serverStartTime).toISOString(),
    totalBackgroundScans: backgroundScansCount,
    lastScanAt: new Date(lastScanTimestamp).toISOString(),
    activeSignalsCount: serverSignals.length,
    telegram: {
      channelId: CHANNEL_ID,
      autoSend: AUTO_SEND,
    },
  });
});

// Get recent signals detected by the 24/7 worker
app.get('/api/signals', (req, res) => {
  res.json({
    signals: serverSignals,
    count: serverSignals.length,
    timestamp: Date.now(),
  });
});

// Manual trigger for sending target hit or breakeven update to Telegram from frontend
app.post('/api/signals/notify-update', async (req, res) => {
  try {
    const { signalId, updateType, pips } = req.body;
    let signal = serverSignals.find((s) => s.id === signalId);
    if (!signal) {
      // Fallback: fetch from database
      const dbRes = await getTradeSignalsFromDb(50);
      signal = dbRes.signals?.find((s) => s.id === signalId);
    }

    if (!signal) {
      return res.status(404).json({ success: false, error: 'لم يتم العثور على الصفقة المحددة' });
    }

    let result;
    if (updateType === 'TP1' || updateType === 'TP2' || updateType === 'TP3' || updateType === 'TP4') {
      result = await sendTargetHitToTelegram(signal, updateType, pips || signal.livePips || 0, BOT_TOKEN, [CHANNEL_ID]);
    } else if (updateType === 'SL') {
      result = await sendStopLossHitToTelegram(signal, pips || signal.livePips || 0, BOT_TOKEN, [CHANNEL_ID]);
    } else if (updateType === 'BREAKEVEN') {
      result = await sendBreakevenToTelegram(signal, BOT_TOKEN, [CHANNEL_ID]);
    } else if (updateType === 'NEW_SIGNAL') {
      result = await sendTradeSignalToTelegram(signal, BOT_TOKEN, [CHANNEL_ID]);
    } else {
      return res.status(400).json({ success: false, error: 'نوع التحديث غير صالح' });
    }

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Test Telegram connection endpoint
app.post('/api/telegram/test', async (req, res) => {
  try {
    const targets = [CHANNEL_ID];

    const result = await testTelegramConnection(BOT_TOKEN, targets);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ──────────────────────────────────────────────
// Turso Database Endpoints
// ──────────────────────────────────────────────

// Get Turso Database connection status and signal statistics
app.get('/api/database/status', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json({
      status: stats.error ? 'error' : 'connected',
      databaseUrl: TURSO_DATABASE_URL,
      stats,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', error: message });
  }
});

// Retrieve persisted trade signals from Turso database
app.get('/api/database/signals', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const { signals, error } = await getTradeSignalsFromDb(limit);
    if (error) {
      res.status(500).json({ success: false, error, signals: [] });
    } else {
      res.json({ success: true, signals, count: signals.length });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message, signals: [] });
  }
});

// Save or manually insert/update a trade signal into Turso database
app.post('/api/database/signals', async (req, res) => {
  try {
    const signal: TradeSignal = req.body;
    if (!signal || !signal.id || !signal.symbol) {
      return res.status(400).json({ success: false, error: 'Invalid trade signal data' });
    }

    const saveResult = await saveTradeSignalToDb(signal);
    res.json(saveResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ──────────────────────────────────────────────
// Vite Middleware / Static Serving
// ──────────────────────────────────────────────
async function startServer() {
  // Initialize Turso Cloud Database Schema
  try {
    console.log('📦 [Turso Database] Connecting to LibSQL database at:', TURSO_DATABASE_URL);
    await initializeDatabase();
  } catch (dbErr) {
    console.warn('⚠️ [Turso Database] Initial connection warning:', dbErr);
  }

  // Start the 24/7 background worker
  start24x7BackgroundScanner();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Server running 24/7 on port ${PORT}`);
    console.log(`🌐 Health check available at http://0.0.0.0:${PORT}/api/health`);
  });
}

startServer();
