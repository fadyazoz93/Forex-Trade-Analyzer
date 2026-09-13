import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initializeMarketData, emitBatchMarketTicks, fetchLiveExchangeRates, forceSyncLivePrices } from './src/services/marketDataFeed';
import { scanMarketWatchSymbols } from './src/services/sopMatrixScanner';
import { sendTradeSignalToTelegram, testTelegramConnection } from './src/services/telegramService';
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
const sentSignalKeys = new Set<string>();
let backgroundScansCount = 0;
let lastScanTimestamp = Date.now();
let serverStartTime = Date.now();

// Generate unique key to prevent duplicate sends on the same price level
const getSignalKey = (s: TradeSignal) => `${s.symbol}_${s.orderType}_${s.entryPrice.toFixed(2)}`;

/**
 * 24/7 Background Market Scanner & Telegram Auto-Dispatcher Worker
 * Runs continuously on the server regardless of whether any browser is open.
 */
function start24x7BackgroundScanner() {
  console.log('🚀 [Railway 24/7 Worker] Starting 24/7 Background Strategy Scanner...');
  console.log(`📡 Telegram Channel: ${CHANNEL_ID} | Auto-Send: ${AUTO_SEND}`);

  // Initialize market data and live sync
  initializeMarketData();
  forceSyncLivePrices().catch((err) => console.warn('Live price sync error:', err));

  // Sync exchange rates every 60 seconds
  setInterval(() => {
    fetchLiveExchangeRates().catch((err) => console.warn('Rate sync error:', err));
  }, 60000);

  // Market tick simulation loop every 2 seconds
  setInterval(() => {
    emitBatchMarketTicks();
  }, 2000);

  // Core strategy scan interval (runs every 6 seconds 24/7)
  setInterval(async () => {
    try {
      backgroundScansCount++;
      lastScanTimestamp = Date.now();

      const { signals } = scanMarketWatchSymbols({
        engine: 'intraday',
        scoreNeeded: 4,
      });

      if (signals.length > 0) {
        for (const sig of signals) {
          const sigKey = getSignalKey(sig);

          // If this is a newly discovered confluence signal
          if (!sentSignalKeys.has(sigKey)) {
            sentSignalKeys.add(sigKey);

            // Add to in-memory active signals list
            serverSignals.unshift(sig);
            if (serverSignals.length > 50) serverSignals.pop();

            console.log(`⚡ [Railway 24/7 Worker] Confirmed Signal: ${sig.symbol} ${sig.orderType} (Score: ${sig.score}/5)`);

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
