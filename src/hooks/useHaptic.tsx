/**
 * Haptic Feedback Hook
 * يوفر ردود فعل اهتزازية للتفاعلات على الأجهزة المحمولة
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const HAPTIC_PATTERNS = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
  selection: [5],
};

export function useHaptic() {
  const vibrate = (type: HapticType = 'light') => {
    if (!('vibrate' in navigator)) return;

    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic feedback not supported:', error);
    }
  };

  const impact = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    vibrate(intensity);
  };

  const notification = (type: 'success' | 'warning' | 'error' = 'success') => {
    vibrate(type);
  };

  const selection = () => {
    vibrate('selection');
  };

  return {
    vibrate,
    impact,
    notification,
    selection,
  };
}
