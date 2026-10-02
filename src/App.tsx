import React, { useEffect, useRef, useState } from 'react';
import { GannModal } from './components/GannModal';
import { Header } from './components/Header';
import { InteractiveCandlestickModal } from './components/InteractiveCandlestickModal';
import { MarketSessionsClock } from './components/MarketSessionsClock';
import { MarketWatch } from './components/MarketWatch';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { ShieldBanner } from './components/ShieldBanner';
import { SignalFeed } from './components/SignalFeed';
import { SignalHistoryTable } from './components/SignalHistoryTable';
import { StrategyMatrixExplainer } from './components/StrategyMatrixExplainer';
import { TelegramModal } from './components/TelegramModal';
import { DatabaseModal } from './components/DatabaseModal';
import { SessionHolidayModal } from './components/SessionHolidayModal';
import { SessionHolidayNoticeBanner } from './components/SessionHolidayNoticeBanner';
import { TARGET_SYMBOLS } from './data/symbols';
import { getMarketHoursStatus, MarketHoursStatus } from './services/marketHoursService';
import {
  emitBatchMarketTicks,
  fetchLiveExchangeRates,
  forceSyncLivePrices,
  getAllTicks,
  getLiveFeedStatus,
  initializeMarketData,
  populateCandleStoresFromRemote,
  setCustomSymbolPrice,
  subscribeToFeedStatus,
  subscribeToRealtimeTicks,
} from './services/marketDataFeed';
import { getShieldStatus, isWeekendMarketClosed } from './services/shieldMonitor';
import {
  evaluateSingleSymbolOnTick,
  scanMarketWatchSymbols,
  updateSignalRealtimeMetrics,
} from './services/sopMatrixScanner';
import {
  isAudioEnabled,
  playSignalAlertSound,
  toggleAudioEnabled,
} from './services/soundAlert';
import {
  DEFAULT_TELEGRAM_CHANNEL_ID,
  DEFAULT_TELEGRAM_CHAT_ID,
  DEFAULT_TELEGRAM_TOKEN,
  normalizeSymbolKey,
  sendTradeSignalToTelegram,
} from './services/telegramService';
import {
  AccountRiskSettings,
  EngineMode,
  LiveFeedStatus,
  MarketTick,
  ShieldStatus,
  SopGatesEvaluation,
  SymbolConfig,
  TelegramConfig,
  TradeSignal,
} from './types';
import { Radio, Zap } from 'lucide-react';

