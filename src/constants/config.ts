/**
 * AXION Configuration — إعدادات النظام الثابتة
 * جميع البيانات الديناميكية (أنواع المشاريع/العمال/المصروفات) تُخزَّن في قاعدة البيانات
 */

// ══════════════════════════════════════════════════════════════════
// Date & Currency Formatting
// ══════════════════════════════════════════════════════════════════

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-YE', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ر.ي';
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-YE', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

// ══════════════════════════════════════════════════════════════════
// System Constants
// ══════════════════════════════════════════════════════════════════

export const APP_NAME = 'AXION Real Assets';
export const APP_VERSION = '3.0.0';
export const API_TIMEOUT = 30000; // 30 seconds
export const ITEMS_PER_PAGE = 20;

// App configuration object (for compatibility)
export const APP_CONFIG = {
  name: APP_NAME,
  version: APP_VERSION,
} as const;

// ══════════════════════════════════════════════════════════════════
// Status Options (UI-level constants)
// ══════════════════════════════════════════════════════════════════

export const PROJECT_STATUSES = [
  { value: 'active', label: 'نشط', color: 'emerald' },
  { value: 'pending', label: 'قيد الانتظار', color: 'amber' },
  { value: 'completed', label: 'مكتمل', color: 'blue' },
  { value: 'suspended', label: 'معلق', color: 'gray' },
] as const;

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'حاضر', color: 'emerald' },
  { value: 'absent', label: 'غائب', color: 'red' },
  { value: 'half', label: 'نصف يوم', color: 'amber' },
  { value: 'overtime', label: 'إضافي', color: 'blue' },
] as const;

export const TRANSFER_METHODS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank', label: 'تحويل بنكي' },
  { value: 'mobile', label: 'محفظة إلكترونية' },
] as const;

export const NOTIFICATION_TYPES = [
  { value: 'system', label: 'نظام', icon: '🔔' },
  { value: 'project', label: 'مشروع', icon: '🏗️' },
  { value: 'worker', label: 'عامل', icon: '👷' },
  { value: 'expense', label: 'مصروف', icon: '💰' },
  { value: 'approval', label: 'موافقة', icon: '✅' },
] as const;

// Legacy status map (deprecated - use PROJECT_STATUSES)
export const STATUS_MAP = {
  active: { label: 'نشط', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'مكتمل', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  suspended: { label: 'معلق', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
} as const;
