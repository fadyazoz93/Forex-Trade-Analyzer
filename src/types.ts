export type AssetCategory = 'forex' | 'metal';

export interface SymbolConfig {
  id: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  category: AssetCategory;
  baseCurrency: string;
  quoteCurrency: string;
  digits: number;
  point: number;
  typicalSpreadPts: number;
  initialPrice: number;
  volatilityAtr: number; // typical daily ATR in price units
  minLot: number;
  maxLot: number;
  lotStep: number;
  tickValue: number;
  tickSize: number;
  metalsReduction?: number; // 0.30 for metals
  minSLPoints?: number;     // 500 for silver, 120 for scalp
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketTick {
  symbol: string;
  bid: number;
  ask: number;
  spreadPts: number;
  time: number;
  change24h: number;
}

export type Timeframe = 'D1' | 'H4' | 'H1' | 'M15' | 'M5' | 'M1';

export type EngineMode = 'intraday';

export interface GateStatus {
  passed: boolean;
  name: string;
  nameAr: string;
  detail: string;
  value?: string | number;
}

export interface SopGatesEvaluation {
  score: number;
  needed: number;
  passed: boolean;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  gate1_macroAndEma: GateStatus;
  gate2_gannSq9: GateStatus;
  gate3_gann1x1AndCycles: GateStatus;
  gate4_rsi: GateStatus;
  gate5_priceActionAndBos: GateStatus;
  sq9Level: number;
  structuralSL: number;
  riskDist: number;
  entryPrice: number;
  anchorPrice: number;
  barsElapsed: number;
  rsiValue: number;
  dailyEmaValue: number;
  higherTfEmaValue: number;
}

export interface QuadTargets {
  tp1: number; // 0.5 R + Move SL to BE
  tp2: number; // 1.0 R + Lock SL to +0.5R
  tp3: number; // 1.5 R + 75% exit + Trailing Stop
  tp4: number; // 2.0 R (Hard 1:2 R:R target)
}

export interface TradeSignal {
  id: string;
  symbol: string;
  engine: EngineMode;
  magicNumber: number;
  orderType: 'BUY' | 'SELL' | 'BUY_LIMIT' | 'SELL_LIMIT';
  isLimit: boolean;
  entryPrice: number;
  slPrice: number;
  tpTargets: QuadTargets;
  riskDistance: number;
  riskRewardRatio: string;
  score: number;
  gates: SopGatesEvaluation;
  status: 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'TP4_HIT' | 'SL_HIT' | 'CANCELLED';
  time: number;
  timeFormatted: string;
  comment: string;
  telegramSent: boolean;
  telegramSentTime?: string;
  lotSize: number;
  pnl?: number;
  currentPrice?: number;
  livePips?: number;
  livePnL?: number;
  breakEvenActive?: boolean;
  trailingSlPrice?: number;
  highestTargetHit?: 'TP1' | 'TP2' | 'TP3' | 'TP4' | null;
  isRealtimeUpdate?: boolean;
}

export interface AccountRiskSettings {
  balance: number;
  riskPercent: number;        // e.g. 1.0%
  maxRiskDollars: number;     // e.g. 1000
  maxLotPerTrade: number;     // e.g. 2.0
  maxTotalLots: number;       // e.g. 5.0
  useAutoLot: boolean;
  fixedLot: number;           // e.g. 0.01
  maxGlobalPositions: number; // 5
  minMarginLevel: number;     // 300%
  maxDailyLossPercent: number;// 5.0%
  dailyTargetProfitPct: number;// 10.0%
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  channelId: string;
  chatId: string;
  sendTarget: 'channel' | 'chat' | 'both';
  autoSend: boolean;
}

export interface ShieldStatus {
  isLondonFixBlocked: boolean;
  isRolloverBlocked: boolean;
  isFridayAfternoonBlocked: boolean;
  isSundayOpenBlocked: boolean;
  isWeekendBlocked?: boolean;
  isSessionActive: boolean;
  isNewsUpcoming: boolean;
  isDailyLossHit: boolean;
  isDailyTargetHit: boolean;
  serverTimeUTC: string;
  activeSessions: string[];
}

export interface LiveFeedStatus {
  isConnected: boolean;
  source: 'binance_live' | 'interbank_live' | 'calibrated';
  sourceLabel: string;
  lastSyncTime: number;
  latencyMs: number;
  goldSpot: number;
  silverSpot: number;
  isStreaming: boolean;
  totalTicksReceived: number;
}
