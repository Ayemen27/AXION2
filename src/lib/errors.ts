/**
 * AXION — مترجم أخطاء عربي شامل
 * يحوّل رسائل الخطأ الإنجليزية (Supabase / PostgreSQL / Auth) إلى عربية واضحة
 */

// ── جدول أسماء الجداول بالعربية ──────────────────────────────────────────────
const TABLE_NAMES: Record<string, string> = {
  workers:              'العمال',
  projects:             'المشاريع',
  daily_expenses:       'المصروفات',
  expenses:             'المصروفات',
  attendance_records:   'سجلات الحضور',
  material_purchases:   'مشتريات المواد',
  worker_transfers:     'تحويلات العمال',
  worker_misc_expenses: 'مصاريف متنوعة',
  wells:                'الآبار',
  equipment:            'المعدات',
  customers:            'الزبائن',
  suppliers:            'الموردين',
  supplier_payments:    'مدفوعات الموردين',
  fund_custody:         'العهد',
  notifications:        'الإشعارات',
  user_profiles:        'ملفات المستخدمين',
  project_permissions:  'صلاحيات المشاريع',
};

// ── قواميس الترجمة (المطابقة الجزئية — بالترتيب من الأكثر خصوصية للأعم) ──────
const ERROR_MAP: Array<{ pattern: RegExp | string; message: string | ((m: RegExpMatchArray) => string) }> = [

  // ─── RLS / صلاحيات ────────────────────────────────────────────────────────
  {
    pattern: /new row violates row-level security policy for table "?(\w+)"?/i,
    message: (m) => {
      const table = TABLE_NAMES[m[1]] ?? m[1];
      return `ليس لديك صلاحية إضافة بيانات في ${table}. تأكد من اختيار مشروع تملكه أو تملك إذن الكتابة فيه.`;
    },
  },
  {
    pattern: /row-level security policy.*table "?(\w+)"?/i,
    message: (m) => {
      const table = TABLE_NAMES[m[1]] ?? m[1];
      return `لا تملك الصلاحية الكافية للوصول إلى ${table}.`;
    },
  },
  {
    pattern: /violates row-level security/i,
    message: () => 'لا تملك الصلاحية الكافية لتنفيذ هذه العملية. تواصل مع مسؤول النظام.',
  },
  {
    pattern: /insufficient_privilege|permission denied/i,
    message: () => 'تم رفض العملية — صلاحياتك غير كافية لتنفيذ هذا الإجراء.',
  },

  // ─── تكرار البيانات ────────────────────────────────────────────────────────
  {
    pattern: /duplicate key value violates unique constraint/i,
    message: () => 'هذه البيانات مسجّلة مسبقاً. لا يمكن تكرار قيمة فريدة.',
  },
  {
    pattern: /unique constraint/i,
    message: () => 'البيانات المُدخلة مكررة — يرجى التحقق وإدخال قيمة مختلفة.',
  },

  // ─── مراجع خارجية ─────────────────────────────────────────────────────────
  {
    pattern: /violates foreign key constraint/i,
    message: () => 'البيانات المرتبطة غير موجودة. تأكد من صحة القيم المدخلة.',
  },
  {
    pattern: /insert or update on table.*violates foreign key/i,
    message: () => 'لا يمكن حفظ البيانات — عنصر مرتبط غير موجود في النظام.',
  },
  {
    pattern: /update or delete.*violates foreign key/i,
    message: () => 'لا يمكن حذف هذا العنصر لأنه مرتبط ببيانات أخرى في النظام.',
  },

  // ─── حقول مطلوبة / null ────────────────────────────────────────────────────
  {
    pattern: /null value in column "?(\w+)"? of relation/i,
    message: (m) => `حقل "${m[1]}" مطلوب ولا يمكن تركه فارغاً.`,
  },
  {
    pattern: /not-null constraint/i,
    message: () => 'يوجد حقل مطلوب لم يتم تعبئته. يرجى مراجعة البيانات المُدخلة.',
  },

  // ─── نوع البيانات ──────────────────────────────────────────────────────────
  {
    pattern: /invalid input syntax for type/i,
    message: () => 'صيغة البيانات المُدخلة غير صحيحة. تأكد من إدخال القيم بالشكل الصحيح.',
  },
  {
    pattern: /value too long for type character/i,
    message: () => 'النص المُدخل طويل جداً. يرجى تقليص المحتوى.',
  },
  {
    pattern: /numeric field overflow/i,
    message: () => 'القيمة الرقمية المُدخلة كبيرة جداً أو خارج النطاق المسموح.',
  },
  {
    pattern: /integer out of range/i,
    message: () => 'القيمة الرقمية خارج النطاق المسموح به.',
  },

  // ─── مشاكل الاتصال ────────────────────────────────────────────────────────
  {
    pattern: /network|fetch|connection|timeout|ECONNREFUSED/i,
    message: () => 'تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.',
  },
  {
    pattern: /failed to fetch/i,
    message: () => 'فشل الاتصال بالخادم. تحقق من الإنترنت أو حاول لاحقاً.',
  },

  // ─── أخطاء المصادقة ───────────────────────────────────────────────────────
  {
    pattern: /invalid login credentials/i,
    message: () => 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  },
  {
    pattern: /email not confirmed/i,
    message: () => 'يرجى تأكيد بريدك الإلكتروني أولاً قبل تسجيل الدخول.',
  },
  {
    pattern: /user already registered/i,
    message: () => 'هذا البريد الإلكتروني مسجّل مسبقاً. جرّب تسجيل الدخول.',
  },
  {
    pattern: /token.*expired|expired.*token/i,
    message: () => 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
  },
  {
    pattern: /token has expired or is invalid/i,
    message: () => 'رمز التحقق غير صحيح أو منتهي الصلاحية. يرجى طلب رمز جديد.',
  },
  {
    pattern: /jwt expired/i,
    message: () => 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.',
  },
  {
    pattern: /invalid jwt/i,
    message: () => 'جلسة غير صالحة. يرجى تسجيل الدخول مجدداً.',
  },
  {
    pattern: /email.*rate limit|rate.*limit/i,
    message: () => 'تجاوزت الحد المسموح من المحاولات. انتظر بضع دقائق ثم أعد المحاولة.',
  },
  {
    pattern: /password.*short|password.*weak/i,
    message: () => 'كلمة المرور قصيرة جداً. يجب أن تكون 6 أحرف على الأقل.',
  },
  {
    pattern: /signup.*disabled|signups.*disabled/i,
    message: () => 'التسجيل معطّل حالياً. تواصل مع مسؤول النظام.',
  },
  {
    pattern: /user not found/i,
    message: () => 'المستخدم غير موجود.',
  },

  // ─── أخطاء HTTP ───────────────────────────────────────────────────────────
  {
    pattern: /\b403\b/,
    message: () => 'ليس لديك صلاحية الوصول لهذا المورد.',
  },
  {
    pattern: /\b401\b/,
    message: () => 'يجب تسجيل الدخول أولاً للوصول لهذه الصفحة.',
  },
  {
    pattern: /\b404\b/,
    message: () => 'لم يُعثر على البيانات المطلوبة.',
  },
  {
    pattern: /\b409\b/,
    message: () => 'تعارض في البيانات — العنصر موجود مسبقاً.',
  },
  {
    pattern: /\b500\b/,
    message: () => 'خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.',
  },
  {
    pattern: /\b503\b/,
    message: () => 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.',
  },

  // ─── Supabase / PostgREST ─────────────────────────────────────────────────
  {
    pattern: /no rows returned/i,
    message: () => 'لم يُعثر على نتائج مطابقة.',
  },
  {
    pattern: /multiple.*rows returned/i,
    message: () => 'تعذّر تحديد نتيجة واحدة — يوجد أكثر من سجل مطابق.',
  },
  {
    pattern: /relation.*does not exist/i,
    message: () => 'الجدول المطلوب غير موجود. تواصل مع مسؤول النظام.',
  },
  {
    pattern: /column.*does not exist/i,
    message: () => 'حقل البيانات المطلوب غير موجود. تواصل مع مسؤول النظام.',
  },
  {
    pattern: /function.*does not exist/i,
    message: () => 'وظيفة النظام المطلوبة غير موجودة. تواصل مع مسؤول النظام.',
  },
  {
    pattern: /infinite recursion/i,
    message: () => 'خطأ في إعداد صلاحيات قاعدة البيانات. تواصل مع مسؤول النظام.',
  },
  {
    pattern: /statement timeout/i,
    message: () => 'استغرق الاستعلام وقتاً طويلاً. حاول تقليص نطاق البحث.',
  },
  {
    pattern: /payload too large|body too large/i,
    message: () => 'حجم البيانات المُرسلة كبير جداً.',
  },
];

