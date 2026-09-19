import { TradeSignal } from '../types';
import { isWeekendMarketClosed } from './shieldMonitor';

export const DEFAULT_TELEGRAM_TOKEN = '8676995594:AAGUvAV4X8P_pwk0NbIKHEWMyZ7NgbktjOc';
export const DEFAULT_TELEGRAM_CHANNEL_ID = '-1004433974736';
export const DEFAULT_TELEGRAM_CHAT_ID = '1242072321';

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  results?: Array<{ target: string; success: boolean; messageId?: number; error?: string }>;
  error?: string;
}

/**
 * Sends a raw message to Telegram Bot for a single chat/channel ID
 */
export async function sendTelegramRawMessage(
  token: string,
  chatId: string,
  messageHtml: string
): Promise<TelegramSendResult> {
  const cleanToken = token.trim();
  const cleanChatId = chatId.trim();

  if (!cleanToken || !cleanChatId) {
    return { success: false, error: 'رمز البوت (Token) أو معرف الوجهة (Chat/Channel ID) غير محدد' };
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: messageHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();

    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    } else {
      let desc = data.description || `فشل الإرسال (رمز: ${data.error_code})`;
      if (desc.includes('chat not found')) {
        desc = `لم يتم العثور على القناة أو المحادثة (${cleanChatId}). تأكد من إضافة البوت كـ مشرف (Admin) في القناة.`;
      } else if (desc.includes('bot is not a member') || desc.includes('bot was kicked')) {
        desc = `البوت ليس عضواً في القناة (${cleanChatId}). يرجى إضافة البوت كـ مسؤول (Admin) مع صلاحية نشر الرسائل.`;
      }
      return {
        success: false,
        error: desc,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'تعذر الاتصال بخوادم تليجرام (يرجى التحقق من اتصال الإنترنت أو القيود)',
    };
  }
}

/**
 * Sends a raw message to one or multiple target IDs (e.g. channel and personal chat)
 */
export async function sendTelegramMultiTarget(
  token: string,
  targetIds: string[] | string,
  messageHtml: string
): Promise<TelegramSendResult> {
  const targets = (Array.isArray(targetIds) ? targetIds : [targetIds])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (targets.length === 0) {
    return { success: false, error: 'لم يتم تحديد وجهة إرسال صالحة (قناة أو محادثة)' };
  }

  const results: Array<{ target: string; success: boolean; messageId?: number; error?: string }> = [];

  for (const target of targets) {
    const res = await sendTelegramRawMessage(token, target, messageHtml);
    results.push({
      target,
      success: res.success,
      messageId: res.messageId,
      error: res.error,
    });
  }

  const anySuccess = results.some((r) => r.success);
  const allErrors = results
    .filter((r) => !r.success)
    .map((r) => `[${r.target}]: ${r.error}`)
    .join(' | ');

  return {
    success: anySuccess,
    messageId: results.find((r) => r.success)?.messageId,
    results,
    error: anySuccess ? undefined : allErrors,
  };
}

/**
 * Helper to format price with proper symbol conventions and precision
 */
export function formatTelegramPrice(val: number, symbol?: string): string {
  if (isNaN(val) || val === undefined || val === null) return '0.00';
  const isMetal = symbol?.includes('XAU') || symbol?.includes('XAG') || symbol?.includes('GOLD') || symbol?.includes('SILVER');
  const isJpy = symbol?.includes('JPY');

  if (isMetal) {
    const dec = symbol?.includes('XAG') ? 3 : 2;
    return `$${val.toFixed(dec)}`;
  }
  if (isJpy) {
    return val.toFixed(3);
  }
  return val.toFixed(5);
}

/**
 * Formats a trading signal into the user-specified template with TP being the final target (TP4)
 */
export function formatSignalTelegramMessage(signal: TradeSignal, forHtml = true): string {
  const isBuy = signal.orderType.includes('BUY');
  const title = isBuy ? '📈 🟢 إشارة شراء مؤكدة (BUY)' : '📉 🔴 إشارة بيع مؤكدة (SELL)';
  const currentPrice = signal.currentPrice || signal.entryPrice;
  // tp is the final target (tp4) as explicitly requested by user
  const tpFinal = signal.tpTargets?.tp4 ?? signal.entryPrice;
  const sl = signal.slPrice;
  const sym = signal.symbol;

  if (forHtml) {
    return [
      `<b>${title}</b>`,
      `════════════════════`,
      `🪙 العملة / الزوج: <b>${sym}</b>`,
      `💵 السعر اللحظي الحالي: <code>${formatTelegramPrice(currentPrice, sym)}</code>`,
      `🎯 سعر الدخول المقترح: <code>${formatTelegramPrice(signal.entryPrice, sym)}</code>`,
      `🎯 الهدف الموحد (TP): <code>${formatTelegramPrice(tpFinal, sym)}</code>`,
      `🛑 وقف الخسارة (SL): <code>${formatTelegramPrice(sl, sym)}</code>`,
    ].join('\n');
  }

  return [
    title,
    '════════════════════',
    `🪙 العملة / الزوج: ${sym}`,
    `💵 السعر اللحظي الحالي: ${formatTelegramPrice(currentPrice, sym)}`,
    `🎯 سعر الدخول المقترح: ${formatTelegramPrice(signal.entryPrice, sym)}`,
    `🎯 الهدف الموحد (TP): ${formatTelegramPrice(tpFinal, sym)}`,
    `🛑 وقف الخسارة (SL): ${formatTelegramPrice(sl, sym)}`,
  ].join('\n');
}

/**
 * Formats and dispatches a trading signal to Telegram channel/chat matching user template
 */
export async function sendTradeSignalToTelegram(
  signal: TradeSignal,
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID],
  forceOverrideWeekend: boolean = false
): Promise<TelegramSendResult> {
  if (!forceOverrideWeekend && isWeekendMarketClosed()) {
    console.warn('⛔ [Telegram Shield] Blocked sending signal to Telegram: Weekend market closure is active.');
    return {
      success: false,
      error: 'تم حظر الإرسال: السوق المالي العالمي مغلق حالياً (عطلة نهاية الأسبوع من مساء الجمعة حتى مساء الأحد)',
    };
  }

  const msg = formatSignalTelegramMessage(signal, true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Sends a test verification message to verify Telegram bot connection in the requested template
 */
export async function testTelegramConnection(
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const testMsg = [
    `<b>📈 🟢 إشارة شراء مؤكدة (BUY) [رسالة اختبارية]</b>`,
    `════════════════════`,
    `🪙 العملة / الزوج: <b>XAUUSD</b>`,
    `💵 السعر الحالي: <code>$2658.40</code>`,
    `🎯 سعر الدخول المقترح: <code>$2650.00</code>`,
    `🎯 الهدف الموحد (TP): <code>$2675.00</code>`,
    `🛑 وقف الخسارة (SL): <code>$2640.00</code>`,
  ].join('\n');

  return sendTelegramMultiTarget(token, targetIds, testMsg);
}
