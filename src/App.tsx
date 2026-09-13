import React, { useEffect, useRef, useState } from 'react';
import { GannModal } from './components/GannModal';
import { Header } from './components/Header';
import { InteractiveCandlestickModal } from './components/InteractiveCandlestickModal';
import { MarketSessionsClock } from './components/MarketSessionsClock';
import { MarketWatch } from './components/MarketWatch';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { ShieldBanner } from './components/ShieldBanner';
import { SignalFeed } from './components/SignalFeed';
import { SignalHistoryTable } from './components/SignalHistoryTable';
import { StrategyMatrixExplainer } from './components/StrategyMatrixExplainer';
import { TelegramModal } from './components/TelegramModal';
import { DatabaseModal } from './components/DatabaseModal';
import { TARGET_SYMBOLS } from './data/symbols';
import {
  emitBatchMarketTicks,
  fetchLiveExchangeRates,
  forceSyncLivePrices,
  getAllTicks,
  getLiveFeedStatus,
  initializeMarketData,
  setCustomSymbolPrice,
  subscribeToFeedStatus,
  subscribeToRealtimeTicks,
} from './services/marketDataFeed';
import { getShieldStatus } from './services/shieldMonitor';
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

  // Settings state
  const [riskSettings, setRiskSettings] = useState<AccountRiskSettings>({
    balance: 10000,
    riskPercent: 1.0,
    maxRiskDollars: 1000,
    maxLotPerTrade: 2.0,
    maxTotalLots: 5.0,
    useAutoLot: true,
    fixedLot: 0.01,
    maxGlobalPositions: 5,
    minMarginLevel: 300,
    maxDailyLossPercent: 5.0,
    dailyTargetProfitPct: 10.0,
  });

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
    fetchLiveExchangeRates();
    setTicks(getAllTicks());
    setShieldStatus(getShieldStatus());

    // Initial instant scan
    handlePerformScan(engineRef.current);

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

    // High-frequency tick generator (Ticks 2-4 assets every 700ms)
    const tickInterval = setInterval(() => {
      emitBatchMarketTicks();
    }, 700);

    // Clock update interval for UTC server time
    const clockTimer = setInterval(() => {
      setShieldStatus(getShieldStatus());
    }, 15000);

    // Periodic exchange rate calibration
    const rateTimer = setInterval(() => {
      fetchLiveExchangeRates();
    }, 45000);

    // Backup sweep scan every 6 seconds to ensure no confluence is left behind
    const sweepInterval = setInterval(() => {
      handlePerformScan(engineRef.current, false);
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
    // Avoid duplicate active signal on the exact same symbol and direction
    const alreadyActive = activeSignalsRef.current.some(
      (s) =>
        s.symbol === newSignal.symbol &&
        s.orderType === newSignal.orderType &&
        s.status === 'ACTIVE'
    );
    if (alreadyActive) return;

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

    // Auto-send to Telegram channel immediately if enabled
    if (telegramConfigRef.current.autoSend) {
      const sigKey = getSignalKey(newSignal);
      if (!sentSignalsTrackerRef.current.has(sigKey)) {
        sentSignalsTrackerRef.current.add(sigKey);
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

  // Perform SOP Strategy Scan on all 12 assets
  const handlePerformScan = async (selectedEngine = engine, showSpinner = true) => {
    if (showSpinner) setIsScanning(true);

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

    // If signals discovered
    if (signals.length > 0) {
      setActiveSignals((prev) => {
        const merged = [...signals];
        prev.forEach((oldSig) => {
          if (!merged.some((m) => m.symbol === oldSig.symbol && m.orderType === oldSig.orderType)) {
            merged.push(oldSig);
          }
        });
        return merged;
      });

      setSignalHistory((prev) => {
        const updated = [...signals, ...prev];
        return updated.slice(0, 50);
      });

      // Auto-send newly discovered signals to Telegram channel if enabled
      if (telegramConfigRef.current.autoSend) {
        signals.forEach((sig) => {
          const sigKey = getSignalKey(sig);
          if (!sentSignalsTrackerRef.current.has(sigKey)) {
            sentSignalsTrackerRef.current.add(sigKey);
            handleSendTelegramSignal(sig);
          }
        });
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
      setActiveSignals((prev) =>
        prev.map((s) => (s.id === signal.id ? { ...s, telegramSent: true } : s))
      );
      setSignalHistory((prev) =>
        prev.map((s) => (s.id === signal.id ? { ...s, telegramSent: true } : s))
      );
      setToast({
        id: Date.now(),
        message: `تم إرسال إشارة ${signal.symbol} تلقائياً إلى قناة تليجرام بنجاح!`,
        type: signal.orderType.includes('BUY') ? 'buy' : 'sell',
      });
    } else if (result.error) {
      console.warn('Telegram auto-send alert:', result.error);
      setToast({
        id: Date.now(),
        message: `تنبيه تليجرام: ${result.error}`,
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
        shieldStatus={shieldStatus}
        activeSignalCount={activeSignals.length}
        isAudioOn={isAudioOn}
        onToggleAudio={handleToggleAudio}
        tickCount={tickCount}
      />

      {/* Protective Shield & Session Telemetry Banner */}
      <ShieldBanner
        status={shieldStatus}
        todayPnL={0}
        openLots={currentOpenLots}
        maxLots={riskSettings.maxTotalLots}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Real-time Global Forex Market Sessions Clock */}
        <MarketSessionsClock />

        {/* Active Real-Time Trading Signals Feed */}
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

        {/* Real-time Market Watch (Top 10 Forex Pairs + Gold + Silver) */}
        <MarketWatch
          symbols={TARGET_SYMBOLS}
          ticks={ticks}
          evaluations={evaluations}
          selectedSymbolId={selectedSymbolId}
          liveFeedStatus={liveFeedStatus}
          onSelectSymbol={setSelectedSymbolId}
          onInspectGann={(sym) => setInspectSymbol(sym)}
          onOpenChart={(sym) => setChartSymbol(sym)}
          onUpdateCustomPrice={handleUpdateCustomPrice}
          onForceSync={forceSyncLivePrices}
        />

        {/* Signals History & Analytics Table */}
        <SignalHistoryTable history={signalHistory} onExportCSV={handleExportCSV} />

        {/* Educational Strategy Matrix & Gann Rules Guide */}
        <StrategyMatrixExplainer />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
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
    </div>
  );
}
