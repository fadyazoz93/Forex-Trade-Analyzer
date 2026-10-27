import { TARGET_SYMBOLS } from '../data/symbols';
import { Candle, MarketTick, Timeframe } from '../types';
import { ingestMt5TickToStore, ingestMt5CandlesToStore } from './marketDataFeed';

export interface Mt5BridgeStatus {
  isConnected: boolean;
  lastTickTimestamp: number | null;
  totalTicksReceived: number;
  activeSymbols: string[];
  latencyMs: number;
  brokerServerName?: string;
  accountCurrency?: string;
}

let lastTickTimestamp: number | null = null;
let totalTicksReceived = 0;
const activeSymbolsSet = new Set<string>();
let lastKnownBroker: string = 'MetaTrader 5 Universal';
let lastKnownCurrency: string = 'USD';

/**
 * Normalize any broker symbol name to internal target symbol ID
 * Handles suffixes like .m, .pro, .raw, .ecn, or Gold names like GOLD, XAUUSDm
 */
export function normalizeBrokerSymbol(rawSymbol: string): string {
  if (!rawSymbol) return 'XAUUSD';
  const clean = rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (clean.includes('XAU') || clean.includes('GOLD')) return 'XAUUSD';
  if (clean.includes('GBPJPY')) return 'GBPJPY';
  if (clean.includes('EURUSD')) return 'EURUSD';
  if (clean.includes('USDJPY')) return 'USDJPY';
  if (clean.includes('XAG') || clean.includes('SILVER')) return 'XAGUSD';
  if (clean.includes('GBPUSD')) return 'GBPUSD';

  // Fallback match with TARGET_SYMBOLS
  for (const sym of TARGET_SYMBOLS) {
    if (clean.includes(sym.id)) return sym.id;
  }
  return clean;
}

/**
 * Handle incoming tick from MT5
 */
export function handleIncomingMt5Tick(payload: {
  symbol: string;
  bid: number;
  ask: number;
  time?: number;
  broker?: string;
  currency?: string;
  candle?: {
    timeframe: string;
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  };
}): { success: boolean; symbolId: string } {
  const symbolId = normalizeBrokerSymbol(payload.symbol);
  const now = Date.now();
  lastTickTimestamp = now;
  totalTicksReceived++;
  activeSymbolsSet.add(symbolId);

  if (payload.broker) lastKnownBroker = payload.broker;
  if (payload.currency) lastKnownCurrency = payload.currency;

  // Ingest tick into real-time market data feed store
  ingestMt5TickToStore(symbolId, {
    bid: Number(payload.bid),
    ask: Number(payload.ask),
    time: payload.time ? Number(payload.time) * 1000 : now,
  });

  // If candle snapshot was attached, ingest it
  if (payload.candle && payload.candle.timeframe) {
    const tf = (payload.candle.timeframe.toUpperCase() as Timeframe) || 'M5';
    ingestMt5CandlesToStore(symbolId, tf, [
      {
        time: payload.candle.time ? Number(payload.candle.time) * 1000 : now,
        open: Number(payload.candle.open),
        high: Number(payload.candle.high),
        low: Number(payload.candle.low),
        close: Number(payload.candle.close),
        volume: Number(payload.candle.volume || 100),
      },
    ]);
  }

  return { success: true, symbolId };
}

/**
 * Handle batch historical candles from MT5
 */
export function handleIncomingMt5BatchCandles(payload: {
  symbol: string;
  timeframe: string;
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
}): { success: boolean; count: number; symbolId: string } {
  const symbolId = normalizeBrokerSymbol(payload.symbol);
  const tf = (payload.timeframe.toUpperCase() as Timeframe) || 'M5';

  if (!Array.isArray(payload.candles) || payload.candles.length === 0) {
    return { success: false, count: 0, symbolId };
  }

  const formattedCandles: Candle[] = payload.candles.map((c) => ({
    time: c.time < 10000000000 ? c.time * 1000 : c.time,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: Number(c.volume || 100),
  }));

  ingestMt5CandlesToStore(symbolId, tf, formattedCandles);
  activeSymbolsSet.add(symbolId);
  lastTickTimestamp = Date.now();

  return { success: true, count: formattedCandles.length, symbolId };
}

/**
 * Get MT5 Bridge Status
 */
export function getMt5BridgeStatus(): Mt5BridgeStatus {
  const now = Date.now();
  const isConnected = lastTickTimestamp !== null && now - lastTickTimestamp < 25000;
  const latencyMs = lastTickTimestamp !== null ? Math.max(1, now - lastTickTimestamp) : 0;

  return {
    isConnected,
    lastTickTimestamp,
    totalTicksReceived,
    activeSymbols: Array.from(activeSymbolsSet),
    latencyMs: isConnected ? latencyMs : 0,
    brokerServerName: lastKnownBroker,
    accountCurrency: lastKnownCurrency,
  };
}

