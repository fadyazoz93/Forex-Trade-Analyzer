import React, { useState, useEffect } from 'react';
import { Activity, Check, Copy, Download, ExternalLink, RefreshCw, Terminal, ShieldCheck, Zap, Radio, Server, HelpCircle, Layers } from 'lucide-react';

interface Mt5BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Mt5StatusResponse {
  success: boolean;
  isConnected: boolean;
  lastTickTimestamp: number | null;
  totalTicksReceived: number;
  activeSymbols: string[];
  latencyMs: number;
  brokerServerName?: string;
  accountCurrency?: string;
}

export const Mt5BridgeModal: React.FC<Mt5BridgeModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<Mt5StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [eaCode, setEaCode] = useState<string>('');
  const [feedUrl, setFeedUrl] = useState<string>('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mt5/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }

      const scriptRes = await fetch('/api/mt5/ea-script');
      const scriptData = await scriptRes.json();
      if (scriptData.success) {
        setEaCode(scriptData.script);
        setFeedUrl(`${scriptData.serverUrl}/api/mt5/feed`);
      }
    } catch (err) {
      console.warn('Failed to fetch MT5 status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    const urlToCopy = feedUrl || `${window.location.origin}/api/mt5/feed`;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyCode = () => {
    if (!eaCode) return;
    navigator.clipboard.writeText(eaCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadEa = () => {
    window.location.href = '/api/mt5/ea-script?download=true';
  };

  const isLive = status?.isConnected;
  const currentHostUrl = feedUrl || `${window.location.origin}/api/mt5/feed`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              isLive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/40'
                : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
            }`}>
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                ربط منصة MetaTrader 5 (MT5 Live Feed)
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 border ${
                  isLive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  {isLive ? 'متصل ومطابق لوسيطك 100%' : 'جاهز للربط'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                بث الأسعار والشموع مباشرة من وسيطك في MT5 إلى المنصة بدون أي وسيط خارجي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Live Status Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${isLive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-200">حالة الربط المباشر مع MT5:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchStatus}
                  disabled={loading}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-slate-800"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>تحديث الحالة</span>
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">حالة البث</span>
                <span className={`text-xs font-bold font-mono ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isLive ? 'نشط (Live)' : 'سحابي احتياطي'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">التيكات المستلمة</span>
                <span className="text-xs font-bold font-mono text-cyan-400">
                  {status?.totalTicksReceived ? status.totalTicksReceived.toLocaleString() : '0'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">الأزواج النشطة</span>
                <span className="text-xs font-bold font-mono text-purple-400">
                  {status?.activeSymbols?.length ? status.activeSymbols.join(', ') : 'XAUUSD, ...'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">سيرفر الوسيط</span>
                <span className="text-[11px] font-bold text-slate-200 truncate block" title={status?.brokerServerName}>
                  {status?.brokerServerName ? status.brokerServerName.split('-')[0] : 'MetaTrader 5'}
                </span>
              </div>
            </div>
          </div>

          {/* Webhook Endpoint Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" />
                رابط الاستقبال المباشر (MT5 WebRequest URL):
              </span>
              <button
                onClick={handleCopyUrl}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
            <div className="text-[11px] font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-slate-300 break-all select-all flex items-center justify-between">
              <span>{currentHostUrl}</span>
            </div>
          </div>

          {/* Download & Copy EA Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 to-slate-950/70 border border-cyan-800/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  ملف الربط المباشر: MT5_AIS_Bridge_EA.mq5
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  كود MQL5 أصلي 100% بدون أي ملفات DLL خارجية، خفيف ولا يؤثر على سرعة الميتاتريدر
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadEa}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-cyan-900/50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل الملف (.mq5)</span>
                </button>
                <button
                  onClick={handleCopyCode}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ الكود'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Step Setup Guide */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              طريقة التثبيت في MetaTrader 5 في 3 خطوات بسيطة:
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </span>
                <span>
                  من داخل MT5، اضغط على <strong>File</strong> ثم <strong>Open Data Folder</strong>، وادخل إلى المجلد:
                  <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded mx-1 font-mono text-[11px]">MQL5 \ Experts</code>
                  وضع الملف هناك.
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </span>
                <span>
                  من القائمة العلوية اضغط <strong>Tools</strong> ثم <strong>Options</strong> ثم تبويب <strong>Expert Advisors</strong>:
                  ضع علامة صح على <strong>Allow WebRequest for listed URL</strong> وأضف رابط السيرفر:
                  <code className="text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded mx-1 font-mono text-[10px] break-all">{currentHostUrl}</code>
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </span>
                <span>
                  من نافذة <strong>Navigator</strong> في MT5، اضغط كليك يمين على Experts واضغط <strong>Refresh</strong>، ثم اسحب الإكسبيرت على شارت الذهب (XAUUSD) أو أي زوج، وسيبدأ البث اللحظي فوراً!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            اتصال آمن ومباشر بين حسابك وسيرفرك بدون طرف ثالث
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