export default function App() {
  // Strategy & Engine state
  const [engine, setEngine] = useState<EngineMode>('intraday');
  const engineRef = useRef<EngineMode>('intraday');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>('XAUUSD');
  const [mobileTab, setMobileTab] = useState<MobileTab>('signals');
  const [tickCount, setTickCount] = useState<number>(0);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(isAudioEnabled());

  // Real-time Toast Alert
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'buy' | 'sell';
  } | null>(null);

  // Market & Evaluation state
  const [ticks, setTicks] = useState<Record<string, MarketTick>>({});
  const [liveFeedStatus, setLiveFeedStatus] = useState<LiveFeedStatus>(getLiveFeedStatus());
  const [evaluations, setEvaluations] = useState<
    Record<string, { evalLong: SopGatesEvaluation; evalShort: SopGatesEvaluation }>
  >({});
  const [activeSignals, setActiveSignals] = useState<TradeSignal[]>([]);
  const activeSignalsRef = useRef<TradeSignal[]>([]);
  activeSignalsRef.current = activeSignals;
  const sentSignalsTrackerRef = useRef<Set<string>>(new Set());

  // Unique signal fingerprint generator
  const getSignalKey = (s: TradeSignal) => `${s.symbol}_${s.orderType}_${s.entryPrice.toFixed(2)}`;

  const [signalHistory, setSignalHistory] = useState<TradeSignal[]>([]);
  const [shieldStatus, setShieldStatus] = useState<ShieldStatus>(getShieldStatus());

  // Modals state
  const [inspectSymbol, setInspectSymbol] = useState<SymbolConfig | null>(null);
  const [chartSymbol, setChartSymbol] = useState<SymbolConfig | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isSessionHolidayModalOpen, setIsSessionHolidayModalOpen] = useState(false);
  const [marketHoursStatus, setMarketHoursStatus] = useState<MarketHoursStatus>(() => getMarketHoursStatus());

  // Settings state (defaults to realistic $1,000 retail account with 1% risk)
  const [riskSettings, setRiskSettingsState] = useState<AccountRiskSettings>(() => {
    try {
      const saved = localStorage.getItem('forex_trade_analyzer_risk_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      balance: 1000,
      riskPercent: 1.0,
      maxRiskDollars: 100,
      maxLotPerTrade: 1.0,
      maxTotalLots: 3.0,
      useAutoLot: true,
      fixedLot: 0.01,
      maxGlobalPositions: 5,
      minMarginLevel: 300,
      maxDailyLossPercent: 5.0,
      dailyTargetProfitPct: 10.0,
    };
  });

  const setRiskSettings = (newSettings: AccountRiskSettings) => {
    setRiskSettingsState(newSettings);
    try {
      localStorage.setItem('forex_trade_analyzer_risk_settings', JSON.stringify(newSettings));
    } catch {}
  };

  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    try {
      const saved = localStorage.getItem('forex_trade_analyzer_telegram_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          enabled: parsed.enabled ?? true,
          botToken: parsed.botToken || DEFAULT_TELEGRAM_TOKEN,
          channelId: parsed.channelId || DEFAULT_TELEGRAM_CHANNEL_ID,
          chatId: parsed.chatId || DEFAULT_TELEGRAM_CHAT_ID,
          sendTarget: parsed.sendTarget || 'both',
          autoSend: parsed.autoSend ?? true,
        };
      }
    } catch {
      // ignore
    }
    return {
      enabled: true,
      botToken: DEFAULT_TELEGRAM_TOKEN,
      channelId: DEFAULT_TELEGRAM_CHANNEL_ID,
      chatId: DEFAULT_TELEGRAM_CHAT_ID,
      sendTarget: 'both',
      autoSend: true,
    };
  });
  const telegramConfigRef = useRef(telegramConfig);
  telegramConfigRef.current = telegramConfig;

  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const initialMountRef = useRef(false);

  // Keep engineRef in sync
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // 1. Initialize Market Data on Mount & Subscribe to High-Frequency Real-time Stream
  useEffect(() => {
    initializeMarketData();
    setTicks(getAllTicks());
    setShieldStatus(getShieldStatus());

    // Fetch initial server ticks and real candles if running in fullstack container
    fetch('/api/market/candles')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.stores) {
          populateCandleStoresFromRemote(data.stores);
        }
      })
      .catch(() => {});

    fetch('/api/market-data')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.ticks) {
          setTicks(data.ticks);
        }
        // Run initial scan once ticks and candles are loaded
        handlePerformScan(engineRef.current, false);
      })
      .catch(() => {
        handlePerformScan(engineRef.current, false);
      });

    // Initial load of persistent signals from Turso database
    fetch('/api/database/signals?limit=30')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.signals) && data.signals.length > 0) {
          setSignalHistory((prev) => {
            const combined = [...data.signals];
            prev.forEach((p) => {
              if (!combined.some((c) => c.id === p.id)) combined.push(p);
            });
            return combined;
          });
        }
      })
      .catch(() => {});

    // Subscribe to cloud live feed status updates
    const unsubscribeStatus = subscribeToFeedStatus((status) => {
      setLiveFeedStatus(status);
    });

    // Subscribe to live on-tick market updates
    const unsubscribe = subscribeToRealtimeTicks((latestTicks, updatedSymbols) => {
      setTicks({ ...latestTicks });
      setTickCount((prev) => prev + updatedSymbols.length);

      const currentEngine = engineRef.current;

      // Real-time on-tick evaluation for each symbol that received a tick
      updatedSymbols.forEach((sym) => {
        const tick = latestTicks[sym.id];
        if (!tick) return;

        const { newSignal, evalLong, evalShort } = evaluateSingleSymbolOnTick(
          sym,
          currentEngine,
          tick,
          4
        );

        setEvaluations((prev) => ({
          ...prev,
          [sym.id]: { evalLong, evalShort },
        }));

        if (newSignal) {
          handleIncomingInstantSignal(newSignal);
        }
      });

      // Update real-time metrics on all active signals (live pips, live P&L, Break-Even)
      setActiveSignals((prevSignals) =>
        prevSignals.map((sig) => {
          const symConfig = TARGET_SYMBOLS.find((s) => s.symbol === sig.symbol);
          const currentTick = symConfig ? latestTicks[symConfig.id] : null;
          if (symConfig && currentTick) {
            return updateSignalRealtimeMetrics(sig, currentTick, symConfig);
          }
          return sig;
        })
      );
    });

    // High-frequency micro-tick generator (Ticks 2-4 assets every 1200ms)
    const tickInterval = setInterval(() => {
      const shield = getShieldStatus();
      if (!shield.isWeekendBlocked) {
        emitBatchMarketTicks();
      }
    }, 1200);

    // Clock update interval for UTC server time and market hours
    const clockTimer = setInterval(() => {
      setShieldStatus(getShieldStatus());
      setMarketHoursStatus(getMarketHoursStatus());
    }, 1000);

    // Periodic exchange rate & spot precious metals calibration from genuine feeds
    const rateTimer = setInterval(() => {
      forceSyncLivePrices().catch(() => {});
    }, 30000);

    // Backup sweep scan every 6 seconds to ensure no confluence is left behind
    const sweepInterval = setInterval(() => {
      if (!isWeekendMarketClosed()) {
        handlePerformScan(engineRef.current, false);
      }
    }, 6000);

    return () => {
      unsubscribe();
      unsubscribeStatus();
      clearInterval(tickInterval);
      clearInterval(clockTimer);
      clearInterval(rateTimer);
      clearInterval(sweepInterval);
    };
  }, []);

  // Handle newly caught instant signal on the tick
  const handleIncomingInstantSignal = (newSignal: TradeSignal) => {
    // Shield: Do not process instant signals during weekend market closure
    if (isWeekendMarketClosed()) return;

    // Strict Anti-Duplicate Rule: Do NOT create or duplicate an active trade for the SAME symbol if already active
    const cleanSym = normalizeSymbolKey(newSignal.symbol);
    const alreadyActive = activeSignalsRef.current.some((s) => {
      const sClean = normalizeSymbolKey(s.symbol);
      const isClosed = s.status === 'TP4_HIT' || s.status === 'SL_HIT' || s.status === 'CANCELLED';
      return sClean === cleanSym && !isClosed;
    });
    if (alreadyActive) return;

    // Immediately update ref to prevent synchronous race condition from subsequent ticks
    activeSignalsRef.current = [newSignal, ...activeSignalsRef.current];

    // Play audio notification chime
    playSignalAlertSound(newSignal.orderType.includes('BUY'));

    // Show real-time notification toast
    setToast({
      id: Date.now(),
      message: `⚡ إشارة لحظية جديدة: ${newSignal.symbol} ${newSignal.orderType} (توافق ${newSignal.score}/5 SOP)`,
      type: newSignal.orderType.includes('BUY') ? 'buy' : 'sell',
    });

    // Update active signals and history
    setActiveSignals((prev) => [newSignal, ...prev]);
    setSignalHistory((prev) => {
      const exists = prev.some((s) => s.id === newSignal.id);
      if (exists) return prev;
      return [newSignal, ...prev.slice(0, 49)];
    });

    // Auto-send to Telegram channel immediately if enabled (strictly once per currency at the same time)
    if (telegramConfigRef.current.autoSend) {
      if (!sentSignalsTrackerRef.current.has(cleanSym)) {
        sentSignalsTrackerRef.current.add(cleanSym);
        handleSendTelegramSignal(newSignal);
      }
    }

    // Persist signal to Turso Cloud Database
    fetch('/api/database/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSignal),
    }).catch((err) => console.warn('Database save error:', err));
  };

  // Perform SOP Strategy Scan on Elite Gann & Wyckoff Assets (XAU/USD, GBP/JPY, EUR/USD, USD/JPY)
  const handlePerformScan = async (selectedEngine = engine, showSpinner = true) => {
    if (showSpinner) setIsScanning(true);

    const isWeekendClosed = isWeekendMarketClosed();

    const { signals, candidates } = scanMarketWatchSymbols({
      engine: selectedEngine,
      scoreNeeded: 4,
    });

    const newEvals: Record<string, { evalLong: SopGatesEvaluation; evalShort: SopGatesEvaluation }> = {};
    candidates.forEach((c) => {
      newEvals[c.symbol.id] = {
        evalLong: c.evalLong,
        evalShort: c.evalShort,
      };
    });
    setEvaluations(newEvals);

    if (isWeekendClosed) {
      if (showSpinner) {
        setToast({
          id: Date.now(),
          message: '⛔ السوق المالي العالمي مغلق حالياً (عطلة نهاية الأسبوع من مساء الجمعة إلى مساء الأحد). تم إيقاف توليد الإشارات لحماية الحساب.',
          type: 'sell',
        });
      }
      if (showSpinner) setIsScanning(false);
      return;
    }

    // If signals discovered
    if (signals.length > 0) {
      // Filter out symbols that already have an ongoing active trade (prevent duplicate trades on the same currency)
      const eligibleSignals = signals.filter((sig) => {
        const sigClean = normalizeSymbolKey(sig.symbol);
        const hasActive = activeSignalsRef.current.some((active) => {
          const activeClean = normalizeSymbolKey(active.symbol);
          const isClosed = active.status === 'TP4_HIT' || active.status === 'SL_HIT' || active.status === 'CANCELLED';
          return activeClean === sigClean && !isClosed;
        });
        return !hasActive;
      });

      if (eligibleSignals.length > 0) {
        setActiveSignals((prev) => [...eligibleSignals, ...prev]);

        setSignalHistory((prev) => {
          const updated = [...eligibleSignals, ...prev];
          return updated.slice(0, 50);
        });

        // Auto-send newly discovered signals to Telegram channel if enabled (strictly once per currency at the same time)
        if (telegramConfigRef.current.autoSend) {
          eligibleSignals.forEach((sig) => {
            const cleanSym = normalizeSymbolKey(sig.symbol);
            if (!sentSignalsTrackerRef.current.has(cleanSym)) {
              sentSignalsTrackerRef.current.add(cleanSym);
              handleSendTelegramSignal(sig);
            }
          });
        }
      }
    }

    if (showSpinner) setIsScanning(false);
  };

  // Switch Engine immediately and re-evaluate in real time
  const handleEngineChange = (newEngine: EngineMode) => {
    setEngine(newEngine);
    engineRef.current = newEngine;
    handlePerformScan(newEngine, true);
  };

  // Toggle Audio
  const handleToggleAudio = () => {
    const next = toggleAudioEnabled();
    setIsAudioOn(next);
  };

  // Dispatch Signal to Telegram
  const handleSendTelegramSignal = async (signal: TradeSignal) => {
    if (isWeekendMarketClosed()) {
      setToast({
        id: Date.now(),
        message: '⛔ السوق مغلق حالياً (عطلة نهاية الأسبوع). تم حظر الإرسال إلى تليجرام لحماية رأس المال.',
        type: 'sell',
      });
      return;
    }

    const cleanSym = normalizeSymbolKey(signal.symbol);

    // Prevent duplicate sending if this signal was already sent or another active signal for this currency was already sent
    const alreadySentActiveSignal = activeSignals.some((s) => {
      const sClean = normalizeSymbolKey(s.symbol);
      const isClosed = s.status === 'TP4_HIT' || s.status === 'SL_HIT' || s.status === 'CANCELLED';
      return sClean === cleanSym && s.id !== signal.id && s.telegramSent && !isClosed;
    });

    if (signal.telegramSent || alreadySentActiveSignal) {
      setToast({
        id: Date.now(),
        message: `تم منع التكرار: توجد إشارة مرسلة مسبقاً للعملة (${signal.symbol}) ولديها صفقة قائمة في نفس الوقت.`,
        type: 'sell',
      });
      return;
    }

    setIsSendingTelegram(true);

    const cfg = telegramConfigRef.current;
    const destinations: string[] = [];

    // Always include channel ID by default
    const channelId =
      cfg.channelId && cfg.channelId.trim().length > 0
        ? cfg.channelId.trim()
        : DEFAULT_TELEGRAM_CHANNEL_ID;

    destinations.push(channelId);

    const result = await sendTradeSignalToTelegram(
      signal,
      cfg.botToken || DEFAULT_TELEGRAM_TOKEN,
      destinations
    );

    if (result.success) {
      sentSignalsTrackerRef.current.add(cleanSym);
      setActiveSignals((prev) =>
        prev.map((s) => (s.id === signal.id ? { ...s, telegramSent: true } : s))
      );
      setSignalHistory((prev) =>
        prev.map((s) => (s.id === signal.id ? { ...s, telegramSent: true } : s))
      );
      setToast({
        id: Date.now(),
        message: `تم إرسال إشارة ${signal.symbol} إلى تليجرام بنجاح!`,
        type: signal.orderType.includes('BUY') ? 'buy' : 'sell',
      });
    } else if (result.error) {
      console.warn('Telegram auto-send alert:', result.error);
      setToast({
        id: Date.now(),
        message: result.error,
        type: 'sell',
      });
    }

    setIsSendingTelegram(false);
  };

  const handleSaveTelegramConfig = (newCfg: TelegramConfig) => {
    setTelegramConfig(newCfg);
    telegramConfigRef.current = newCfg;
    try {
      localStorage.setItem('forex_trade_analyzer_telegram_config', JSON.stringify(newCfg));
    } catch {
      // ignore
    }
  };

  // Calibrate custom broker price for an asset (e.g. Gold XAU/USD)
  const handleUpdateCustomPrice = (symbolId: string, newPrice: number) => {
    const tick = setCustomSymbolPrice(symbolId, newPrice);
    if (tick) {
      setTicks(getAllTicks());
      const sym = TARGET_SYMBOLS.find((s) => s.id === symbolId);
      if (sym) {
        const { newSignal, evalLong, evalShort } = evaluateSingleSymbolOnTick(
          sym,
          engineRef.current,
          tick,
          4
        );
        setEvaluations((prev) => ({
          ...prev,
          [sym.id]: { evalLong, evalShort },
        }));
        if (newSignal) {
          handleIncomingInstantSignal(newSignal);
        }
      }
    }
  };

  // Dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Export Analytics CSV
  const handleExportCSV = () => {
    const headers = [
      'DealTicket',
      'OrderTicket',
      'MagicNumber',
      'Strategy',
      'Symbol',
      'Type',
      'Volume',
      'OpenTime',
      'Price',
      'Profit',
      'Swap',
      'Commission',
      'TotalPnL',
      'Comment',
    ];

    const rows = signalHistory.map((sig, idx) => [
      100000 + idx,
      200000 + idx,
      sig.magicNumber,
      'Gann_Intraday_V42',
      sig.symbol,
      sig.orderType,
      sig.lotSize,
      new Date(sig.time).toISOString(),
      sig.entryPrice,
      sig.livePnL || 0,
      0,
      0,
      sig.livePnL || 0,
      `SOP Confluence ${sig.score}/5`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'SOP_Gann_Analytics_V42.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentOpenLots = activeSignals.reduce((acc, s) => acc + s.lotSize, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Real-time Floating Toast Alert */}
      {toast && (
        <div className="fixed top-18 right-4 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-lg flex items-center gap-3 ${
              toast.type === 'buy'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/95 border-rose-500/50 text-rose-200'
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                toast.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold font-mono text-white">{toast.message}</div>
              <div className="text-[10px] text-slate-300">تم الرصد فورياً عبر مصفوفة 5SOP</div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        engine={engine}
        onEngineChange={handleEngineChange}
        isScanning={isScanning}
        onOpenTelegramSettings={() => setIsTelegramModalOpen(true)}
        onOpenRiskCalc={() => setIsRiskModalOpen(true)}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
        onOpenSessionHolidays={() => setIsSessionHolidayModalOpen(true)}
        isWeekend={marketHoursStatus.isWeekend}
        shieldStatus={shieldStatus}
        activeSignalCount={activeSignals.length}
        isAudioOn={isAudioOn}
        onToggleAudio={handleToggleAudio}
        tickCount={tickCount}
      />

      {/* Smart Notification Banner for Sessions and Market Holidays */}
      <SessionHolidayNoticeBanner
        status={marketHoursStatus}
        onOpenFullSchedule={() => setIsSessionHolidayModalOpen(true)}
      />

      {/* Protective Shield & Session Telemetry Banner */}
      <ShieldBanner
        status={shieldStatus}
        todayPnL={0}
        openLots={currentOpenLots}
        maxLots={riskSettings.maxTotalLots}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-6 space-y-3.5 sm:space-y-6 pb-24 md:pb-6">
        {/* Mobile Fast Tab Bar */}
        <div className="md:hidden flex items-center justify-between bg-slate-900/90 border border-slate-800 p-1 rounded-2xl shadow-sm">
          <button
            onClick={() => setMobileTab('signals')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              mobileTab === 'signals' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>الإشارات</span>
            {activeSignals.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  mobileTab === 'signals' ? 'bg-slate-950 text-cyan-300' : 'bg-emerald-500 text-slate-950 font-bold'
                }`}
              >
                {activeSignals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileTab('market')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mobileTab === 'market' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            السوق
          </button>
          <button
            onClick={() => setMobileTab('sessions')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mobileTab === 'sessions' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            الجلسات
          </button>
          <button
            onClick={() => setMobileTab('history')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mobileTab === 'history' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            السجل
          </button>
          <button
            onClick={() => setMobileTab('all')}
            className={`px-2.5 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
              mobileTab === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="عرض جميع الأقسام معاً"
          >
            الكل
          </button>
        </div>

        {/* Real-time Global Forex Market Sessions Clock */}
        <div className={mobileTab === 'sessions' || mobileTab === 'all' ? 'block' : 'hidden md:block'}>
          <MarketSessionsClock onOpenSchedule={() => setIsSessionHolidayModalOpen(true)} />
        </div>

        {/* Active Real-Time Trading Signals Feed */}
        <div className={mobileTab === 'signals' || mobileTab === 'all' ? 'block' : 'hidden md:block'}>
          <SignalFeed
            signals={activeSignals}
            onSendTelegram={handleSendTelegramSignal}
            isSendingTelegram={isSendingTelegram}
            onSelectSignalForInspection={(sig) => {
              const sym = TARGET_SYMBOLS.find((s) => s.symbol === sig.symbol);
              if (sym) setInspectSymbol(sym);
            }}
            onOpenChartForSignal={(sig) => {
              const sym = TARGET_SYMBOLS.find((s) => s.symbol === sig.symbol);
              if (sym) setChartSymbol(sym);
            }}
            isAudioOn={isAudioOn}
            onToggleAudio={handleToggleAudio}
            tickCount={tickCount}
          />
        </div>

        {/* Real-time Market Watch (Top 10 Forex Pairs + Gold + Silver) */}
        <div className={mobileTab === 'market' || mobileTab === 'all' ? 'block' : 'hidden md:block'}>
          <MarketWatch
            symbols={TARGET_SYMBOLS}
            ticks={ticks}
            evaluations={evaluations}
            selectedSymbolId={selectedSymbolId}
            liveFeedStatus={liveFeedStatus}
            onSelectSymbol={setSelectedSymbolId}
            onInspectGann={(sym) => setInspectSymbol(sym)}
            onUpdateCustomPrice={handleUpdateCustomPrice}
            onForceSync={forceSyncLivePrices}
          />
        </div>

        {/* Signals History & Analytics Table */}
        <div className={mobileTab === 'history' || mobileTab === 'all' ? 'block' : 'hidden md:block'}>
          <SignalHistoryTable history={signalHistory} onExportCSV={handleExportCSV} />
        </div>

        {/* Educational Strategy Matrix & Gann Rules Guide */}
        <div className={mobileTab === 'all' ? 'block' : 'hidden md:block'}>
          <StrategyMatrixExplainer />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 pb-20 md:pb-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>SOP Gann MarketWatch V42.00 • محرك بث لحظي مباشر (Real-Time Tick Engine)</span>
          </div>
          <div>
            تداول مسؤول • الالتزام الصارم بقواعد رأس المال وقاطع الخسارة اليومي (Circuit Breaker)
          </div>
        </div>
      </footer>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={setMobileTab}
        activeSignalsCount={activeSignals.length}
        onOpenRiskCalc={() => setIsRiskModalOpen(true)}
        onOpenTelegram={() => setIsTelegramModalOpen(true)}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
        onOpenSessions={() => setIsSessionHolidayModalOpen(true)}
        isAudioOn={isAudioOn}
        onToggleAudio={handleToggleAudio}
        isWeekend={marketHoursStatus.isWeekend}
      />

      {/* Modals */}
      {inspectSymbol && (
        <GannModal
          symbol={inspectSymbol}
          isOpen={true}
          onClose={() => setInspectSymbol(null)}
          evaluation={evaluations[inspectSymbol.id]}
        />
      )}

      {chartSymbol && (
        <InteractiveCandlestickModal
          symbol={chartSymbol}
          isOpen={true}
          onClose={() => setChartSymbol(null)}
          evaluation={evaluations[chartSymbol.id]}
          signal={activeSignals.find((s) => s.symbol === chartSymbol.symbol)}
          onOpenRiskCalc={() => {
            setChartSymbol(null);
            setIsRiskModalOpen(true);
          }}
        />
      )}

      <RiskCalculatorModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        settings={riskSettings}
        onSaveSettings={setRiskSettings}
      />

      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        config={telegramConfig}
        onSaveConfig={handleSaveTelegramConfig}
      />

      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
      />

      {/* Sessions and Holidays Comprehensive Modal */}
      <SessionHolidayModal
        isOpen={isSessionHolidayModalOpen}
        onClose={() => setIsSessionHolidayModalOpen(false)}
        status={marketHoursStatus}
      />
    </div>
  );
}
