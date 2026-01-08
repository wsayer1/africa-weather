import { MapPin, Package, Truck, Clock } from 'lucide-react';

interface RegionStatsProps {
  stats: {
    total: number;
    completed: number;
    inTransit: number;
    pending: number;
    failed: number;
    totalWeightDelivered: number;
    byRegion: {
      regionId: string;
      regionName: string;
      total: number;
      completed: number;
      inTransit: number;
      pending: number;
    }[];
  } | null;
  isLoading: boolean;
}

export function RegionStats({ stats, isLoading }: RegionStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="bg-control-base rounded-xl border border-control-border p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Deliveries by Region</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-control-surface/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-control-base rounded-xl border border-control-border overflow-hidden">
      <div className="p-6 pb-4 border-b border-control-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Deliveries by Region</h3>
          <div className="px-3 py-1 rounded-lg bg-control-surface/50">
            <span className="text-xs font-medium text-control-muted">
              {stats.totalWeightDelivered.toLocaleString()} kg delivered
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 pt-4">

        <div className="space-y-4">
          {stats.byRegion.map((region) => {
            const completionRate = region.total > 0
              ? Math.round((region.completed / region.total) * 100)
              : 0;

            return (
              <div
                key={region.regionId}
                className="bg-control-surface/50 rounded-lg p-4 hover:bg-control-surface/70 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-control-dark flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-alert-info" />
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {region.regionName}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-control-muted px-2 py-1 bg-control-dark rounded">
                    {region.total} total
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-control-muted">Completion Rate</span>
                    <span className="font-semibold text-white">{completionRate}%</span>
                  </div>
                  <div className="h-2 bg-control-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/30"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-control-muted">{region.completed}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-control-muted">{region.inTransit}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-control-muted">{region.pending}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
