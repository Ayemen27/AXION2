/**
 * Connection Indicator - مؤشر حالة الاتصال
 */

import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ConnectionIndicator() {
  const { isOnline, effectiveType, downlink, rtt } = useConnectionStatus();

  // تحديد جودة الاتصال
  const getConnectionQuality = () => {
    if (!isOnline) return { label: 'غير متصل', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (effectiveType === '4g' || (downlink && downlink > 5)) {
      return { label: 'ممتاز', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    }
    if (effectiveType === '3g' || (downlink && downlink > 1)) {
      return { label: 'جيد', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    }
    return { label: 'بطيء', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  };

  const quality = getConnectionQuality();

  return (
    <div className="flex items-center gap-2">
      <Badge className={`text-[10px] border-0 ${quality.color} flex items-center gap-1.5`}>
        {isOnline ? (
          effectiveType === '4g' || (downlink && downlink > 5) ? (
            <Wifi className="size-3" />
          ) : (
            <Activity className="size-3" />
          )
        ) : (
          <WifiOff className="size-3" />
        )}
        {quality.label}
      </Badge>

      {isOnline && (effectiveType || downlink) && (
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
          {effectiveType && (
            <span className="uppercase font-medium">{effectiveType}</span>
          )}
          {downlink && (
            <span>• {downlink.toFixed(1)} Mbps</span>
          )}
          {rtt && (
            <span>• {rtt}ms</span>
          )}
        </div>
      )}
    </div>
  );
}
