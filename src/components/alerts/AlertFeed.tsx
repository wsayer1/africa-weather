import { useRef, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import type { Alert } from '../../types';
import { AlertItem } from './AlertItem';

interface AlertFeedProps {
  alerts: Alert[];
  isLoading?: boolean;
}

export function AlertFeed({ alerts, isLoading }: AlertFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [alerts.length]);

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <aside className="w-80 bg-control-dark border-l border-control-border flex flex-col">
      <div className="p-4 border-b border-control-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-alert-warning" />
            <h2 className="text-sm font-semibold text-white">Real-time Alerts</h2>
          </div>
          {isLoading && (
            <Loader2 size={14} className="text-blue-400 animate-spin" />
          )}
          {!isLoading && alerts.length > 0 && (
            <span className="text-xs text-control-muted">
              {alerts.length} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-alert-critical animate-pulse" />
            <span className="text-xs text-slate-400">{criticalCount} critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-alert-warning" />
            <span className="text-xs text-slate-400">{warningCount} warnings</span>
          </div>
        </div>
      </div>

      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2"
      >
        {isLoading && alerts.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-control-surface/50 rounded-lg p-3">
                  <div className="h-3 bg-control-surface rounded w-3/4 mb-2" />
                  <div className="h-2 bg-control-surface rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} isNew={false} />
        ))}

        {!isLoading && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-control-muted">
            <Bell size={24} className="mb-2 opacity-50" />
            <span className="text-sm">No alerts</span>
          </div>
        )}
      </div>
    </aside>
  );
}
