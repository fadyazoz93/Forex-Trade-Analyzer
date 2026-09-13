import { TARGET_SYMBOLS } from '../data/symbols';
import { Candle, LiveFeedStatus, MarketTick, SymbolConfig, Timeframe } from '../types';

interface SymbolCandleStore {
  D1: Candle[];
  H4: Candle[];
  H1: Candle[];
  M15: Candle[];
  M5: Candle[];
  M1: Candle[];
}

const candleDatabase = new Map<string, SymbolCandleStore>();
const latestTicks = new Map<string, MarketTick>();

type TickSubscriber = (ticks: Record<string, MarketTick>, updatedSymbols: SymbolConfig[]) => void;
const subscribers = new Set<TickSubscriber>();

type StatusSubscriber = (status: LiveFeedStatus) => void;
const statusSubscribers = new Set<StatusSubscriber>();

let liveFeedStatus: LiveFeedStatus = {
  isConnected: true,
  source: 'binance_live',
  sourceLabel: 'Binance Spot Feed (PAXG/XAU) + Interbank FX',
  lastSyncTime: Date.now(),
  latencyMs: 85,
  goldSpot: 4348.50,
  silverSpot: 64.45,
  isStreaming: true,
  totalTicksReceived: 0,
};

let webSocketInstance: WebSocket | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let fxTimer: NodeJS.Timeout | null = null;

export function subscribeToRealtimeTicks(callback: TickSubscriber): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function subscribeToFeedStatus(callback: StatusSubscriber): () => void {
  statusSubscribers.add(callback);
  callback(liveFeedStatus);
  return () => {
    statusSubscribers.delete(callback);
  };
}

export function getLiveFeedStatus(): LiveFeedStatus {
  return liveFeedStatus;
}

function notifyStatusUpdate() {
  statusSubscribers.forEach((cb) => cb({ ...liveFeedStatus }));
}

/**
 * Seed historical candles with realistic financial market price action & multi-timeframe alignment
 */
export function initializeMarketData() {
  const now = Date.now();

  TARGET_SYMBOLS.forEach((sym, symIndex) => {
    const isMacroBullish = symIndex % 2 === 0 || sym.symbol.includes('XAU');
    const drift = isMacroBullish ? 0.0003 : -0.0003;
    const currentPrice = sym.initialPrice;

    const store: SymbolCandleStore = {
      D1: generateAlignedCandles(currentPrice, sym.volatilityAtr * 1.0, 100, 86400 * 1000, now, drift * 3),
      H4: generateAlignedCandles(currentPrice, sym.volatilityAtr * 0.45, 120, 14400 * 1000, now, drift * 2),
      H1: generateAlignedCandles(currentPrice, sym.volatilityAtr * 0.25, 120, 3600 * 1000, now, drift),
      M15: generateAlignedCandles(currentPrice, sym.volatilityAtr * 0.12, 100, 900 * 1000, now, drift * 0.5),
      M5: generateAlignedCandles(currentPrice, sym.volatilityAtr * 0.06, 80, 300 * 1000, now, drift * 0.2),
      M1: generateAlignedCandles(currentPrice, sym.volatilityAtr * 0.025, 80, 60 * 1000, now, 0),
    };

    candleDatabase.set(sym.id, store);

    const lastM1 = store.M1[store.M1.length - 1];
    const halfSpread = (sym.typicalSpreadPts * sym.point) / 2;
    const bid = Number((lastM1.close - halfSpread).toFixed(sym.digits));
    const ask = Number((lastM1.close + halfSpread).toFixed(sym.digits));

    latestTicks.set(sym.id, {
      symbol: sym.symbol,
      bid,
      ask,
      spreadPts: sym.typicalSpreadPts,
      time: now,
      change24h: isMacroBullish ? 0.45 + Math.random() * 0.3 : -0.35 - Math.random() * 0.3,
    });
  });

  // Start cloud live streaming automatically
  startCloudRealtimeFeed();
}

function generateAlignedCandles(
  finalTargetPrice: number,
  volatility: number,
  count: number,
  timeStepMs: number,
  endTimeMs: number,
  driftFactor: number = 0
): Candle[] {
  const tempCandles: Candle[] = [];
  let runningClose = finalTargetPrice;

  for (let i = 0; i < count; i++) {
    const time = endTimeMs - i * timeStepMs;
    const noise = (Math.random() - 0.495) * volatility;
    const candleDrift = driftFactor * volatility * 2;
    const change = noise + candleDrift;

    const close = runningClose;
    const open = close - change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.4;
    const low = Math.min(open, close) - Math.random() * volatility * 0.4;
    const volume = Math.floor(600 + Math.random() * 3200);

    tempCandles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });

    runningClose = open;
  }

  const candles: Candle[] = [];
  for (let i = tempCandles.length - 1; i >= 0; i--) {
    candles.push(tempCandles[i]);
  }

  return candles;
}

