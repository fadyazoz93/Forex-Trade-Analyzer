export interface MarketSessionDetail {
  id: 'sydney' | 'tokyo' | 'london' | 'newyork';
  nameAr: string;
  nameEn: string;
  city: string;
  country: string;
  flag: string;
  openUtcHour: number;   // UTC hour
  openUtcMin?: number;
  closeUtcHour: number;  // UTC hour
  closeUtcMin?: number;
  liquidity: 'منخفضة' | 'متوسطة' | 'عالية' | 'عظمى';
  bestSymbols: string[];
  descriptionAr: string;
  colorClass: string;
}

export interface MarketHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  nameAr: string;
  nameEn: string;
  impactedMarketsAr: string;
  type: 'CLOSED' | 'EARLY_CLOSE' | 'LOW_LIQUIDITY';
  typeAr: string;
  advisoryAr: string;
}

export const SESSIONS_LIST: MarketSessionDetail[] = [
  {
    id: 'sydney',
    nameAr: 'جلسة سيدني (أستراليا)',
    nameEn: 'Sydney Session',
    city: 'سيدني',
    country: 'أستراليا',
    flag: '🇦🇺',
    openUtcHour: 21,
    closeUtcHour: 6,
    liquidity: 'متوسطة',
    bestSymbols: ['AUDUSD', 'AUDJPY', 'NZDUSD'],
    descriptionAr: 'أول جلسة تفتتح الأسبوع المالي يوم الأحد 21:00 UTC، تتسم بسيولة هادئة وتأسيس نطاقات حركة العملات الآسيوية.',
    colorClass: 'indigo',
  },
  {
    id: 'tokyo',
    nameAr: 'جلسة طوكيو (الآسيوية)',
    nameEn: 'Tokyo Session',
    city: 'طوكيو',
    country: 'اليابان',
    flag: '🇯🇵',
    openUtcHour: 0,
    closeUtcHour: 9,
    liquidity: 'متوسطة',
    bestSymbols: ['USDJPY', 'GBPJPY', 'AUDJPY'],
    descriptionAr: 'مركز السيولة الآسيوية، مثالية لتحركات أزواج الين الياباني والسلع وتحديد مستويات الدعم والمقاومة الأولية.',
    colorClass: 'pink',
  },
  {
    id: 'london',
    nameAr: 'جلسة لندن (الأوروبية)',
    nameEn: 'London Session',
    city: 'لندن',
    country: 'المملكة المتحدة',
    flag: '🇬🇧',
    openUtcHour: 7,
    closeUtcHour: 16,
    liquidity: 'عالية',
    bestSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD', 'EURJPY'],
    descriptionAr: 'تستحوذ على أكثر من 35% من تداولات الفوركس العالمية، كسر القمم والقيعان وتفعيل استراتيجيات جان الرئيسية.',
    colorClass: 'cyan',
  },
  {
    id: 'newyork',
    nameAr: 'جلسة نيويورك (الأمريكية)',
    nameEn: 'New York Session',
    city: 'نيويورك',
    country: 'الولايات المتحدة',
    flag: '🇺🇸',
    openUtcHour: 12,
    closeUtcHour: 21,
    liquidity: 'عظمى',
    bestSymbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD'],
    descriptionAr: 'أكبر جلسة للأخبار الاقتصادية ومحركات الدولار والذهب، وتتضمن التداخل الذهبي مع لندن بين 12:00 و 16:00 UTC.',
    colorClass: 'emerald',
  },
];

