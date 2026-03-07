/**
 * AXION — نظام إشعارات المسؤول
 * يُرسل إشعارات داخلية لجميع المسؤولين عند حدوث عمليات مهمة
 */

import { supabase } from '@/lib/supabase';

export interface AdminNotifyPayload {
  title: string;         // عنوان قصير
  body: string;          // تفاصيل العملية
  type?: string;         // نوع الإشعار (system افتراضي)
  link?: string;         // رابط الصفحة المرتبطة
  userName?: string;     // اسم المستخدم الذي قام بالعملية
  projectName?: string;  // اسم المشروع المرتبط
  recordDate?: string;   // تاريخ السجل الأصلي
  operationTime?: string;// وقت العملية
}

/**
 * يجلب معرّفات جميع المسؤولين ويرسل إشعاراً لكلٍّ منهم
 */
export async function notifyAdmins(payload: AdminNotifyPayload): Promise<void> {
  try {
    // 1. جلب معرّفات المسؤولين
    const { data: admins, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (error || !admins || admins.length === 0) return;

    // 2. بناء صفوف الإشعارات مع التفاصيل الإضافية
    const enrichedBody = [
      payload.body,
      payload.userName ? `· بواسطة المستخدم: ${payload.userName}` : '',
      payload.projectName ? `· من المشروع: ${payload.projectName}` : '',
      payload.recordDate ? `· بتاريخ: ${payload.recordDate}` : '',
      payload.operationTime ? `· الساعة: ${payload.operationTime}` : '',
    ].filter(Boolean).join(' ');

    const rows = admins.map(admin => ({
      user_id: admin.id,
      title:   payload.title,
      body:    enrichedBody,
      type:    payload.type ?? 'system',
      link:    payload.link ?? null,
      is_read: false,
    }));

    // 3. إدراج بشكل مجمّع (fire-and-forget)
    await supabase.from('notifications').insert(rows);
  } catch (e) {
    // إشعارات غير حرجة — لا نُظهر خطأ للمستخدم
    console.warn('[notifyAdmins] failed silently:', e);
  }
}

// ── صياغة رسائل الإشعارات ────────────────────────────────────────────────────

export const adminMsgs = {
  // عهد
  custodyAdded: (amount: string, sender: string, project: string, userName?: string, date?: string) => ({
    title: 'تم إضافة عهدة جديدة 💰',
    body:  `تم إضافة عهدة بقيمة ${amount} من ${sender}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  custodyDeleted: (amount: string, project: string, userName?: string, date?: string) => ({
    title: 'تم حذف عهدة 🗑️',
    body:  `تم حذف عهدة بقيمة ${amount}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),

  // مصروفات النقل
  expenseAdded: (desc: string, amount: string, project: string, userName?: string, date?: string) => ({
    title: 'تم إضافة مصروف جديد 🚚',
    body:  `${desc} بقيمة ${amount}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  expenseDeleted: (desc: string, amount: string, project: string, userName?: string, date?: string) => ({
    title: 'تم حذف مصروف 🗑️',
    body:  `${desc} بقيمة ${amount}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),

  // مشتريات
  purchaseAdded: (material: string, amount: string, supplier: string, project: string, userName?: string, date?: string) => ({
    title: 'تم إضافة مشتريات جديدة 📦',
    body:  `${material} بقيمة ${amount} من ${supplier}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  purchaseDeleted: (material: string, supplier: string, project: string, userName?: string, date?: string) => ({
    title: 'تم حذف مشتريات 🗑️',
    body:  `${material} من ${supplier}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),

  // حوالات عمال
  transferAdded: (worker: string, recipient: string, amount: string, project: string, userName?: string, date?: string) => ({
    title: 'تم إضافة حوالة عامل 💸',
    body:  `حوالة من ${worker} إلى ${recipient} بقيمة ${amount}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  transferDeleted: (worker: string, amount: string, project: string, userName?: string, date?: string) => ({
    title: 'تم حذف حوالة 🗑️',
    body:  `حوالة ${worker} بقيمة ${amount}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),

  // نثريات
  miscAdded: (desc: string, amount: string, project: string, userName?: string, date?: string) => ({
    title: 'تم إضافة نثريات جديدة 🧾',
    body:  `${desc} بقيمة ${amount}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  miscDeleted: (desc: string, project: string, userName?: string, date?: string) => ({
    title: 'تم حذف نثريات 🗑️',
    body:  `${desc}`,
    link:  '/expenses',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),

  // أجور حضور
  attendanceAdded: (worker: string, status: string, amount: string, project: string, userName?: string, date?: string) => ({
    title: 'تم إضافة سجل حضور 👷',
    body:  `العامل ${worker} - ${status} بقيمة ${amount}`,
    link:  '/attendance',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  attendanceDeleted: (worker: string, project: string, userName?: string, date?: string) => ({
    title: 'تم حذف سجل حضور 📋',
    body:  `تم حذف سجل حضور للعامل: ${worker}`,
    link:  '/attendance',
    userName,
    projectName: project,
    recordDate: date,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),

  // عمال
  workerAdded: (name: string, type: string, project: string, userName?: string) => ({
    title: 'تم إضافة عامل جديد 👤',
    body:  `${name} - ${type}`,
    link:  '/workers',
    userName,
    projectName: project,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  workerDeleted: (name: string, project: string, userName?: string) => ({
    title: 'تم حذف عامل 🗑️',
    body:  `${name}`,
    link:  '/workers',
    userName,
    projectName: project,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),

  // مشاريع
  projectAdded: (name: string, userName?: string) => ({
    title: 'تم إضافة مشروع جديد 🏗️',
    body:  `${name}`,
    link:  '/projects',
    userName,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
  projectDeleted: (name: string, userName?: string) => ({
    title: 'تم حذف مشروع 🗑️',
    body:  `${name}`,
    link:  '/projects',
    userName,
    operationTime: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
  }),
};