export function getCandles(symbolId: string, timeframe: Timeframe): Candle[] {
  const store = candleDatabase.get(symbolId);
  if (!store) return [];
  return store[timeframe] || [];
}

export function getLatestTick(symbolId: string): MarketTick | undefined {
  return latestTicks.get(symbolId);
}

export function getAllTicks(): Record<string, MarketTick> {
  const result: Record<string, MarketTick> = {};
  latestTicks.forEach((tick, id) => {
    result[id] = tick;
  });
  return result;
}

/**
 * Connect to live WebSocket and real-time cloud APIs
 */
export function startCloudRealtimeFeed() {
  initBinanceLiveStream();
  fetchLiveExchangeRates();

  // Polling fallback every 3 seconds for Gold & Silver spot
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    fetchLiveBinanceGoldSpot();
  }, 3000);

  // Forex interbank rates sync every 15 seconds
  if (fxTimer) clearInterval(fxTimer);
  fxTimer = setInterval(() => {
    fetchLiveExchangeRates();
  }, 15000);
}

/**
 * Native WebSocket connection to real-time live Gold feed
 */
function initBinanceLiveStream() {
  if (typeof window === 'undefined' || !('WebSocket' in window)) return;

  try {
    if (webSocketInstance) {
      webSocketInstance.close();
    }

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/paxgusdt@bookTicker');
    webSocketInstance = ws;

    ws.onopen = () => {
      liveFeedStatus = {
        ...liveFeedStatus,
        isConnected: true,
        isStreaming: true,
        source: 'binance_live',
        sourceLabel: 'Binance Live WebSocket (Gold Spot PAXG/USD 24/7)',
      };
      notifyStatusUpdate();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.b && data.a) {
          const bid = parseFloat(data.b);
          const ask = parseFloat(data.a);
          if (!isNaN(bid) && !isNaN(ask) && bid > 0) {
            handleLiveGoldTick(bid, ask);
          }
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onerror = () => {
      liveFeedStatus.isConnected = false;
      notifyStatusUpdate();
    };

    ws.onclose = () => {
      liveFeedStatus.isStreaming = false;
      notifyStatusUpdate();
      // Auto-reconnect after 4s
      setTimeout(() => {
        initBinanceLiveStream();
      }, 4000);
    };
  } catch {
    // Graceful fallback to REST polling
  }
}

/**
 * Fallback / Polling REST fetcher for Gold Spot
 */
async function fetchLiveBinanceGoldSpot() {
  const startTime = Date.now();
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/bookTicker?symbol=PAXGUSDT');
    if (!res.ok) return;
    const data = await res.json();
    const latency = Date.now() - startTime;

    if (data && data.bidPrice && data.askPrice) {
      const bid = parseFloat(data.bidPrice);
      const ask = parseFloat(data.askPrice);
      if (!isNaN(bid) && !isNaN(ask) && bid > 0) {
        liveFeedStatus.latencyMs = latency;
        handleLiveGoldTick(bid, ask);
      }
    }
  } catch {
    // Handled silently
  }
}

/**
 * Handle incoming live spot tick for Gold and synchronize Silver
 */
