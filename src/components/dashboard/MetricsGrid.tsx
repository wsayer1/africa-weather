import { Users, Crosshair, Route, TrendingUp, TrendingDown } from 'lucide-react';
import type { MetricsData } from '../../types';

interface MetricsGridProps {
  data: MetricsData;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

export function MetricsGrid({ data }: MetricsGridProps) {
  const progress = (data.childrenReached.current / data.childrenReached.target) * 100;

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="bg-control-base rounded-xl p-4 border border-control-border">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-alert-success/20 flex items-center justify-center">
            <Users size={20} className="text-alert-success" />
          </div>
          <div className={`flex items-center gap-1 text-sm ${data.childrenReached.trend >= 0 ? 'text-alert-success' : 'text-alert-critical'}`}>
            {data.childrenReached.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(data.childrenReached.trend)}%</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-white mb-1">
          {formatNumber(data.childrenReached.current)}
        </p>
        <p className="text-xs text-control-muted mb-3">
          Children Reached <span className="text-slate-500">/ {formatNumber(data.childrenReached.target)} target</span>
        </p>
        <div className="h-2 bg-control-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-alert-success to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-control-muted mt-1">{progress.toFixed(1)}% of target</p>
      </div>

      <div className="bg-control-base rounded-xl p-4 border border-control-border">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-alert-critical/20 flex items-center justify-center">
            <Crosshair size={20} className="text-alert-critical" />
          </div>
          <div className={`flex items-center gap-1 text-sm ${data.activeConflictZones.trend <= 0 ? 'text-alert-success' : 'text-alert-critical'}`}>
            {data.activeConflictZones.trend <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            <span>{Math.abs(data.activeConflictZones.trend)}</span>
          </div>
        </div>
        <p className="text-4xl font-bold text-white mb-1">
          {data.activeConflictZones.count}
        </p>
        <p className="text-xs text-control-muted">Active Conflict Zones</p>
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                i < Math.min(data.activeConflictZones.count / 4, 5)
                  ? 'bg-alert-critical'
                  : 'bg-control-surface'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-control-muted mt-1">Threat level indicator</p>
      </div>

      <div className="bg-control-base rounded-xl p-4 border border-control-border">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-alert-warning/20 flex items-center justify-center">
            <Route size={20} className="text-alert-warning" />
          </div>
          <div className={`flex items-center gap-1 text-sm ${data.routeAccessibility.trend >= 0 ? 'text-alert-success' : 'text-alert-critical'}`}>
            {data.routeAccessibility.trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(data.routeAccessibility.trend)}%</span>
          </div>
        </div>
        <p className="text-4xl font-bold text-white mb-1">
          {data.routeAccessibility.percentage}%
        </p>
        <p className="text-xs text-control-muted">Route Accessibility</p>
        <div className="mt-3 relative">
          <div className="h-2 bg-control-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                data.routeAccessibility.percentage >= 75
                  ? 'bg-alert-success'
                  : data.routeAccessibility.percentage >= 50
                  ? 'bg-alert-warning'
                  : 'bg-alert-critical'
              }`}
              style={{ width: `${data.routeAccessibility.percentage}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-control-muted mt-1">
          {data.routeAccessibility.percentage >= 75 ? 'Good' : data.routeAccessibility.percentage >= 50 ? 'Moderate' : 'Critical'} conditions
        </p>
      </div>
    </div>
  );
}
