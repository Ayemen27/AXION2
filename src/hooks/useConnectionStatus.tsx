/**
 * Hook لمراقبة حالة الاتصال بالإنترنت
 */

import { useState, useEffect } from 'react';

interface ConnectionStatus {
  isOnline: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
  });

  useEffect(() => {
    const updateConnectionStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      setStatus({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null,
        saveData: connection?.saveData || false,
      });
    };

    const handleOnline = () => {
      updateConnectionStatus();
      // إطلاق حدث مخصص للمزامنة
      window.dispatchEvent(new CustomEvent('app-online'));
    };

    const handleOffline = () => {
      updateConnectionStatus();
      window.dispatchEvent(new CustomEvent('app-offline'));
    };

    // الاستماع لتغيرات الاتصال
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // الاستماع لتغيرات جودة الاتصال
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateConnectionStatus);
    }

    // التحديث الأولي
    updateConnectionStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateConnectionStatus);
      }
    };
  }, []);

  return status;
}