function handleLiveGoldTick(realBid: number, realAsk: number) {
  const goldSym = TARGET_SYMBOLS.find((s) => s.id === 'XAUUSD');
  const silverSym = TARGET_SYMBOLS.find((s) => s.id === 'XAGUSD');
  if (!goldSym) return;

  const mid = (realBid + realAsk) / 2;
  const spreadPts = Math.round(((realAsk - realBid) / goldSym.point) * 10);
  const now = Date.now();

  const goldTick: MarketTick = {
    symbol: goldSym.symbol,
    bid: Number(realBid.toFixed(goldSym.digits)),
    ask: Number(realAsk.toFixed(goldSym.digits)),
    spreadPts: Math.max(18, Math.min(45, spreadPts || goldSym.typicalSpreadPts)),
    time: now,
    change24h: 0.42,
  };

  latestTicks.set('XAUUSD', goldTick);

  const goldStore = candleDatabase.get('XAUUSD');
  if (goldStore) {
    updateLatestCandle(goldStore.M1, mid);
    updateLatestCandle(goldStore.M5, mid);
    updateLatestCandle(goldStore.M15, mid);
    updateLatestCandle(goldStore.H1, mid);
    updateLatestCandle(goldStore.H4, mid);
    updateLatestCandle(goldStore.D1, mid);
  }

  // Synchronize Silver (XAG/USD) spot based on current gold/silver ratio (~67.45)
  let silverTick: MarketTick | null = null;
  if (silverSym) {
    const goldToSilverRatio = 67.46;
    const silverMid = Number((mid / goldToSilverRatio).toFixed(silverSym.digits));
    const halfSpread = (silverSym.typicalSpreadPts * silverSym.point) / 2;
    const silverBid = Number((silverMid - halfSpread).toFixed(silverSym.digits));
    const silverAsk = Number((silverMid + halfSpread).toFixed(silverSym.digits));

    silverTick = {
      symbol: silverSym.symbol,
      bid: silverBid,
      ask: silverAsk,
      spreadPts: silverSym.typicalSpreadPts,
      time: now,
      change24h: 0.38,
    };

    latestTicks.set('XAGUSD', silverTick);

    const silverStore = candleDatabase.get('XAGUSD');
    if (silverStore) {
      updateLatestCandle(silverStore.M1, silverMid);
      updateLatestCandle(silverStore.M5, silverMid);
      updateLatestCandle(silverStore.M15, silverMid);
      updateLatestCandle(silverStore.H1, silverMid);
      updateLatestCandle(silverStore.H4, silverMid);
      updateLatestCandle(silverStore.D1, silverMid);
    }
  }

  liveFeedStatus = {
    ...liveFeedStatus,
    isConnected: true,
    lastSyncTime: now,
    goldSpot: mid,
    silverSpot: silverTick ? (silverTick.bid + silverTick.ask) / 2 : 64.45,
    totalTicksReceived: liveFeedStatus.totalTicksReceived + 1,
  };
  notifyStatusUpdate();

  // Notify subscribers of instant live metal tick
  const allTicks = getAllTicks();
  const updated = silverSym ? [goldSym, silverSym] : [goldSym];
  subscribers.forEach((sub) => {
    sub(allTicks, updated);
  });
}

/**
 * Generate dynamic micro-movements for smooth real-time trading feel between server ticks
 */
export function simulateMarketTick(symbolConfig: SymbolConfig): MarketTick {
  const currentTick = latestTicks.get(symbolConfig.id);
  const store = candleDatabase.get(symbolConfig.id);

  const basePrice = currentTick ? (currentTick.bid + currentTick.ask) / 2 : symbolConfig.initialPrice;
  const tickStep = symbolConfig.point * (Math.random() > 0.85 ? (symbolConfig.category === 'metal' ? 4 : 2) : 0.8);
  const direction = Math.random() > 0.49 ? 1 : -1;
  const newMid = Number((basePrice + direction * tickStep).toFixed(symbolConfig.digits));

  const dynamicSpread = Math.max(
    symbolConfig.typicalSpreadPts - 2,
    Math.min(symbolConfig.typicalSpreadPts + 4, Math.round(symbolConfig.typicalSpreadPts + (Math.random() * 4 - 2)))
  );

  const halfSpread = (dynamicSpread * symbolConfig.point) / 2;
  const bid = Number((newMid - halfSpread).toFixed(symbolConfig.digits));
  const ask = Number((newMid + halfSpread).toFixed(symbolConfig.digits));

  const tick: MarketTick = {
    symbol: symbolConfig.symbol,
    bid,
    ask,
    spreadPts: dynamicSpread,
    time: Date.now(),
    change24h: currentTick ? currentTick.change24h + direction * 0.002 : 0.25,
  };

  latestTicks.set(symbolConfig.id, tick);

  if (store) {
    updateLatestCandle(store.M1, newMid);
    updateLatestCandle(store.M5, newMid);
    updateLatestCandle(store.M15, newMid);
    updateLatestCandle(store.H1, newMid);
    updateLatestCandle(store.H4, newMid);
    updateLatestCandle(store.D1, newMid);
  }

  return tick;
}

/**
 * High-frequency multi-asset tick stream
 * Ticks 2 to 3 symbols simultaneously and broadcasts updates to subscribers
 */
export function emitBatchMarketTicks(): { ticks: Record<string, MarketTick>; updatedSymbols: SymbolConfig[] } {
  const count = Math.floor(Math.random() * 2) + 2; // 2 to 3 symbols
  const updatedSymbols: SymbolConfig[] = [];

  for (let i = 0; i < count; i++) {
    const randomIdx = Math.floor(Math.random() * TARGET_SYMBOLS.length);
    const sym = TARGET_SYMBOLS[randomIdx];
    if (!updatedSymbols.some((s) => s.id === sym.id)) {
      simulateMarketTick(sym);
      updatedSymbols.push(sym);
    }
  }

  const allTicks = getAllTicks();
  subscribers.forEach((sub) => {
    sub(allTicks, updatedSymbols);
  });

  return { ticks: allTicks, updatedSymbols };
}

