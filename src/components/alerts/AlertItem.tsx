import { AlertTriangle, AlertCircle, Info, Shield, Cloud, Truck, Crosshair } from 'lucide-react';
import type { Alert } from '../../types';

interface AlertItemProps {
  alert: Alert;
  isNew?: boolean;
}

const severityStyles: Record<Alert['severity'], { border: string; icon: string; bg: string }> = {
  critical: {
    border: 'border-l-alert-critical',
    icon: 'text-alert-critical',
    bg: 'bg-alert-critical/10',
  },
  warning: {
    border: 'border-l-alert-warning',
    icon: 'text-alert-warning',
    bg: 'bg-alert-warning/10',
  },
  info: {
    border: 'border-l-alert-info',
    icon: 'text-alert-info',
    bg: 'bg-control-surface/50',
  },
};

const typeIcons: Record<Alert['type'], React.ReactNode> = {
  conflict: <Crosshair size={14} />,
  weather: <Cloud size={14} />,
  logistics: <Truck size={14} />,
  security: <Shield size={14} />,
};

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function AlertItem({ alert, isNew }: AlertItemProps) {
  const styles = severityStyles[alert.severity];

  const SeverityIcon = alert.severity === 'critical'
    ? AlertTriangle
    : alert.severity === 'warning'
    ? AlertCircle
    : Info;

  return (
    <div
      className={`
        p-3 rounded-lg border-l-4 ${styles.border} ${styles.bg}
        transition-all duration-300
        ${isNew ? 'animate-slide-in ring-1 ring-white/20' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <SeverityIcon size={16} className={`${styles.icon} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white leading-snug">
            {alert.message}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-control-muted">
              {typeIcons[alert.type]}
              <span className="text-xs capitalize">{alert.type}</span>
            </div>
            {alert.location && (
              <span className="text-xs text-control-muted">{alert.location}</span>
            )}
            <span className="text-xs text-control-muted ml-auto">
              {getTimeAgo(alert.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
