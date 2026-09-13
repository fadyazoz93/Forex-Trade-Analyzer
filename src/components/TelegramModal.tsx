import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Info,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  DEFAULT_TELEGRAM_CHANNEL_ID,
  DEFAULT_TELEGRAM_CHAT_ID,
  DEFAULT_TELEGRAM_TOKEN,
  testTelegramConnection,
} from '../services/telegramService';
import { TelegramConfig } from '../types';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSaveConfig: (config: TelegramConfig) => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [botToken, setBotToken] = useState(config.botToken || DEFAULT_TELEGRAM_TOKEN);
  const [channelId, setChannelId] = useState(config.channelId || DEFAULT_TELEGRAM_CHANNEL_ID);
  const [autoSend, setAutoSend] = useState(config.autoSend ?? true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    details?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestDestination = async () => {
    setIsTesting(true);
    setTestResult(null);

    const targetIds = [channelId.trim()];
    const targetLabel = `قناة التليجرام (${channelId})`;

    const res = await testTelegramConnection(botToken.trim(), targetIds);
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: `تم إرسال رسالة الاختبار بنجاح إلى ${targetLabel}!`,
        details: res.messageId ? `معرف الرسالة المعتمد: #${res.messageId}` : undefined,
      });
    } else {
      setTestResult({
        success: false,
        message: `فشل الإرسال إلى ${targetLabel}.`,
        details: res.error || 'يرجى التأكد من إضافة البوت كـ مشرف (Admin) في القناة.',
      });
    }
  };

  const handleSave = () => {
    onSaveConfig({
      enabled: true,
      botToken: botToken.trim(),
      channelId: channelId.trim(),
      chatId: '', // Unused
      sendTarget: 'channel',
      autoSend,
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setBotToken(DEFAULT_TELEGRAM_TOKEN);
    setChannelId(DEFAULT_TELEGRAM_CHANNEL_ID);
    setAutoSend(true);
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  إعدادات البوت وقناة تليجرام
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40">
                  V42 Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                إرسال الإشارات اللحظية، الأهداف الأربعة، ونقاط الدخول والوقف
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Active Configuration Overview Card */}
          <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-xs text-sky-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sky-300">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>تم تفعيل وحفظ بيانات القناة والبوت المعتمدة:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              تم ضبط رمز البوت (Bot Token)، ومعرف القناة (<span className="font-mono text-cyan-300">{channelId}</span>). يمكنك اختبار الرسائل مباشرة الآن.
            </p>
          </div>

          {/* Bot Token Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>رمز توكن البوت (Telegram Bot Token)</span>
              <span className="text-[10px] text-slate-400 font-normal">Bot API Key</span>
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="8676995594:AAGUvAV4X8P_pwk0NbIKHEWMyZ7NgbktjOc"
            />
          </div>

          {/* Channel ID Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>معرف القناة (Channel ID)</span>
            </label>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="-1004433974736"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              قناة تليجرام المعتمدة للإشارات
            </span>
          </div>

          {/* Auto Send Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>الإرسال التلقائي الفوري (Auto-Broadcast)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                إرسال الإشارة آلياً فور اكتمال بوابات الـ 5SOP ومربع التسعة
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Test Buttons Toolbar */}
          <div className="space-y-2 pt-1">
            <div className="text-xs font-bold text-slate-400 mb-1.5">
              اختبار الإرسال الحي المباشر:
            </div>
            <div>
              <button
                type="button"
                onClick={handleTestDestination}
                disabled={isTesting}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 min-h-[40px] cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>اختبار القناة ({channelId})</span>
              </button>
            </div>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold text-sm">{testResult.message}</div>
                {testResult.details && (
                  <div className="text-[11px] opacity-90 leading-relaxed font-mono">
                    {testResult.details}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Format Preview Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>شكل الرسالة المعتمد على القناة (مع الهدف الموحد TP4):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">قالب الرسالة المباشرة</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 font-mono text-xs text-slate-200 space-y-1 select-all leading-relaxed">
              <div className="text-emerald-400 font-bold">📈 🟢 إشارة شراء مؤكدة (BUY)</div>
              <div className="text-slate-600">════════════════════</div>
              <div>🪙 العملة / الزوج: <span className="text-white font-bold">XAUUSD</span></div>
              <div>💵 السعر الحالي: <span className="text-cyan-300 font-bold">$2658.40</span></div>
              <div>🎯 سعر الدخول المقترح: <span className="text-white font-bold">$2650.00</span></div>
              <div>🎯 الهدف الموحد (TP): <span className="text-emerald-300 font-bold">$2675.00</span> <span className="text-[10px] text-slate-400 font-sans">(الهدف الأخير TP4)</span></div>
              <div>🛑 وقف الخسارة (SL): <span className="text-rose-400 font-bold">$2640.00</span></div>
            </div>
          </div>

          {/* Important Telegram Tips */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>ملاحظات هامة لتشغيل القناة بنجاح:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400 pr-1">
              <li>يجب إضافة البوت كـ <b>مشرف (Administrator)</b> داخل قناة التليجرام (<span className="font-mono text-slate-300">{channelId}</span>) مع تفعيل صلاحية <b>نشر الرسائل (Post Messages)</b>.</li>
            </ul>
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-cyan-500/20 min-h-[42px] cursor-pointer active:scale-98"
            >
              حفظ وتطبيق الإعدادات
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
              title="استعادة القيم الافتراضية"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