/**
 * يحوّل رسالة خطأ إنجليزية إلى عربية واضحة
 * @param error - الخطأ الوارد من Supabase أو أي مصدر آخر
 * @returns رسالة خطأ عربية مناسبة
 */
export function translateError(error: unknown): string {
  if (!error) return 'حدث خطأ غير معروف.';

  // نص مباشر
  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (typeof error === 'object') {
    const e = error as Record<string, unknown>;
    // Supabase PostgrestError / AuthError
    msg = (e.message as string) || (e.error_description as string) || (e.error as string) || '';
    // تفاصيل إضافية من PostgreSQL
    if (e.details && typeof e.details === 'string') msg = e.details + ' ' + msg;
    if (e.hint   && typeof e.hint   === 'string') msg = msg + ' ' + e.hint;
  }

  if (!msg) return 'حدث خطأ غير معروف. يرجى المحاولة مجدداً.';

  // ابحث في القاموس
  for (const { pattern, message } of ERROR_MAP) {
    if (pattern instanceof RegExp) {
      const match = msg.match(pattern);
      if (match) {
        return typeof message === 'function' ? message(match) : message;
      }
    } else if (msg.toLowerCase().includes((pattern as string).toLowerCase())) {
      return typeof message === 'function' ? message([] as any) : message;
    }
  }

  // رسالة افتراضية — لا تعرض النص الإنجليزي الخام
  console.warn('[AXION] Untranslated error:', msg);
  return 'حدث خطأ في العملية. يرجى المحاولة مجدداً أو التواصل مع مسؤول النظام.';
}
