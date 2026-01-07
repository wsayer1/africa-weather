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
    <div className="bg-control-base rounded-xl border border-control-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Deliveries by Region</h3>
        <span className="text-xs text-control-muted">
          {stats.totalWeightDelivered.toLocaleString()} kg delivered
        </span>
      </div>

      <div className="space-y-3">
        {stats.byRegion.map((region) => {
          const completionRate = region.total > 0
            ? Math.round((region.completed / region.total) * 100)
            : 0;

          return (
            <div
              key={region.regionId}
              className="bg-control-surface/50 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-control-muted" />
                  <span className="text-sm font-medium text-white">
                    {region.regionName}
                  </span>
                </div>
                <span className="text-xs text-control-muted">
                  {region.total} total
                </span>
              </div>

              <div className="h-2 bg-control-dark rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-emerald-500" />
                  <span className="text-control-muted">{region.completed} delivered</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-blue-400" />
                  <span className="text-control-muted">{region.inTransit} in transit</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="text-control-muted">{region.pending} pending</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