function updateLatestCandle(candles: Candle[], price: number) {
  if (candles.length === 0) return;
  const last = candles[candles.length - 1];
  last.close = price;
  if (price > last.high) last.high = price;
  if (price < last.low) last.low = price;
  last.volume += Math.floor(1 + Math.random() * 4);
}

/**
 * Calibrate or override price for a specific symbol (e.g. Gold XAU/USD)
 */
export function setCustomSymbolPrice(symbolId: string, newPrice: number): MarketTick | null {
  const sym = TARGET_SYMBOLS.find((s) => s.id === symbolId);
  if (!sym || newPrice <= 0) return null;

  const store = candleDatabase.get(symbolId);
  const halfSpread = (sym.typicalSpreadPts * sym.point) / 2;
  const bid = Number((newPrice - halfSpread).toFixed(sym.digits));
  const ask = Number((newPrice + halfSpread).toFixed(sym.digits));

  const tick: MarketTick = {
    symbol: sym.symbol,
    bid,
    ask,
    spreadPts: sym.typicalSpreadPts,
    time: Date.now(),
    change24h: 0.35,
  };

  latestTicks.set(symbolId, tick);

  if (store) {
    updateLatestCandle(store.M1, newPrice);
    updateLatestCandle(store.M5, newPrice);
    updateLatestCandle(store.M15, newPrice);
    updateLatestCandle(store.H1, newPrice);
    updateLatestCandle(store.H4, newPrice);
    updateLatestCandle(store.D1, newPrice);
  }

  const allTicks = getAllTicks();
  subscribers.forEach((sub) => {
    sub(allTicks, [sym]);
  });

  return tick;
}

/**
 * Syncs baseline exchange rates from public open financial API
 */
export async function fetchLiveExchangeRates() {
  const start = Date.now();
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.rates) return;

    const latency = Date.now() - start;
    liveFeedStatus.latencyMs = latency;
    liveFeedStatus.lastSyncTime = Date.now();
    notifyStatusUpdate();

    const rates = data.rates;
    const updated: SymbolConfig[] = [];

    TARGET_SYMBOLS.forEach((sym) => {
      let realRate: number | null = null;
      if (sym.id === 'EURUSD' && rates.EUR) realRate = 1 / rates.EUR;
      else if (sym.id === 'GBPUSD' && rates.GBP) realRate = 1 / rates.GBP;
      else if (sym.id === 'USDJPY' && rates.JPY) realRate = rates.JPY;
      else if (sym.id === 'USDCHF' && rates.CHF) realRate = rates.CHF;
      else if (sym.id === 'AUDUSD' && rates.AUD) realRate = 1 / rates.AUD;
      else if (sym.id === 'USDCAD' && rates.CAD) realRate = rates.CAD;
      else if (sym.id === 'NZDUSD' && rates.NZD) realRate = 1 / rates.NZD;
      else if (sym.id === 'EURGBP' && rates.EUR && rates.GBP) realRate = rates.GBP / rates.EUR;
      else if (sym.id === 'EURJPY' && rates.EUR && rates.JPY) realRate = rates.JPY / rates.EUR;
      else if (sym.id === 'GBPJPY' && rates.GBP && rates.JPY) realRate = rates.JPY / rates.GBP;

      if (realRate && realRate > 0) {
        const store = candleDatabase.get(sym.id);
        const halfSpread = (sym.typicalSpreadPts * sym.point) / 2;
        const bid = Number((realRate - halfSpread).toFixed(sym.digits));
        const ask = Number((realRate + halfSpread).toFixed(sym.digits));

        latestTicks.set(sym.id, {
          symbol: sym.symbol,
          bid,
          ask,
          spreadPts: sym.typicalSpreadPts,
          time: Date.now(),
          change24h: 0.2,
        });

        if (store) {
          updateLatestCandle(store.M1, realRate);
          updateLatestCandle(store.M5, realRate);
          updateLatestCandle(store.M15, realRate);
          updateLatestCandle(store.H1, realRate);
          updateLatestCandle(store.H4, realRate);
          updateLatestCandle(store.D1, realRate);
        }
        updated.push(sym);
      }
    });

    if (updated.length > 0) {
      const allTicks = getAllTicks();
      subscribers.forEach((sub) => {
        sub(allTicks, updated);
      });
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Manually force sync prices immediately
 */
export async function forceSyncLivePrices() {
  await Promise.allSettled([
    fetchLiveBinanceGoldSpot(),
    fetchLiveExchangeRates(),
  ]);
}
