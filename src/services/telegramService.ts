import { TradeSignal } from '../types';
import { isWeekendMarketClosed } from './shieldMonitor';
import {
  EconomicDecisionEvent,
  formatDailyMarketBriefTelegram,
  formatEconomicDecisionTelegram,
  formatKillZoneTelegram,
  formatSessionAlertTelegram,
  formatWeekendStatusTelegram,
  MarketSessionDetail,
} from './marketHoursService';

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
  const rawTargets = Array.isArray(targetIds) ? targetIds : [targetIds];
  // Strict deduplication: ensure no ID appears more than once
  const targets = Array.from(new Set(rawTargets.map((t) => t.trim()))).filter((t) => t.length > 0);

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
 * Helper to calculate pips difference between two price levels
 */
export function calculatePipsDifference(symbol: string, fromPrice: number, toPrice: number): number {
  const diff = Math.abs(toPrice - fromPrice);
  if (symbol.includes('XAU') || symbol.includes('GOLD')) {
    return Number((diff / 0.10).toFixed(1)); // 1 pip = 10 cents
  }
  if (symbol.includes('XAG') || symbol.includes('SILVER')) {
    return Number((diff / 0.01).toFixed(1)); // 1 pip = 1 cent
  }
  if (symbol.includes('JPY')) {
    return Number((diff / 0.01).toFixed(1)); // 1 pip = 0.01
  }
  return Number((diff / 0.0001).toFixed(1)); // Standard forex: 1 pip = 0.0001
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
 * Arabic asset title helper
 */
function getSymbolArabicName(sym: string): string {
  if (sym.includes('XAU')) return 'الذهب / الدولار الأمريكي';
  if (sym.includes('GBP/JPY') || sym.includes('GBPJPY')) return 'الباوند / الين الياباني (The Dragon)';
  if (sym.includes('EUR/USD') || sym.includes('EURUSD')) return 'اليورو / الدولار الأمريكي';
  if (sym.includes('USD/JPY') || sym.includes('USDJPY')) return 'الدولار الأمريكي / الين الياباني';
  if (sym.includes('XAG')) return 'الفضة / الدولار الأمريكي';
  if (sym.includes('GBP/USD')) return 'الجنيه الإسترليني / الدولار الأمريكي';
  return sym;
}

// ─────────────────────────────────────────────────────────────
// 1. New Signal Message Template (نموذج الإشارة البسيط والأنيق)
// ─────────────────────────────────────────────────────────────

/**
 * Formats an ultra-clean, simple, and high-clarity trading signal message
 */
export function formatSignalTelegramMessage(signal: TradeSignal, forHtml = true): string {
  const isBuy = signal.orderType.includes('BUY');
  const actionHeader = isBuy ? 'شراء 🟢 | BUY' : 'بيع 🔴 | SELL';
  const sym = signal.symbol;

  const tp1 = signal.tpTargets?.tp1 ?? signal.entryPrice;
  const tp2 = signal.tpTargets?.tp2 ?? signal.entryPrice;
  const tp3 = signal.tpTargets?.tp3 ?? signal.entryPrice;
  const tp4 = signal.tpTargets?.tp4 ?? signal.entryPrice;
  const sl = signal.slPrice;

  const tp1Pips = calculatePipsDifference(sym, signal.entryPrice, tp1);
  const tp2Pips = calculatePipsDifference(sym, signal.entryPrice, tp2);
  const tp3Pips = calculatePipsDifference(sym, signal.entryPrice, tp3);
  const tp4Pips = calculatePipsDifference(sym, signal.entryPrice, tp4);
  const slPips = calculatePipsDifference(sym, signal.entryPrice, sl);

  const lotStr = (signal.lotSize || 0.01).toFixed(2);
  const riskDollarsStr = signal.riskDollars ? `$${signal.riskDollars.toFixed(0)}` : '$10';

  if (forHtml) {
    const vpBadge = signal.gates?.volumeProfile?.confluentLevelName && signal.gates.volumeProfile.confluentLevelName !== 'NONE'
      ? `• <b>Volume Profile:</b> ${signal.gates.volumeProfile.confluentLevelName} Node`
      : `• <b>Volume Profile:</b> POC Confluence`;
    const vwapBadge = signal.gates?.sessionVwap?.aligned
      ? `• <b>Session VWAP:</b> متوافق مع التدفق المؤسسي`
      : `• <b>Session VWAP:</b> اختبار ارتدادي`;
    const triggerBadge = signal.gates?.smcTrigger?.triggerDescription
      ? `• <b>زناد الدخول:</b> ${signal.gates.smcTrigger.triggerDescription}`
      : `• <b>زناد الدخول:</b> كنس سيولة (Sweep) + كسر هيكل (MSS) + FVG`;

    return [
      `⚡ <b>${actionHeader}: ${sym}</b>`,
      `─────────────────`,
      `🔹 <b>الدخول:</b> <code>${formatTelegramPrice(signal.entryPrice, sym)}</code>`,
      `🛑 <b>الوقف (Dynamic ATR SL):</b> <code>${formatTelegramPrice(sl, sym)}</code> (-${slPips}p)`,
      ``,
      `🎯 <b>الأهداف:</b>`,
      `• <b>الهدف 1:</b> <code>${formatTelegramPrice(tp1, sym)}</code> (+${tp1Pips}p) 🔒 <i>تأمين</i>`,
      `• <b>الهدف 2:</b> <code>${formatTelegramPrice(tp2, sym)}</code> (+${tp2Pips}p)`,
      `• <b>الهدف 3:</b> <code>${formatTelegramPrice(tp3, sym)}</code> (+${tp3Pips}p)`,
      `• <b>الهدف 4:</b> <code>${formatTelegramPrice(tp4, sym)}</code> (+${tp4Pips}p)`,
      `─────────────────`,
      `🏛️ <b>التوافق المؤسسي الحديث:</b>`,
      vpBadge,
      vwapBadge,
      triggerBadge,
      `─────────────────`,
      `🛡️ <b>إدارة المخاطر الصارمة (Micro-Lot Guard):</b>`,
      `• <b>حجم العقد الإلزامي:</b> <code>0.01 Lot</code> فقط 🔒`,
      `• <b>أقصى خسارة عند الوقف:</b> <code>-${riskDollarsStr}</code> فقط`,
      `⚠️ <i>تنبيه: يُمنع نهائياً فتح لوت أعلى (مثل 1.00) لحماية رأس المال من التراجع!</i>`,
    ].join('\n');
  }

  return [
    `⚡ ${actionHeader}: ${sym}`,
    `─────────────────`,
    `🔹 الدخول: ${formatTelegramPrice(signal.entryPrice, sym)}`,
    `🛑 الوقف (Dynamic ATR SL): ${formatTelegramPrice(sl, sym)} (-${slPips}p)`,
    ``,
    `🎯 الأهداف:`,
    `• الهدف 1: ${formatTelegramPrice(tp1, sym)} (+${tp1Pips}p) 🔒 تأمين`,
    `• الهدف 2: ${formatTelegramPrice(tp2, sym)} (+${tp2Pips}p)`,
    `• الهدف 3: ${formatTelegramPrice(tp3, sym)} (+${tp3Pips}p)`,
    `• الهدف 4: ${formatTelegramPrice(tp4, sym)} (+${tp4Pips}p)`,
    `─────────────────`,
    `🏛️ التوافق المؤسسي:`,
    `• Volume Profile: POC/VAH/VAL Confluence`,
    `• Session VWAP: Institutional Flow Aligned`,
    `• زناد الدخول: Sweep + MSS + FVG Retest`,
    `─────────────────`,
    `🛡️ إدارة المخاطر: 0.01 Lot فقط (أقصى خسارة: -${riskDollarsStr})`,
    `⚠️ لا تفتح لوت أعلى لتفادي الخسائر الكبيرة!`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// 2. Target Hit Update Templates (تحديثات الأهداف - بسيطة ومباشرة)
// ─────────────────────────────────────────────────────────────

/**
 * Formats a Target Hit update notification (Focused exclusively on key milestones to reduce noise)
 */
export function formatTargetHitTelegramMessage(
  signal: TradeSignal,
  targetHit: 'TP1' | 'TP2' | 'TP3' | 'TP4',
  livePips: number,
  forHtml = true
): string {
  const isBuy = signal.orderType.includes('BUY');
  const dir = isBuy ? 'شراء 🟢' : 'بيع 🔴';
  const sym = signal.symbol;
  const pips = Math.abs(livePips).toFixed(1);

  if (targetHit === 'TP1') {
    if (forHtml) {
      return [
        `🎯 <b>تحقق الهدف الأول (TP1) ✅</b>`,
        `─────────────────`,
        `🪙 <b>${sym}</b> (${dir})`,
        `💰 <b>الربح:</b> +${pips} نقطة 🚀`,
        `🔒 <b>الإجراء:</b> نقل الوقف لسعر الدخول (تأمين كامل)`,
      ].join('\n');
    }
    return [
      `🎯 تحقق الهدف الأول (TP1) ✅`,
      `─────────────────`,
      `🪙 ${sym} (${dir})`,
      `💰 الربح: +${pips} نقطة 🚀`,
      `🔒 الإجراء: نقل الوقف لسعر الدخول (تأمين كامل)`,
    ].join('\n');
  }

  if (targetHit === 'TP2') {
    if (forHtml) {
      return [
        `🚀 <b>تحقق الهدف الثاني (TP2) ✅</b>`,
        `─────────────────`,
        `🪙 <b>${sym}</b> (${dir})`,
        `💰 <b>الربح:</b> +${pips} نقطة 🔥`,
      ].join('\n');
    }
    return [
      `🚀 تحقق الهدف الثاني (TP2) ✅`,
      `─────────────────`,
      `🪙 ${sym} (${dir})`,
      `💰 الربح: +${pips} نقطة 🔥`,
    ].join('\n');
  }

  if (targetHit === 'TP3') {
    if (forHtml) {
      return [
        `🎯 <b>تحقق الهدف الثالث (TP3) ✅</b>`,
        `─────────────────`,
        `🪙 <b>${sym}</b> (${dir})`,
        `💰 <b>الربح:</b> +${pips} نقطة ⚡`,
      ].join('\n');
    }
    return [
      `🎯 تحقق الهدف الثالث (TP3) ✅`,
      `─────────────────`,
      `🪙 ${sym} (${dir})`,
      `💰 الربح: +${pips} نقطة ⚡`,
    ].join('\n');
  }

  // TP4: Full Target Win (إغلاق كامل)
  if (forHtml) {
    return [
      `🏆 <b>تحقق كامل الأهداف (TP4) 👑</b>`,
      `─────────────────`,
      `🪙 <b>${sym}</b> (${dir})`,
      `💰 <b>إجمالي الربح:</b> +${pips} نقطة كاملة! 🚀`,
      `✅ <b>تم إغلاق الصفقة بالكامل بنجاح</b>`,
    ].join('\n');
  }
  return [
    `🏆 تحقق كامل الأهداف (TP4) 👑`,
    `─────────────────`,
    `🪙 ${sym} (${dir})`,
    `💰 إجمالي الربح: +${pips} نقطة كاملة! 🚀`,
    `✅ تم إغلاق الصفقة بالكامل بنجاح`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// 3. Stop Loss Hit Update Template (ضرب وقف الخسارة - بسيط)
// ─────────────────────────────────────────────────────────────

/**
 * Formats a Stop Loss Hit notification - simple & disciplined
 */
export function formatStopLossHitTelegramMessage(
  signal: TradeSignal,
  livePips: number,
  forHtml = true
): string {
  const isBuy = signal.orderType.includes('BUY');
  const dir = isBuy ? 'شراء 🟢' : 'بيع 🔴';
  const sym = signal.symbol;
  const pips = Math.abs(livePips).toFixed(1);

  if (forHtml) {
    return [
      `🛑 <b>ضرب وقف الخسارة (SL)</b>`,
      `─────────────────`,
      `🪙 <b>${sym}</b> (${dir})`,
      `🔻 <b>الخسارة:</b> -${pips} نقطة (-1.0% محددة)`,
    ].join('\n');
  }
  return [
    `🛑 ضرب وقف الخسارة (SL)`,
    `─────────────────`,
    `🪙 ${sym} (${dir})`,
    `🔻 الخسارة: -${pips} نقطة (-1.0% محددة)`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// 4. Breakeven Alert Template (تأمين الصفقة - بسيط)
// ─────────────────────────────────────────────────────────────

/**
 * Formats a Breakeven alert - simple & concise
 */
export function formatBreakevenTelegramMessage(signal: TradeSignal, forHtml = true): string {
  const isBuy = signal.orderType.includes('BUY');
  const dir = isBuy ? 'شراء 🟢' : 'بيع 🔴';
  const sym = signal.symbol;

  if (forHtml) {
    return [
      `🔒 <b>تأمين الصفقة (Breakeven)</b>`,
      `─────────────────`,
      `🪙 <b>${sym}</b> (${dir})`,
      `✅ <b>تم نقل الوقف لسعر الدخول:</b> <code>${formatTelegramPrice(signal.entryPrice, sym)}</code>`,
      `🛡️ الصفقة خالية من المخاطر (Risk-Free)`,
    ].join('\n');
  }
  return [
    `🔒 تأمين الصفقة (Breakeven)`,
    `─────────────────`,
    `🪙 ${sym} (${dir})`,
    `✅ تم نقل الوقف لسعر الدخول: ${formatTelegramPrice(signal.entryPrice, sym)}`,
    `🛡️ الصفقة خالية من المخاطر (Risk-Free)`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// Dispatch Functions & Anti-Duplicate Shield (دوال الإرسال المباشر وحظر التكرار)
// ─────────────────────────────────────────────────────────────

// Track dispatched signals per symbol with timestamps to prevent duplicate messages for the same currency at the same time
const symbolLastDispatchedTime = new Map<string, number>();

// Minimum interval between new signal messages for the SAME symbol (60 minutes cooldown to prevent rapid whipsaws/flipping)
export const SAME_SYMBOL_COOLDOWN_MS = 60 * 60 * 1000;

export function normalizeSymbolKey(sym: string): string {
  return sym.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function isSameSymbolRecentlyDispatched(symbol: string, cooldownMs: number = SAME_SYMBOL_COOLDOWN_MS): boolean {
  const cleanSym = normalizeSymbolKey(symbol);
  const lastTime = symbolLastDispatchedTime.get(cleanSym);
  if (!lastTime) return false;
  return Date.now() - lastTime < cooldownMs;
}

export function recordSymbolDispatched(symbol: string): void {
  const cleanSym = normalizeSymbolKey(symbol);
  symbolLastDispatchedTime.set(cleanSym, Date.now());
}

export function clearSymbolDispatched(symbol: string): void {
  const cleanSym = normalizeSymbolKey(symbol);
  symbolLastDispatchedTime.delete(cleanSym);
}

/**
 * Dispatches a new trade signal to Telegram channel/chat
 * Includes strict anti-duplicate protection per currency.
 */
export async function sendTradeSignalToTelegram(
  signal: TradeSignal,
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID],
  forceOverrideWeekend: boolean = false,
  skipDuplicateCheck: boolean = false
): Promise<TelegramSendResult> {
  if (!forceOverrideWeekend && isWeekendMarketClosed()) {
    console.warn('⛔ [Telegram Shield] Blocked sending signal: Weekend market closure is active.');
    return {
      success: false,
      error: 'تم حظر الإرسال: السوق المالي العالمي مغلق حالياً (عطلة نهاية الأسبوع)',
    };
  }

  // Anti-Duplicate Protection: block repeating signal for the SAME currency in the same time frame
  const cleanSym = normalizeSymbolKey(signal.symbol);
  if (!skipDuplicateCheck && isSameSymbolRecentlyDispatched(cleanSym, 60 * 60 * 1000)) {
    console.warn(`🛑 [Telegram Anti-Duplicate] Blocked repeated signal for ${signal.symbol}: already dispatched recently.`);
    return {
      success: false,
      error: `تم منع التكرار: توجد إشارة مرسلة مسبقاً لنفس العملة (${signal.symbol}) في نفس الوقت.`,
    };
  }

  // Pre-emptively record dispatch to avoid concurrent race conditions
  recordSymbolDispatched(cleanSym);

  const msg = formatSignalTelegramMessage(signal, true);
  const result = await sendTelegramMultiTarget(token, targetIds, msg);

  if (!result.success) {
    // If delivery failed completely, release the lock
    clearSymbolDispatched(cleanSym);
  }

  return result;
}

/**
 * Dispatches a Target Hit update (TP1, TP2, TP3, TP4) to Telegram
 */
export async function sendTargetHitToTelegram(
  signal: TradeSignal,
  targetHit: 'TP1' | 'TP2' | 'TP3' | 'TP4',
  livePips: number,
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const msg = formatTargetHitTelegramMessage(signal, targetHit, livePips, true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Dispatches a Stop Loss Hit notification to Telegram
 * PERMANENTLY DISABLED per user request: Stop Loss messages are cancelled and replaced
 * with market session open/close, golden trading windows, and high-impact economic alerts.
 */
export async function sendStopLossHitToTelegram(
  signal: TradeSignal,
  _livePips: number,
  _token: string = DEFAULT_TELEGRAM_TOKEN,
  _targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  console.log(`ℹ️ [Telegram Alert] Stop Loss message for ${signal.symbol} silenced (SL alert cancelled per user request).`);
  return { success: true };
}

/**
 * Broadcasts Market Session Open or Close Alert to Telegram
 */
export async function sendSessionAlertToTelegram(
  session: MarketSessionDetail,
  eventType: 'OPEN' | 'CLOSE',
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const msg = formatSessionAlertTelegram(session, eventType, true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Broadcasts Golden Trading Window (Kill Zone) or Rollover Alert to Telegram
 */
export async function sendKillZoneAlertToTelegram(
  zoneType: 'LONDON_OPEN' | 'OVERLAP' | 'ROLLOVER',
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const msg = formatKillZoneTelegram(zoneType, true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Broadcasts Weekend Market Close or Open Status to Telegram
 */
export async function sendWeekendStatusToTelegram(
  statusType: 'CLOSE_ALERT' | 'CLOSED_WEEKEND' | 'OPEN_ALERT',
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const msg = formatWeekendStatusTelegram(statusType, true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Broadcasts High-Impact Economic Decision Alert to Telegram
 */
export async function sendEconomicDecisionAlertToTelegram(
  event: EconomicDecisionEvent,
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const msg = formatEconomicDecisionTelegram(event, true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Broadcasts Daily Full Market Brief (Sessions & Key Hours) to Telegram
 */
export async function sendDailyMarketBriefToTelegram(
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const msg = formatDailyMarketBriefTelegram(true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Dispatches a Breakeven alert to Telegram
 */
export async function sendBreakevenToTelegram(
  signal: TradeSignal,
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const msg = formatBreakevenTelegramMessage(signal, true);
  return sendTelegramMultiTarget(token, targetIds, msg);
}

/**
 * Sends a test verification message to verify Telegram bot connection
 */
export async function testTelegramConnection(
  token: string = DEFAULT_TELEGRAM_TOKEN,
  targetIds: string[] | string = [DEFAULT_TELEGRAM_CHANNEL_ID, DEFAULT_TELEGRAM_CHAT_ID]
): Promise<TelegramSendResult> {
  const testMsg = [
    `⚡ <b>شراء 🟢 | BUY: XAU/USD (تجربة)</b>`,
    `─────────────────`,
    `🔹 <b>الدخول:</b> <code>$2650.00</code>`,
    `🛑 <b>الوقف (SL):</b> <code>$2634.00</code> (-160p)`,
    ``,
    `🎯 <b>الأهداف:</b>`,
    `• <b>الهدف 1:</b> <code>$2658.00</code> (+80p) 🔒 <i>تأمين</i>`,
    `• <b>الهدف 2:</b> <code>$2666.00</code> (+160p)`,
    `• <b>الهدف 3:</b> <code>$2674.00</code> (+240p)`,
    `• <b>الهدف 4:</b> <code>$2682.00</code> (+320p)`,
    `─────────────────`,
    `📊 <b>اللوت:</b> <code>0.02 Lot</code> (لحساب $1000 / مخاطرة 1%)`,
    `✅ <b>اتصال البوت بالقناة يعمل بنجاح!</b>`,
  ].join('\n');

  return sendTelegramMultiTarget(token, targetIds, testMsg);
}
