import { Shield, Clock, MapPin } from 'lucide-react';
import type { RiskLevel } from '../../types';

interface HeaderProps {
  riskLevel: RiskLevel;
  region: string;
}

const riskColors: Record<RiskLevel['level'], { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-alert-success/20', text: 'text-alert-success', border: 'border-alert-success' },
  moderate: { bg: 'bg-alert-info/20', text: 'text-alert-info', border: 'border-alert-info' },
  elevated: { bg: 'bg-alert-warning/20', text: 'text-alert-warning', border: 'border-alert-warning' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500' },
  critical: { bg: 'bg-alert-critical/20', text: 'text-alert-critical', border: 'border-alert-critical' },
};

export function Header({ riskLevel, region }: HeaderProps) {
  const colors = riskColors[riskLevel.level];
  const now = new Date();

  return (
    <header className="h-14 bg-control-dark border-b border-control-border px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          <span className="text-alert-warning">Pulse</span> Africa
        </h1>
        <span className="text-xs text-control-muted">Food & Conflict Overlay</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-control-muted">
          <MapPin size={14} />
          <span>{region}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${colors.bg} ${colors.border}`}>
          <Shield size={14} className={colors.text} />
          <span className={`text-sm font-medium uppercase tracking-wide ${colors.text}`}>
            {riskLevel.level}
          </span>
          <span className={`text-xs ${colors.text} opacity-75`}>
            {riskLevel.score}/100
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-control-muted">
          <Clock size={14} />
          <span className="tabular-nums">
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          <span className="text-xs">UTC</span>
        </div>
      </div>
    </header>
  );
}
