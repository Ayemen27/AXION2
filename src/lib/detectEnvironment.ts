/**
 * Environment Detection Utilities
 * كشف البيئة: OnSpace Cloud vs External VPS
 */

/**
 * فحص ما إذا كان التطبيق يعمل على OnSpace Cloud
 * OnSpace Cloud يستخدم نطاق *.backend.onspace.ai
 */
export function isOnSpaceCloud(): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  return supabaseUrl.includes('.backend.onspace.ai') || supabaseUrl.includes('.onspace.build');
}

/**
 * فحص ما إذا كان التطبيق يعمل في بيئة تطوير محلية
 */
export function isLocalDevelopment(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

/**
 * فحص ما إذا كان التطبيق يعمل على سيرفر خارجي (VPS)
 */
export function isExternalVPS(): boolean {
  return !isOnSpaceCloud() && !isLocalDevelopment();
}

/**
 * الحصول على نوع البيئة كنص
 */
export function getEnvironmentType(): 'onspace' | 'vps' | 'local' {
  if (isOnSpaceCloud()) return 'onspace';
  if (isExternalVPS()) return 'vps';
  return 'local';
}

/**
 * فحص ما إذا كانت البيئة تحتاج لنظام تحقق بريد مخصص
 * OnSpace Cloud لديه نظام تحقق مدمج، لكن VPS يحتاج نظام خارجي
 */
export function needsCustomEmailVerification(): boolean {
  // يمكن تخصيص هذا عبر متغير بيئة
  const forceCustom = import.meta.env.VITE_CUSTOM_EMAIL_VERIFICATION === 'true';
  if (forceCustom) return true;
  
  // افتراضياً: VPS يحتاج نظام مخصص
  return isExternalVPS();
}

/**
 * معلومات البيئة كاملة
 */
export interface EnvironmentInfo {
  type: 'onspace' | 'vps' | 'local';
  isOnSpaceCloud: boolean;
  isExternalVPS: boolean;
  isLocalDevelopment: boolean;
  needsCustomEmailVerification: boolean;
  supabaseUrl: string;
  appUrl: string;
}

export function getEnvironmentInfo(): EnvironmentInfo {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const appUrl = window.location.origin;
  
  return {
    type: getEnvironmentType(),
    isOnSpaceCloud: isOnSpaceCloud(),
    isExternalVPS: isExternalVPS(),
    isLocalDevelopment: isLocalDevelopment(),
    needsCustomEmailVerification: needsCustomEmailVerification(),
    supabaseUrl,
    appUrl,
  };
}
