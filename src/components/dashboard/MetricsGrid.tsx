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
    <>
      <div className="bg-control-base rounded-xl border border-control-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-alert-success/30 to-emerald-500/20 flex items-center justify-center ring-1 ring-alert-success/20">
                <Users size={28} className="text-alert-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-control-muted mb-1">Children Reached</p>
                <p className="text-4xl font-bold text-white tracking-tight">
                  {formatNumber(data.childrenReached.current)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${data.childrenReached.trend >= 0 ? 'bg-alert-success/20 text-alert-success' : 'bg-alert-critical/20 text-alert-critical'}`}>
                {data.childrenReached.trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(data.childrenReached.trend)}%</span>
              </div>
              <p className="text-xs text-control-muted mt-2">vs. last period</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-control-muted">Target: {formatNumber(data.childrenReached.target)}</span>
              <span className="font-semibold text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 bg-control-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-alert-success via-emerald-400 to-emerald-500 rounded-full transition-all duration-700 shadow-lg shadow-alert-success/50"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-control-base rounded-xl border border-control-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-alert-critical/30 to-red-500/20 flex items-center justify-center ring-1 ring-alert-critical/20">
                <Crosshair size={28} className="text-alert-critical" />
              </div>
              <div>
                <p className="text-sm font-medium text-control-muted mb-1">Active Conflict Zones</p>
                <p className="text-4xl font-bold text-white tracking-tight">
                  {data.activeConflictZones.count}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${data.activeConflictZones.trend <= 0 ? 'bg-alert-success/20 text-alert-success' : 'bg-alert-critical/20 text-alert-critical'}`}>
                {data.activeConflictZones.trend <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                <span>{Math.abs(data.activeConflictZones.trend)}</span>
              </div>
              <p className="text-xs text-control-muted mt-2">change today</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-control-muted uppercase tracking-wider">Threat Level</p>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    i < Math.min(Math.ceil(data.activeConflictZones.count / 4), 5)
                      ? 'bg-alert-critical shadow-lg shadow-alert-critical/30'
                      : 'bg-control-surface'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-control-base rounded-xl border border-control-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-alert-warning/30 to-amber-500/20 flex items-center justify-center ring-1 ring-alert-warning/20">
                <Route size={28} className="text-alert-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-control-muted mb-1">Route Accessibility</p>
                <p className="text-4xl font-bold text-white tracking-tight">
                  {data.routeAccessibility.percentage}%
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${data.routeAccessibility.trend >= 0 ? 'bg-alert-success/20 text-alert-success' : 'bg-alert-critical/20 text-alert-critical'}`}>
                {data.routeAccessibility.trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(data.routeAccessibility.trend)}%</span>
              </div>
              <p className="text-xs text-control-muted mt-2">vs. yesterday</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="text-xs font-medium text-control-muted uppercase tracking-wider">Conditions</p>
              <span className={`font-semibold ${
                data.routeAccessibility.percentage >= 75 ? 'text-alert-success' :
                data.routeAccessibility.percentage >= 50 ? 'text-alert-warning' :
                'text-alert-critical'
              }`}>
                {data.routeAccessibility.percentage >= 75 ? 'Good' : data.routeAccessibility.percentage >= 50 ? 'Moderate' : 'Critical'}
              </span>
            </div>
            <div className="h-2.5 bg-control-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  data.routeAccessibility.percentage >= 75
                    ? 'bg-gradient-to-r from-alert-success to-emerald-500 shadow-lg shadow-alert-success/50'
                    : data.routeAccessibility.percentage >= 50
                    ? 'bg-gradient-to-r from-alert-warning to-amber-500 shadow-lg shadow-alert-warning/50'
                    : 'bg-gradient-to-r from-alert-critical to-red-500 shadow-lg shadow-alert-critical/50'
                }`}
                style={{ width: `${data.routeAccessibility.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