// Major Global Market Holidays (2025 - 2027 Recurring)
export const GLOBAL_MARKET_HOLIDAYS: MarketHoliday[] = [
  {
    id: 'new-year',
    date: '2026-01-01',
    nameAr: 'عطلة رأس السنة الميلادية (New Year)',
    nameEn: "New Year's Day",
    impactedMarketsAr: 'كافة الأسواق العالمية (الفوركس، الذهب، الأسهم)',
    type: 'CLOSED',
    typeAr: 'إغلاق كامل للأسواق',
    advisoryAr: 'الأسواق مغلقة بالكامل في كافة البنوك المركزية حول العالم.',
  },
  {
    id: 'mlk-day',
    date: '2026-01-19',
    nameAr: 'يوم مارتن لوثر كينغ (أمريكا)',
    nameEn: 'Martin Luther King Jr. Day',
    impactedMarketsAr: 'الأسواق الأمريكية، الذهب، الفضة',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر للذهب والفضة',
    advisoryAr: 'إغلاق مبكر لأسواق المعادن والأسهم الأمريكية في تمام 18:00 UTC، سيولة ضعيفة مساءً.',
  },
  {
    id: 'presidents-day',
    date: '2026-02-16',
    nameAr: 'يوم الرؤساء الأمريكي',
    nameEn: "Presidents' Day",
    impactedMarketsAr: 'الأسواق الأمريكية والمعادن الثمينة',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر',
    advisoryAr: 'عطلة البنوك الأمريكية، إغلاق مبكر لعقود الذهب الفورية والسبريد قد يتسع.',
  },
  {
    id: 'good-friday',
    date: '2026-04-03',
    nameAr: 'الجمعة العظيمة (Good Friday)',
    nameEn: 'Good Friday',
    impactedMarketsAr: 'الأسواق العالمية كافة، الذهب، الفوركس',
    type: 'CLOSED',
    typeAr: 'إغلاق كامل للمعادن ومعظم أزواج العملات',
    advisoryAr: 'إغلاق شامل لأسواق السلع والمعادن والأسهم، وتوقف شبه كامل في تسعير البنوك.',
  },
  {
    id: 'easter-monday',
    date: '2026-04-06',
    nameAr: 'اثنين الفصح (Easter Monday)',
    nameEn: 'Easter Monday',
    impactedMarketsAr: 'المملكة المتحدة، منطقة اليورو، أستراليا',
    type: 'LOW_LIQUIDITY',
    typeAr: 'سيولة أوروبية منخفضة',
    advisoryAr: 'البنوك في بريطانيا وأوروبا مغلقة، التداولات هادئة في أزواج اليورو والباوند.',
  },
  {
    id: 'memorial-day',
    date: '2026-05-25',
    nameAr: 'يوم الذكرى الأمريكي (Memorial Day)',
    nameEn: 'Memorial Day',
    impactedMarketsAr: 'الأسواق الأمريكية، الذهب، السندات',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر',
    advisoryAr: 'إغلاق مبكر لعقود الذهب في تمام 17:00 UTC، جلسة نيويورك غير نشطة.',
  },
  {
    id: 'juneteenth',
    date: '2026-06-19',
    nameAr: 'عطلة جونتينث الأمريكية',
    nameEn: 'Juneteenth National Independence Day',
    impactedMarketsAr: 'الأسواق الأمريكية، الذهب',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر للمعادن',
    advisoryAr: 'عطلة رسمية للبنوك الأمريكية، تراجع السيولة خلال الفترة المسائية.',
  },
  {
    id: 'us-independence',
    date: '2026-07-04',
    nameAr: 'عيد الاستقلال الأمريكي (4th of July)',
    nameEn: 'US Independence Day',
    impactedMarketsAr: 'الولايات المتحدة الأمريكية، الذهب، الفضة',
    type: 'CLOSED',
    typeAr: 'إغلاق البنوك الأمريكية',
    advisoryAr: 'توقف تداولات جلسة نيويورك، حركة بطيئة في أسواق الفوركس.',
  },
  {
    id: 'labor-day',
    date: '2026-09-07',
    nameAr: 'عيد العمال الأمريكي (Labor Day)',
    nameEn: 'US Labor Day',
    impactedMarketsAr: 'الولايات المتحدة، كندا',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر وسيولة محدودة',
    advisoryAr: 'إغلاق أسواق المعادن مبكراً في تمام 17:00 UTC، عطلة لجميع البنوك الأمريكية.',
  },
  {
    id: 'thanksgiving',
    date: '2026-11-26',
    nameAr: 'عيد الشكر الأمريكي (Thanksgiving Day)',
    nameEn: 'Thanksgiving Day',
    impactedMarketsAr: 'كافة أسواق العملات والمعادن',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر وسيولة شحيحة',
    advisoryAr: 'أكبر عطلة بنكية في الولايات المتحدة، إغلاق مبكر للذهب والفضة، نوصي بعدم التداول.',
  },
  {
    id: 'black-friday',
    date: '2026-11-27',
    nameAr: 'الجمعة السوداء (Black Friday)',
    nameEn: 'Black Friday',
    impactedMarketsAr: 'الأسواق الأمريكية',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر عند 18:00 UTC',
    advisoryAr: 'إغلاق مبكر قبل عطلة نهاية الأسبوع، تجنب فتح صفقات جديدة مساء الجمعة.',
  },
  {
    id: 'christmas-eve',
    date: '2026-12-24',
    nameAr: 'عشية عيد الميلاد (Christmas Eve)',
    nameEn: 'Christmas Eve',
    impactedMarketsAr: 'كافة الأسواق العالمية',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر عند 18:00 UTC',
    advisoryAr: 'إغلاق مبكر لكافة البنوك، اتساع كبير في السبريد، تجنب التداول تماماً.',
  },
  {
    id: 'christmas',
    date: '2026-12-25',
    nameAr: 'عيد الميلاد المجيد (Christmas Day)',
    nameEn: 'Christmas Day',
    impactedMarketsAr: 'كافة الأسواق العالمية (الفوركس، الذهب)',
    type: 'CLOSED',
    typeAr: 'إغلاق كامل للأسواق',
    advisoryAr: 'الأسواق العالمية مغلقة بالكامل في كافة دول العالم.',
  },
  {
    id: 'boxing-day',
    date: '2026-12-26',
    nameAr: 'يوم الصناديق (Boxing Day)',
    nameEn: 'Boxing Day',
    impactedMarketsAr: 'المملكة المتحدة، كندا، أستراليا',
    type: 'LOW_LIQUIDITY',
    typeAr: 'سيولة بريطانية وأوروبية منخفضة',
    advisoryAr: 'عطلة رسمية في بريطانيا والكومنولث، سيولة متدنية وتذبذب ضعيف.',
  },
  {
    id: 'new-years-eve',
    date: '2026-12-31',
    nameAr: 'عشية رأس السنة الميلادية',
    nameEn: "New Year's Eve",
    impactedMarketsAr: 'كافة الأسواق العالمية',
    type: 'EARLY_CLOSE',
    typeAr: 'إغلاق مبكر وسيولة منعدمة',
    advisoryAr: 'إغلاق السجلات المحاسبية السنوية في البنوك الكبرى، تجنب حمل صفقات مفتوحة.',
  },
];

export interface MarketHoursStatus {
  now: Date;
  utcHours: number;
  utcMinutes: number;
  utcDay: number; // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  utcTimeFormatted: string;
  localTimeFormatted: string;
  
  // Weekend Logic
  isWeekend: boolean;
  weekendReasonAr: string;
  weekendOpensIn: string;
  weekendClosesIn: string;
  
  // Market Open overall
  isMarketOpen: boolean;
  
  // Holidays
  currentHoliday: MarketHoliday | null;
  upcomingHolidays: { holiday: MarketHoliday; daysUntil: number }[];
  
  // Sessions
  activeSessions: MarketSessionDetail[];
  isGoldenOverlap: boolean; // London & NY (12:00 - 16:00 UTC)
  nextSession: { session: MarketSessionDetail; opensIn: string };
  
  // Smart Notification message
  notification: {
    title: string;
    message: string;
    type: 'weekend' | 'holiday' | 'overlap' | 'open' | 'closing_soon';
    badgeText: string;
    badgeClass: string;
  };
}

/**
 * Check if a session is open given current hour in UTC
 */
