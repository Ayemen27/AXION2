import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
}

export function PullToRefreshIndicator({ pullDistance, isRefreshing, progress }: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-all"
      style={{
        transform: `translateY(${Math.min(pullDistance, 80)}px)`,
        opacity: Math.min(pullDistance / 60, 1),
      }}
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full p-3 shadow-lg">
        {isRefreshing ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <RefreshCw
            className="size-5 text-primary transition-transform"
            style={{
              transform: `rotate(${progress * 3.6}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
