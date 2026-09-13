import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  Lock,
  Scale,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';

export const StrategyMatrixExplainer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-right gap-3 cursor-pointer p-1 rounded-xl transition-colors hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              دليل مصفوفة الاستراتيجية وقواعد التداول (SOP Gann V42)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              شرح بوابات الـ 5SOP، مربع التسعة، والتقسيم الرباعي للأهداف 1:2 R:R
            </p>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-5 pt-4 border-t border-slate-800 space-y-4 text-xs leading-relaxed text-slate-300">
          {/* Scalping Disabled Notice */}
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-300 block mb-0.5">
                نمط الاستراتيجية: تداول يومي متأني فقط (تم إلغاء السكالبينج بالكامل)
              </strong>
              <span className="text-slate-300 text-[11px]">
                تم تعطيل وإلغاء نمط السكالبينج (Scalping) بهدف تجنب ضوضاء الإطارات الدقيقة (M1)، السبريد المتذبذب، والانزلاقات السعرية. تعتمد الاستراتيجية حصرياً على فلتر الماكرو اليومي D1 EMA 50، وموجات H4 مع مربع التسعة لجان، وزخم M15، وكسر الهيكل M5 BOS، لتحقيق أعلى نسبة دقة ممكنة مع أهداف 1:2 R:R.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5 SOP Gates */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <h4 className="font-extrabold text-cyan-400 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                بوابات التأكيد النظيفة الـ 5 (5SOP Clean Filters)
              </h4>
              <p className="text-slate-400 text-[11px]">
                يشترط اكتمال 4 بوابات على الأقل (4/5) مع إلزامية اجتياز البوابة الأولى:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    <strong className="text-white">فلتر الاتجاه الكلي اليومي و200 EMA:</strong>
                    <span className="text-slate-400 mr-1">
                      إغلاق شمعة اليوم اليومية أعلى متوسط Daily EMA 50 للشراء (أو أسفله للبيع) +
                      تمركز السعر أعلى 200 EMA وميلان المسار ≥ 2 نقطة.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    <strong className="text-white">توافق مربع التسعة متعدد الدورات (Sq9):</strong>
                    <span className="text-slate-400 mr-1">
                      تطابق السعر اللحظي مع زوايا جان (45° إلى 720°) انطلاقاً من القمم والقيعان
                      المتأرجحة بنسبة تسامح لا تتجاوز 15%.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    <strong className="text-white">مقياس زاوية 1x1 والدورات التوافقية:</strong>
                    <span className="text-slate-400 mr-1">
                      متابعة ميلان خط زاوية 1x1 التكيفي (ATR / 48) وتوافق الشموع المنقضية مع عقد دورة
                      جان (144 و 90 و 49 و 35 و 21 شمعة).
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    4
                  </span>
                  <div>
                    <strong className="text-white">فلتر زخم RSI النظيف:</strong>
                    <span className="text-slate-400 mr-1">
                      التأكد من تواجد مؤشر RSI 14 ضمن مناطق القوة النظيفة (الشراء: 32-58، البيع:
                      42-68 للتداول اليومي).
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    5
                  </span>
                  <div>
                    <strong className="text-white">تأكيد السلوك السعري، الفوليوم وMicro BOS:</strong>
                    <span className="text-slate-400 mr-1">
                      طفرة في حجم التداول (Volume Surge x1.15) + ذيل رفض شمعة ≥ 20% + كسر هيكل السوق
                      المصغر.
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Exit & Quad Target Structuring */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <h4 className="font-extrabold text-emerald-400 text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                محرك الأهداف الرباعية وإدارة المخاطر (1:2 R:R)
              </h4>
              <p className="text-slate-400 text-[11px]">
                توزيع الخروج على 4 مراحل محكمة لتأمين الأرباح:
              </p>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-cyan-300 block mb-0.5">🔹 الهدف الأول TP1 (0.5 R):</strong>
                  <span className="text-slate-400">
                    جني 25% من العقد + نقل وقف الخسارة فوراً إلى سعر الدخول (Break-Even + هامش أمان)
                    لتصبح الصفقة خالية من المخاطر تماماً.
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-cyan-300 block mb-0.5">🔹 الهدف الثاني TP2 (1.0 R):</strong>
                  <span className="text-slate-400">
                    جني 25% إضافية + قفل وقف الخسارة في الأرباح عند مستوى +0.5 R.
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-cyan-300 block mb-0.5">🔹 الهدف الثالث TP3 (1.5 R):</strong>
                  <span className="text-slate-400">
                    جني 25% إضافية (تأمين 75% من إجمالي الصفقة) وتفعيل ملاحقة الوقف المتحرك
                    (Trailing Stop) بالعقد المتبقي.
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/30">
                  <strong className="text-emerald-300 block mb-0.5">🔹 الهدف الرابع TP4 (2.0 R):</strong>
                  <span className="text-slate-400">
                    الهدف النهائي الصلب بنسبة عائد إلى مخاطرة 1:2 R:R.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