export function isHourInSession(utcHourDec: number, openHour: number, closeHour: number): boolean {
  if (openHour < closeHour) {
    return utcHourDec >= openHour && utcHourDec < closeHour;
  }
  // Wraps midnight (e.g. 21 to 06)
  return utcHourDec >= openHour || utcHourDec < closeHour;
}

/**
 * Format minutes into X hours Y mins
 */
export function formatMinutesDiff(minutes: number): string {
  if (minutes <= 0) return '0د';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}د`;
  return `${h}س ${m}د`;
}

/**
 * Comprehensive Market Hours & Holiday Evaluator
 */
export function getMarketHoursStatus(customDate?: Date): MarketHoursStatus {
  const now = customDate || new Date();
  const utcDay = now.getUTCDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const currentUtcDec = utcHours + utcMinutes / 60;
  const currentTotalUtcMinutes = utcHours * 60 + utcMinutes;

  // 1. Weekend Calculation:
  // Forex Closes Friday at 21:00 UTC
  // Forex Opens Sunday at 21:00 UTC (with Sydney Open)
  let isWeekend = false;
  let weekendReasonAr = '';
  let weekendOpensIn = '';
  let weekendClosesIn = '';

  if (utcDay === 6) {
    // Saturday: Full weekend closure
    isWeekend = true;
    weekendReasonAr = 'عطلة نهاية الأسبوع الرسمية (السبت) - كافة أسواق الفوركس والمعادن مغلقة';
    // Time until Sunday 21:00 UTC
    // Saturday minutes remaining + Sunday 21 hours
    const minsLeftSaturday = 24 * 60 - currentTotalUtcMinutes;
    const minsSunday = 21 * 60;
    weekendOpensIn = formatMinutesDiff(minsLeftSaturday + minsSunday);
  } else if (utcDay === 0) {
    // Sunday: Closed until 21:00 UTC
    if (currentUtcDec < 21) {
      isWeekend = true;
      weekendReasonAr = 'عطلة نهاية الأسبوع (الأحد) - يفتتح السوق مع جلسة سيدني الساعة 21:00 UTC';
      const minsLeftSunday = 21 * 60 - currentTotalUtcMinutes;
      weekendOpensIn = formatMinutesDiff(minsLeftSunday);
    } else {
      // Sunday after 21:00 UTC: Market is officially OPEN (Sydney session started!)
      isWeekend = false;
    }
  } else if (utcDay === 5) {
    // Friday: Open until 21:00 UTC
    if (currentUtcDec >= 21) {
      isWeekend = true;
      weekendReasonAr = 'إغلاق نهاية الأسبوع (الجمعة) - أغلقت الأسواق رسمياً حتى مساء الأحد';
      // Mins left Friday + Saturday (24h) + Sunday (21h)
      const minsLeftFriday = 24 * 60 - currentTotalUtcMinutes;
      const minsWeekend = 24 * 60 + 21 * 60;
      weekendOpensIn = formatMinutesDiff(minsLeftFriday + minsWeekend);
    } else {
      isWeekend = false;
      const minsUntilFridayClose = 21 * 60 - currentTotalUtcMinutes;
      weekendClosesIn = formatMinutesDiff(minsUntilFridayClose);
    }
  } else {
    // Mon, Tue, Wed, Thu: Normal trading days
    isWeekend = false;
    // Calculate time until Friday 21:00 UTC
    const daysUntilFriday = (5 - utcDay);
    const minsUntilEndOfToday = 24 * 60 - currentTotalUtcMinutes;
    const fullDaysMins = Math.max(0, daysUntilFriday - 1) * 24 * 60;
    const fridayMins = 21 * 60;
    weekendClosesIn = formatMinutesDiff(minsUntilEndOfToday + fullDaysMins + fridayMins);
  }

  // 2. Check for Global Market Holidays
  const currentDateStr = now.toISOString().split('T')[0];
  const currentHoliday = GLOBAL_MARKET_HOLIDAYS.find((h) => h.date === currentDateStr) || null;

  // Upcoming holidays in next 60 days
  const nowTime = now.getTime();
  const upcomingHolidays = GLOBAL_MARKET_HOLIDAYS.map((h) => {
    const holidayTime = new Date(h.date + 'T00:00:00Z').getTime();
    const diffDays = Math.ceil((holidayTime - nowTime) / (1000 * 60 * 60 * 24));
    return { holiday: h, daysUntil: diffDays };
  })
    .filter((item) => item.daysUntil >= 0 && item.daysUntil <= 60)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // 3. Active Sessions Evaluation
  // If weekend or full market holiday, sessions are not active for new executions!
  const isHolidayFullClose = currentHoliday && currentHoliday.type === 'CLOSED';
  const isMarketOpen = !isWeekend && !isHolidayFullClose;

  const activeSessions: MarketSessionDetail[] = [];
  if (isMarketOpen) {
    for (const s of SESSIONS_LIST) {
      if (isHourInSession(currentUtcDec, s.openUtcHour, s.closeUtcHour)) {
        activeSessions.push(s);
      }
    }
  }

  // Check London-NY Golden Overlap (12:00 - 16:00 UTC on open days)
  const isGoldenOverlap = isMarketOpen && currentUtcDec >= 12 && currentUtcDec < 16;

  // Determine Next Session Opening
  let nextSessionDetail = SESSIONS_LIST[0];
  let minMinsToOpen = 999999;

  for (const s of SESSIONS_LIST) {
    const targetMins = s.openUtcHour * 60;
    let diff = targetMins - currentTotalUtcMinutes;
    if (diff <= 0) diff += 24 * 60;
    if (diff < minMinsToOpen) {
      minMinsToOpen = diff;
      nextSessionDetail = s;
    }
  }

  const nextSession = {
    session: nextSessionDetail,
    opensIn: formatMinutesDiff(minMinsToOpen),
  };

  // 4. Notification Formulation
  let notification: MarketHoursStatus['notification'] = {
    title: 'السوق مفتوح ونشط',
    message: 'تداول طبيعي متزامن مع سيولة البنوك العالمية.',
    type: 'open',
    badgeText: 'مفتوح',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };

  if (isWeekend) {
    notification = {
      title: 'إشعار عطلة نهاية الأسبوع (الأسواق مغلقة)',
      message: `الأسواق المالية في عطلة أسبوعية حالياً • تفتتح الأسواق يوم الأحد الساعة 21:00 UTC مع جلسة سيدني (متبقي: ${weekendOpensIn}). لا يُنصح بفتح صفقات لتفادي فجوات الأسعار (Gaps).`,
      type: 'weekend',
      badgeText: 'عطلة أسبوعية',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };
  } else if (currentHoliday) {
    notification = {
      title: `إشعار عطلة رسمية: ${currentHoliday.nameAr}`,
      message: `${currentHoliday.advisoryAr} (${currentHoliday.typeAr}) • التأثير: ${currentHoliday.impactedMarketsAr}`,
      type: 'holiday',
      badgeText: currentHoliday.typeAr,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  } else if (isGoldenOverlap) {
    notification = {
      title: 'فترة التداخل الذهبي (لندن + نيويورك ⚡)',
      message: 'ذروة السيولة العالمية وأعلى معدل حجم تداول للذهب والعملات (12:00 - 16:00 UTC). أسرع استجابة لأهداف جان ومربع التسعة.',
      type: 'overlap',
      badgeText: 'سيولة عظمى',
      badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    };
  } else if (utcDay === 5 && currentUtcDec >= 17) {
    notification = {
      title: 'تنبيه اقتراب إغلاق عطلة الأسبوع',
      message: `تغلق أسواق الفوركس والمعادن نهائياً اليوم الجمعة في تمام 21:00 UTC (متبقي: ${weekendClosesIn}). يُرجى الحذر وإغلاق الصفقات المعلقة لتجنب سبريد التبييت.`,
      type: 'closing_soon',
      badgeText: 'إغلاق وشيك',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  } else {
    const activeNames = activeSessions.map((s) => s.nameAr).join(' + ');
    notification = {
      title: `السوق مفتوح • ${activeNames || 'فترة استراحة بين الجلسات'}`,
      message: `الجلسة الحالية نشطة • العطلة الأسبوعية القادمة: الجمعة 21:00 UTC (متبقي: ${weekendClosesIn}) • الجلسة القادمة: ${nextSession.session.nameAr} بعد ${nextSession.opensIn}.`,
      type: 'open',
      badgeText: 'مفتوح',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }

  // Formatting strings
  const utcTimeFormatted = now.toLocaleTimeString('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const localTimeFormatted = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return {
    now,
    utcHours,
    utcMinutes,
    utcDay,
    utcTimeFormatted,
    localTimeFormatted,
    isWeekend,
    weekendReasonAr,
    weekendOpensIn,
    weekendClosesIn,
    isMarketOpen,
    currentHoliday,
    upcomingHolidays,
    activeSessions,
    isGoldenOverlap,
    nextSession,
    notification,
  };
}

/**
 * Convert UTC session hours into local browser string
 */
export function formatUtcToLocalHour(utcHour: number): string {
  const d = new Date();
  d.setUTCHours(utcHour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────
// Major Central Bank Decisions & High-Impact Economic Events
// ─────────────────────────────────────────────────────────────
export interface EconomicDecisionEvent {
  id: string;
  titleAr: string;
  titleEn: string;
  sourceAr: string;
  country: string;
  flag: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'ALL';
  impact: 'EXTREME' | 'HIGH';
  timeScheduleAr: string;
  affectedAssets: string[];
  guidanceAr: string;
  keyMetricsAr: string;
}

export const MAJOR_ECONOMIC_DECISIONS: EconomicDecisionEvent[] = [
  {
    id: 'fomc-rate-decision',
    titleAr: 'قرار الفائدة الفيدرالية الأمريكية ومؤتمر جيروم باول (FOMC)',
    titleEn: 'Federal Reserve FOMC Interest Rate Decision & Press Conference',
    sourceAr: 'البنك الاحتياطي الفيدرالي الأمريكي',
    country: 'الولايات المتحدة',
    flag: '🇺🇸',
    currency: 'USD',
    impact: 'EXTREME',
    timeScheduleAr: 'الأربعاء (كل 6 أسابيع) • 09:00 م بتوقيت مكة (18:00 UTC) والمؤتمر 09:30 م',
    affectedAssets: ['XAU/USD (الذهب)', 'EUR/USD', 'USD/JPY', 'مؤشر الدولار DXY'],
    guidanceAr: 'أقوى حدث محرك للأسواق عالمياً. يُنصح بعدم فتح عقود جديدة قبل المؤتمر بـ 30 دقيقة ونقل الوقف على الدخول (BE) للصفقات الرابحة.',
    keyMetricsAr: 'معدل الفائدة، بيان السياسة النقدية، المخطط النقطي Dot Plot، تلميحات التضخم والركود.',
  },
  {
    id: 'us-nfp-jobs',
    titleAr: 'تقرير الوظائف الأمريكية غير الزراعية ومعدل البطالة (US NFP)',
    titleEn: 'Non-Farm Payrolls (NFP) & Unemployment Rate',
    sourceAr: 'مكتب إحصاءات العمل الأمريكي (BLS)',
    country: 'الولايات المتحدة',
    flag: '🇺🇸',
    currency: 'USD',
    impact: 'EXTREME',
    timeScheduleAr: 'أول جمعة من كل شهر ميلادي • 03:30 م بتوقيت مكة (12:30 UTC)',
    affectedAssets: ['XAU/USD (الذهب)', 'EUR/USD', 'GBP/JPY', 'USD/JPY'],
    guidanceAr: 'تحدث حركة انفجارية خلال أول 15 دقيقة تفوق 80-150 نقطة في الذهب. تجنب الدخول العشوائي وانتظر حتى تهدأ الشموع وتتضح اتجاهات وايكوف.',
    keyMetricsAr: 'صافي الوظائف المضافة، معدل البطالة الرسمي، متوسط الأجور في الساعة (مقياس التضخم).',
  },
  {
    id: 'us-cpi-inflation',
    titleAr: 'مؤشر أسعار المستهلك الأمريكي والتضخم السنوي (US CPI)',
    titleEn: 'US Consumer Price Index (CPI) Inflation Report',
    sourceAr: 'مكتب إحصاءات العمل الأمريكي (BLS)',
    country: 'الولايات المتحدة',
    flag: '🇺🇸',
    currency: 'USD',
    impact: 'EXTREME',
    timeScheduleAr: 'منتصف كل شهر (شهرياً) • 03:30 م بتوقيت مكة (12:30 UTC)',
    affectedAssets: ['XAU/USD (الذهب)', 'EUR/USD', 'USD/JPY'],
    guidanceAr: 'المحرك الأول لقرارات الفائدة. صدور نتيجة أعلى من التوقعات تدعم الدولار وتضغط على الذهب، والعكس صحيح.',
    keyMetricsAr: 'معدل التضخم السنوي، التضخم الأساسي Core CPI المستثنى منه الغذاء والطاقة.',
  },
  {
    id: 'ecb-rate-decision',
    titleAr: 'قرار الفائدة للبنك المركزي الأوروبي ومؤتمر كريستين لاغارد (ECB)',
    titleEn: 'European Central Bank (ECB) Rate Decision & Press Conference',
    sourceAr: 'البنك المركزي الأوروبي',
    country: 'منطقة اليورو',
    flag: '🇪🇺',
    currency: 'EUR',
    impact: 'HIGH',
    timeScheduleAr: 'الخميس (كل 6 أسابيع) • 03:15 م بتوقيت مكة (12:15 UTC)',
    affectedAssets: ['EUR/USD', 'EUR/GBP', 'EUR/JPY'],
    guidanceAr: 'تقلبات حادة لليورو، ترقب تلميحات خفض أو رفع الفائدة وتوقعات النمو الاقتصادي لمنطقة اليورو.',
    keyMetricsAr: 'معدل الفائدة على الإيداع وإعادة التمويل، توقعات التضخم الأوروبية.',
  },
  {
    id: 'boe-rate-decision',
    titleAr: 'قرار الفائدة لبنك إنجلترا المركزي ومحضر السياسة النقدية (BOE)',
    titleEn: 'Bank of England (BOE) Official Bank Rate & Minutes',
    sourceAr: 'بنك إنجلترا المركزي',
    country: 'المملكة المتحدة',
    flag: '🇬🇧',
    currency: 'GBP',
    impact: 'HIGH',
    timeScheduleAr: 'الخميس (كل 6 أسابيع) • 02:00 م بتوقيت مكة (11:00 UTC)',
    affectedAssets: ['GBP/JPY', 'EUR/GBP', 'GBP/USD'],
    guidanceAr: 'زوج الباوند ين (المجنون) يتحرك بأكثر من 100-200 نقطة. يُرجى الالتزام الصارم بإدارة المخاطر واللوت الآمن.',
    keyMetricsAr: 'أصوات أعضاء لجنة السياسة النقدية (MPC Vote Split)، تقرير التضخم الفصلي.',
  },
  {
    id: 'boj-rate-decision',
    titleAr: 'قرار السياسة النقدية لبنك اليابان والتحكم في منحنى العائد (BOJ)',
    titleEn: 'Bank of Japan (BOJ) Monetary Policy & Yield Curve Control',
    sourceAr: 'بنك اليابان المركزي',
    country: 'اليابان',
    flag: '🇯🇵',
    currency: 'JPY',
    impact: 'EXTREME',
    timeScheduleAr: 'خلال الجلسة الآسيوية المبكرة (بين 05:00 ص و 07:00 ص بتوقيت مكة)',
    affectedAssets: ['USD/JPY', 'GBP/JPY', 'EUR/JPY'],
    guidanceAr: 'قرارات مفاجئة قد تحدث قفزات ضخمة في الين وتدخلات بنك اليابان لدعم الين. مراقبة مستويات 200 EMA عن كثب.',
    keyMetricsAr: 'تغيير الفائدة السلبية/الموجبة، مستويات شراء السندات وتدخلات سوق الصرف.',
  },
  {
    id: 'us-core-pce',
    titleAr: 'مؤشر أسعار نفقات الاستهلاك الشخصي الأمريكي (Core PCE)',
    titleEn: 'US Core PCE Price Index',
    sourceAr: 'مكتب التحليل الاقتصادي الأمريكي (BEA)',
    country: 'الولايات المتحدة',
    flag: '🇺🇸',
    currency: 'USD',
    impact: 'HIGH',
    timeScheduleAr: 'آخر جمعة من كل شهر • 03:30 م بتوقيت مكة (12:30 UTC)',
    affectedAssets: ['XAU/USD', 'EUR/USD', 'USD/JPY'],
    guidanceAr: 'المقياس المفضل والمباشر للفيدرالي الأمريكي لمراقبة التضخم الفعلي للمستهلكين.',
    keyMetricsAr: 'النسبة الشهرية والسنوية للتضخم الأساسي.',
  },
];

// ─────────────────────────────────────────────────────────────
// Telegram Formatting Helpers for Sessions & Market Timing
// ─────────────────────────────────────────────────────────────

/**
 * Format Market Session Opening or Closing Telegram message
 */
export function formatSessionAlertTelegram(
  session: MarketSessionDetail,
  eventType: 'OPEN' | 'CLOSE',
  forHtml = true
): string {
  const isOpen = eventType === 'OPEN';
  const meccaOpenHour = (session.openUtcHour + 3) % 24;
  const meccaCloseHour = (session.closeUtcHour + 3) % 24;
  const meccaOpenStr = `${String(meccaOpenHour).padStart(2, '0')}:00`;
  const meccaCloseStr = `${String(meccaCloseHour).padStart(2, '0')}:00`;

  if (isOpen) {
    if (forHtml) {
      return [
        `🏛️ <b>افتتاح جلسة ${session.city} المالية (${session.nameEn}) ${session.flag}</b>`,
        `─────────────────`,
        `⏰ <b>التوقيت:</b> <code>${meccaOpenStr}</code> بتوقيت مكة المكرمة (${String(session.openUtcHour).padStart(2, '0')}:00 UTC)`,
        `📊 <b>مستوى السيولة:</b> <b>${session.liquidity}</b> 🔥`,
        `🎯 <b>أهم الأصول النشطة:</b> ${session.bestSymbols.join(' | ')}`,
        `💡 <b>التوجيه المؤسسي:</b>`,
        `• ${session.descriptionAr}`,
        `• توافق تحركات وايكوف وكسر الهياكل السعرية المعتمدة لنظام Gann SOP.`,
      ].join('\n');
    }
    return [
      `🏛️ افتتاح جلسة ${session.city} المالية (${session.nameEn}) ${session.flag}`,
      `─────────────────`,
      `⏰ التوقيت: ${meccaOpenStr} بتوقيت مكة المكرمة (${String(session.openUtcHour).padStart(2, '0')}:00 UTC)`,
      `📊 مستوى السيولة: ${session.liquidity} 🔥`,
      `🎯 أهم الأصول النشطة: ${session.bestSymbols.join(' | ')}`,
      `💡 التوجيه المؤسسي:`,
      `• ${session.descriptionAr}`,
      `• توافق تحركات وايكوف وكسر الهياكل السعرية المعتمدة لنظام Gann SOP.`,
    ].join('\n');
  }

  // CLOSE
  if (forHtml) {
    return [
      `🏁 <b>إغلاق جلسة ${session.city} (${session.nameEn}) ${session.flag}</b>`,
      `─────────────────`,
      `⏰ <b>التوقيت:</b> <code>${meccaCloseStr}</code> بتوقيت مكة المكرمة (${String(session.closeUtcHour).padStart(2, '0')}:00 UTC)`,
      `📉 <b>حالة السوق:</b> انحسار تدريجي في تدفقات البنوك التابعة لـ ${session.city}`,
      `🔒 <b>نصيحة إدارة المخاطر:</b> تأمين الأرباح المتبقية والاعتماد على الوقف المتحرك لحماية رأس المال.`,
    ].join('\n');
  }
  return [
    `🏁 إغلاق جلسة ${session.city} (${session.nameEn}) ${session.flag}`,
    `─────────────────`,
    `⏰ التوقيت: ${meccaCloseStr} بتوقيت مكة المكرمة (${String(session.closeUtcHour).padStart(2, '0')}:00 UTC)`,
    `📉 حالة السوق: انحسار تدريجي في تدفقات البنوك التابعة لـ ${session.city}`,
    `🔒 نصيحة إدارة المخاطر: تأمين الأرباح المتبقية والاعتماد على الوقف المتحرك لحماية رأس المال.`,
  ].join('\n');
}

/**
 * Format Best Trading Windows (Kill Zones) Telegram message
 */
export function formatKillZoneTelegram(
  zoneType: 'LONDON_OPEN' | 'OVERLAP' | 'ROLLOVER',
  forHtml = true
): string {
  if (zoneType === 'OVERLAP') {
    if (forHtml) {
      return [
        `⚡ <b>بدء فترة التداول الذهبية (London - NY Overlap) 🔥</b>`,
        `─────────────────`,
        `⏰ <b>التوقيت:</b> <code>03:00 م - 07:00 م</code> بتوقيت مكة المكرمة (12:00 - 16:00 UTC)`,
        `🏆 <b>الميزة الاستراتيجية:</b>`,
        `• <b>أعلى ذروة سيولة يومية عالمية</b> (تمثل أكثر من 65% من حجم التداول العالمي للفوركس والمعادن).`,
        `• تداخل صناع السوق في لندن مع بنوك وول ستريت في نيويورك.`,
        `🎯 <b>أفضل الأصول تداولاً:</b> <b>الذهب XAU/USD</b> | <b>اليورو دولار EUR/USD</b> | <b>الباوند ين GBP/JPY</b>`,
        `🎯 <b>التوجيه الفني:</b> التوقيت الأمثل لتحقيق أهداف Quad Targets وكسر زوايا مربع التسعة 1x1.`,
      ].join('\n');
    }
    return [
      `⚡ بدء فترة التداول الذهبية (London - NY Overlap) 🔥`,
      `─────────────────`,
      `⏰ التوقيت: 03:00 م - 07:00 م بتوقيت مكة المكرمة (12:00 - 16:00 UTC)`,
      `🏆 الميزة الاستراتيجية:`,
      `• أعلى ذروة سيولة يومية عالمية (تمثل أكثر من 65% من حجم التداول العالمي للفوركس والمعادن).`,
      `• تداخل صناع السوق في لندن مع بنوك وول ستريت في نيويورك.`,
      `🎯 أفضل الأصول تداولاً: الذهب XAU/USD | اليورو دولار EUR/USD | الباوند ين GBP/JPY`,
      `🎯 التوجيه الفني: التوقيت الأمثل لتحقيق أهداف Quad Targets وكسر زوايا مربع التسعة 1x1.`,
    ].join('\n');
  }

  if (zoneType === 'LONDON_OPEN') {
    if (forHtml) {
      return [
        `⚡ <b>فترة كسر نطاق آسيا الصباحي (London Open Kill Zone) 🇬🇧</b>`,
        `─────────────────`,
        `⏰ <b>التوقيت:</b> <code>10:00 ص - 01:00 م</code> بتوقيت مكة المكرمة (07:00 - 10:00 UTC)`,
        `🎯 <b>أهم النماذج المتوقعة:</b> كسر السيولة الصباحية، وتكوين قاع أو قمة اليوم الحقيقي (Judas Swing).`,
        `📊 <b>الأزواج المفضلة:</b> <b>EUR/USD</b> | <b>GBP/JPY</b>`,
        `💡 <b>التوجيه الفني:</b> مراقبة تطابق 200 EMA واختبار مستويات زوايا جان لركوب الموجة الاتجاهية.`,
      ].join('\n');
    }
    return [
      `⚡ فترة كسر نطاق آسيا الصباحي (London Open Kill Zone) 🇬🇧`,
      `─────────────────`,
      `⏰ التوقيت: 10:00 ص - 01:00 م بتوقيت مكة المكرمة (07:00 - 10:00 UTC)`,
      `🎯 أهم النماذج المتوقعة: كسر السيولة الصباحية، وتكوين قاع أو قمة اليوم الحقيقي (Judas Swing).`,
      `📊 الأزواج المفضلة: EUR/USD | GBP/JPY`,
      `💡 التوجيه الفني: مراقبة تطابق 200 EMA واختبار مستويات زوايا جان لركوب الموجة الاتجاهية.`,
    ].join('\n');
  }

  // ROLLOVER / DEAD ZONE WARNING
  if (forHtml) {
    return [
      `⚠️ <b>تحذير فترة الركود وتدوير العقود اليومي (Daily Rollover Alert) 🌙</b>`,
      `─────────────────`,
      `⏰ <b>التوقيت:</b> <code>12:00 منتصف الليل - 01:00 ص</code> بتوقيت مكة المكرمة (21:00 - 22:00 UTC)`,
      `🛑 <b>مخاطر هذه الفترة:</b>`,
      `• اتساع فوارق الأسعار (Spread Spikes) بشكل مفاجئ لدى أغلب شركات الوساطة.`,
      `• انخفاض السيولة اللحظية بين إغلاق نيويورك وقبل انطلاق جلسة طوكيو الكاملة.`,
      `🛡️ <b>التوصية الصارمة:</b> تجنب فتح صفقات جديدة خلال هذه الساعة لتفادي الانزلاقات السعرية وعمولات السواب.`,
    ].join('\n');
  }
  return [
    `⚠️ تحذير فترة الركود وتدوير العقود اليومي (Daily Rollover Alert) 🌙`,
    `─────────────────`,
    `⏰ التوقيت: 12:00 منتصف الليل - 01:00 ص بتوقيت مكة المكرمة (21:00 - 22:00 UTC)`,
    `🛑 مخاطر هذه الفترة:`,
    `• اتساع فوارق الأسعار (Spread Spikes) بشكل مفاجئ لدى أغلب شركات الوساطة.`,
    `• انخفاض السيولة اللحظية بين إغلاق نيويورك وقبل انطلاق جلسة طوكيو الكاملة.`,
    `🛡️ التوصية الصارمة: تجنب فتح صفقات جديدة خلال هذه الساعة لتفادي الانزلاقات السعرية وعمولات السواب.`,
  ].join('\n');
}

/**
 * Format Weekend Market Close or Open Telegram message
 */
export function formatWeekendStatusTelegram(
  statusType: 'CLOSE_ALERT' | 'CLOSED_WEEKEND' | 'OPEN_ALERT',
  forHtml = true
): string {
  if (statusType === 'CLOSE_ALERT') {
    if (forHtml) {
      return [
        `🛑 <b>إغلاق السوق المالي الأسبوعي (Weekend Market Close) 🔒</b>`,
        `─────────────────`,
        `⏰ <b>التوقيت:</b> الجمعة <code>12:00 منتصف الليل</code> بتوقيت مكة المكرمة (21:00 UTC)`,
        `🏖️ <b>حالة السوق:</b> أغلقت أسواق الفوركس والمعادن والأسهم العالمية رسمياً حتى مساء الأحد.`,
        `💡 <b>قواعد إدارة رأس المال:</b>`,
        `• تم إيقاف توليد إشارات التداول آلياً لحماية الحساب من الفجوات السعرية (Weekend Gaps).`,
        `• يُنصح دائماً بعدم تبييت صفقات عالية المخاطرة خلال العطلة الأسبوعية.`,
        `🌴 <i>نتمنى لكم عطلة أسبوع سعيدة وموفقة!</i>`,
      ].join('\n');
    }
    return [
      `🛑 إغلاق السوق المالي الأسبوعي (Weekend Market Close) 🔒`,
      `─────────────────`,
      `⏰ التوقيت: الجمعة 12:00 منتصف الليل بتوقيت مكة المكرمة (21:00 UTC)`,
      `🏖️ حالة السوق: أغلقت أسواق الفوركس والمعادن والأسهم العالمية رسمياً حتى مساء الأحد.`,
      `💡 قواعد إدارة رأس المال:`,
      `• تم إيقاف توليد إشارات التداول آلياً لحماية الحساب من الفجوات السعرية (Weekend Gaps).`,
      `• يُنصح دائماً بعدم تبييت صفقات عالية المخاطرة خلال العطلة الأسبوعية.`,
      `🌴 نتمنى لكم عطلة أسبوع سعيدة وموفقة!`,
    ].join('\n');
  }

  // OPEN_ALERT
  if (forHtml) {
    return [
      `🟢 <b>افتتاح أسبوع التداول الجديد (Weekly Market Open) 🚀</b>`,
      `─────────────────`,
      `⏰ <b>التوقيت:</b> الأحد <code>12:00 منتصف الليل</code> بتوقيت مكة المكرمة (21:00 UTC)`,
      `📈 <b>بداية الجلسات:</b> افتتاح جلستي سيدني وطوكيو وتدفق السيولة الآسيوية تدريجياً.`,
      `🎯 <b>التوجيه الأسبوعي:</b>`,
      `• مراقبة أي فجوات سعرية (Gaps) نتجت عن الأخبار السياسية أو الاقتصادية خلال العطلة.`,
      `• تفعيل مصفوفة فحص جان ووايكوف للبحث عن أفضل الفرص ذات التوافق العالي (Score 4/5 و 5/5).`,
      `💼 <i>أسبوع تداول مليء بالأرباح والتوفيق للجميع!</i>`,
    ].join('\n');
  }
  return [
    `🟢 افتتاح أسبوع التداول الجديد (Weekly Market Open) 🚀`,
    `─────────────────`,
    `⏰ التوقيت: الأحد 12:00 منتصف الليل بتوقيت مكة المكرمة (21:00 UTC)`,
    `📈 بداية الجلسات: افتتاح جلستي سيدني وطوكيو وتدفق السيولة الآسيوية تدريجياً.`,
    `🎯 التوجيه الأسبوعي:`,
    `• مراقبة أي فجوات سعرية (Gaps) نتجت عن الأخبار السياسية أو الاقتصادية خلال العطلة.`,
    `• تفعيل مصفوفة فحص جان ووايكوف للبحث عن أفضل الفرص ذات التوافق العالي (Score 4/5 و 5/5).`,
    `💼 أسبوع تداول مليء بالأرباح والتوفيق للجميع!`,
  ].join('\n');
}

/**
 * Format High-Impact Economic Decision Alert Telegram message
 */
export function formatEconomicDecisionTelegram(
  event: EconomicDecisionEvent,
  forHtml = true
): string {
  if (forHtml) {
    return [
      `🚨 <b>تنبيه قرار اقتصادي عالي التأثير (High Impact Event) ${event.flag}</b>`,
      `─────────────────`,
      `📊 <b>الحدث:</b> <b>${event.titleAr}</b>`,
      `🏛️ <b>المصدر:</b> ${event.sourceAr} (${event.country})`,
      `⏰ <b>الموعد المعتاد:</b> <code>${event.timeScheduleAr}</code>`,
      `🎯 <b>الأصول الأكثر تأثراً:</b> ${event.affectedAssets.join(' | ')}`,
      `⚡ <b>مستوى الحذر:</b> <b>${event.impact === 'EXTREME' ? 'شديد الخطورة ⚠️' : 'عالي التأثير 🔥'}</b>`,
      `─────────────────`,
      `💡 <b>التوجيه الاحترازي:</b>`,
      `• ${event.guidanceAr}`,
      `• <b>أهم المؤشرات المراقبة:</b> ${event.keyMetricsAr}`,
    ].join('\n');
  }

  return [
    `🚨 تنبيه قرار اقتصادي عالي التأثير (High Impact Event) ${event.flag}`,
    `─────────────────`,
    `📊 الحدث: ${event.titleAr}`,
    `🏛️ المصدر: ${event.sourceAr} (${event.country})`,
    `⏰ الموعد المعتاد: ${event.timeScheduleAr}`,
    `🎯 الأصول الأكثر تأثراً: ${event.affectedAssets.join(' | ')}`,
    `⚡ مستوى الحذر: ${event.impact === 'EXTREME' ? 'شديد الخطورة ⚠️' : 'عالي التأثير 🔥'}`,
    `─────────────────`,
    `💡 التوجيه الاحترازي:`,
    `• ${event.guidanceAr}`,
    `• أهم المؤشرات المراقبة: ${event.keyMetricsAr}`,
  ].join('\n');
}

/**
 * Format Full Daily Market Brief (Sessions, Golden Windows & Calendar)
 */
export function formatDailyMarketBriefTelegram(forHtml = true): string {
  if (forHtml) {
    return [
      `🧭 <b>الدليل اليومي لجلسات السوق ومواعيد القرارات المهمة 📊</b>`,
      `─────────────────`,
      `🏛️ <b>مواقيت الجلسات المالية الرئيسية (بتوقيت مكة المكرمة):</b>`,
      `• 🇯🇵 <b>طوكيو (آسيا):</b> <code>03:00 ص - 12:00 م</code> (سيولة أزواج الين)`,
      `• 🇬🇧 <b>لندن (أوروبا):</b> <code>10:00 ص - 07:00 م</code> (انطلاق السيولة الكبرى)`,
      `• 🇺🇸 <b>نيويورك (أمريكا):</b> <code>03:00 م - 12:00 منتصف الليل</code> (الذهب ومحركات الدولار)`,
      ``,
      `🔥 <b>الفترة الذهبية للتداول (Kill Zone):</b>`,
      `• <code>03:00 م - 07:00 م</code> (تداخل لندن + نيويورك = 65% من سيولة السوق)`,
      ``,
      `⚠️ <b>أوقات الحذر الإلزامية:</b>`,
      `• <code>12:00 ص - 01:00 ص</code> (فترة الرول أوفر واتساع السبريد)`,
      `• أوقات صدور مؤتمرات الفيدرالي وبيانات التوظيف NFP والتضخم CPI`,
      `─────────────────`,
      `🛡️ <i>التزم بإدارة رأس المال (مخاطرة 1% فقط لكل صفقة).</i>`,
    ].join('\n');
  }

  return [
    `🧭 الدليل اليومي لجلسات السوق ومواعيد القرارات المهمة 📊`,
    `─────────────────`,
    `🏛️ مواقيت الجلسات المالية الرئيسية (بتوقيت مكة المكرمة):`,
    `• 🇯🇵 طوكيو (آسيا): 03:00 ص - 12:00 م (سيولة أزواج الين)`,
    `• 🇬🇧 لندن (أوروبا): 10:00 ص - 07:00 م (انطلاق السيولة الكبرى)`,
    `• 🇺🇸 نيويورك (أمريكا): 03:00 م - 12:00 منتصف الليل (الذهب ومحركات الدولار)`,
    ``,
    `🔥 الفترة الذهبية للتداول (Kill Zone):`,
    `• 03:00 م - 07:00 م (تداخل لندن + نيويورك = 65% من سيولة السوق)`,
    ``,
    `⚠️ أوقات الحذر الإلزامية:`,
    `• 12:00 ص - 01:00 ص (فترة الرول أوفر واتساع السبريد)`,
    `• أوقات صدور مؤتمرات الفيدرالي وبيانات التوظيف NFP والتضخم CPI`,
    `─────────────────`,
    `🛡️ التزم بإدارة رأس المال (مخاطرة 1% فقط لكل صفقة).`,
  ].join('\n');
}
