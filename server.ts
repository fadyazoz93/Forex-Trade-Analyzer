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
import { scanMarketWatchSymbols } from './src/services/sopMatrixScanner';
import { sendTradeSignalToTelegram, testTelegramConnection } from './src/services/telegramService';
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
const PORT = Number(process.env.PORT) || 3000;

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

// Cooldown duration: 60 minutes per symbol, or if price shifts by > 40 pips / $15
const SIGNAL_COOLDOWN_MS = 60 * 60 * 1000;

function canDispatchSignal(sig: TradeSignal): boolean {
  const symKey = sig.symbol;
  const now = Date.now();
  const lastEntry = symbolSignalCooldowns.get(symKey);

  if (!lastEntry) {
    return true;
  }

  // Allow after cooldown has elapsed
  if (now - lastEntry.timestamp >= SIGNAL_COOLDOWN_MS) {
    return true;
  }

  // Allow if same direction and price moved significantly (> 40 pips on Forex, > $15 on Gold)
  const isMetal = sig.symbol.includes('XAU') || sig.symbol.includes('XAG');
  const pipDistance = isMetal ? 15.0 : 0.0040;
  if (sig.orderType === lastEntry.orderType && Math.abs(sig.entryPrice - lastEntry.entryPrice) >= pipDistance) {
    return true;
  }

  return false;
}

function recordDispatchedSignal(sig: TradeSignal) {
  const symKey = sig.symbol;
  symbolSignalCooldowns.set(symKey, {
    symbol: sig.symbol,
    orderType: sig.orderType,
    entryPrice: sig.entryPrice,
    timestamp: Date.now(),
  });
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

  // Micro-fluctuation loop every 3 seconds for realistic active chart ticking
  setInterval(() => {
    // Only tick if market is not in weekend closure
    if (!isWeekendMarketClosed()) {
      emitBatchMarketTicks();
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
      server: { middlewareMode: true },
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