/**
 * Generate native, zero-dependency MQL5 Expert Advisor source code
 */
export function generateMql5BridgeCode(serverHostUrl: string): string {
  return `//+------------------------------------------------------------------+
//|                                              MT5_AIS_Bridge_EA.mq5|
//|                        AI Studio & Web App Live Market Data Bridge|
//|                                  Copyright 2026, Forensic Trading|
//+------------------------------------------------------------------+
#property copyright "Forex AI Studio Engine"
#property link      "${serverHostUrl}"
#property version   "2.00"
#property description "Transmits tick-by-tick real broker prices and candle closes to your Web App"

//--- Inputs
input group "=== Server Configuration ==="
input string   InpServerUrl     = "${serverHostUrl}/api/mt5/feed"; // Web App Feed URL
input int      InpThrottleMs    = 250;                             // Minimum Throttle (ms) between ticks
input bool     InpSendCandle    = true;                            // Include M5 Candle Data

//--- Global Variables
datetime lastTickTime = 0;
ulong    lastTickMs   = 0;
datetime lastM5BarTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("🚀 [AIS Bridge] MT5 Live Market Bridge Initialized for symbol: ", _Symbol);
   Print("🌐 Target Server URL: ", InpServerUrl);
   Print("ℹ️ Make sure to enable Tools -> Options -> Expert Advisors -> Allow WebRequest for: ", InpServerUrl);

   // Send initial registration ping
   SendTickData(true);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("🛑 [AIS Bridge] Deinitialized (Reason: ", reason, ")");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   ulong currentMs = GetMicrosecondCount() / 1000;
   if(currentMs - lastTickMs < (ulong)InpThrottleMs)
      return; // Throttle to prevent overloading MT5 UI thread

   lastTickMs = currentMs;
   SendTickData(false);
}

//+------------------------------------------------------------------+
//| Construct and send WebRequest JSON payload to Web App            |
//+------------------------------------------------------------------+
void SendTickData(bool isInitPing)
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return;

   // Get current M5 candle snapshot
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, PERIOD_M5, 0, 1, rates);

   string json = "{";
   json += "\\\"symbol\\\":\\\"" + _Symbol + "\\\",";
   json += "\\\"bid\\\":" + DoubleToString(tick.bid, _Digits) + ",";
   json += "\\\"ask\\\":" + DoubleToString(tick.ask, _Digits) + ",";
   json += "\\\"time\\\":" + IntegerToString((long)TimeCurrent()) + ",";
   json += "\\\"broker\\\":\\\"" + AccountInfoString(ACCOUNT_COMPANY) + " - " + AccountInfoString(ACCOUNT_SERVER) + "\\\",";
   json += "\\\"currency\\\":\\\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\\\"";

   if(InpSendCandle && copied > 0)
   {
      json += ",\\\"candle\\\":{";
      json += "\\\"timeframe\\\":\\\"M5\\\",";
      json += "\\\"time\\\":" + IntegerToString((long)rates[0].time) + ",";
      json += "\\\"open\\\":" + DoubleToString(rates[0].open, _Digits) + ",";
      json += "\\\"high\\\":" + DoubleToString(rates[0].high, _Digits) + ",";
      json += "\\\"low\\\":" + DoubleToString(rates[0].low, _Digits) + ",";
      json += "\\\"close\\\":" + DoubleToString(rates[0].close, _Digits) + ",";
      json += "\\\"volume\\\":" + IntegerToString((long)rates[0].tick_volume);
      json += "}";
   }
   json += "}";

   char postData[];
   char result[];
   string resultHeaders;
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove trailing null byte
   ArrayResize(postData, ArraySize(postData) - 1);

   string headers = "Content-Type: application/json\\r\\n";
   int timeout = 1500; // 1.5 seconds max

   int res = WebRequest("POST", InpServerUrl, headers, timeout, postData, result, resultHeaders);
   if(res == 200)
   {
      if(isInitPing)
         Print("✅ [AIS Bridge] Connected to Web App successfully!");
   }
   else if(res == -1)
   {
      int err = GetLastError();
      if(err == 4060)
      {
         Print("❌ [AIS Bridge] WebRequest blocked! Go to MT5 Tools -> Options -> Expert Advisors, check 'Allow WebRequest' and add: ", InpServerUrl);
      }
      else
      {
         Print("⚠️ [AIS Bridge] WebRequest failed. Error code: ", err);
      }
   }
}
`;
}
