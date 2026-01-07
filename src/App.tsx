import { useState, useMemo } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MapView } from './components/map/MapView';
import { AlertFeed } from './components/alerts/AlertFeed';
import { MetricsGrid } from './components/dashboard/MetricsGrid';
import { DeliveryChart } from './components/dashboard/DeliveryChart';
import { RegionStats } from './components/dashboard/RegionStats';
import {
  useAlerts,
  useConflicts,
  useVehicles,
  useDeliveries,
  useRegions,
  useDeliveryStats,
} from './hooks/useOperationData';
import { weatherEvents, metricsData } from './data/mockData';
import type { Alert, ConflictEvent, RiskLevel } from './types';

function App() {
  const [activeNav, setActiveNav] = useState('map');

  const { alerts: dbAlerts, loading: alertsLoading } = useAlerts();
  const { conflicts, loading: conflictsLoading } = useConflicts();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { deliveries, loading: deliveriesLoading } = useDeliveries();
  const { regions, loading: regionsLoading } = useRegions();
  const { stats: deliveryStats } = useDeliveryStats();

  const alerts: Alert[] = useMemo(() => {
    return dbAlerts.map((alert) => ({
      id: alert.id,
      timestamp: alert.created_at,
      message: alert.message,
      severity: alert.severity,
      type: alert.type,
      location: alert.region_id ? regions.find(r => r.id === alert.region_id)?.name : undefined,
      title: alert.title,
    }));
  }, [dbAlerts, regions]);

  const conflictEvents: ConflictEvent[] = useMemo(() => {
    const severityMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 5,
    };
    const typeMap: Record<string, 'armed_conflict' | 'civil_unrest' | 'terrorism' | 'border_dispute'> = {
      active_conflict: 'armed_conflict',
      roadblock: 'civil_unrest',
      checkpoint: 'civil_unrest',
      danger_zone: 'terrorism',
      natural_hazard: 'civil_unrest',
      infrastructure: 'civil_unrest',
    };

    return conflicts.map((conflict) => ({
      id: conflict.id,
      coordinates: [conflict.latitude, conflict.longitude] as [number, number],
      severity: severityMap[conflict.severity] || 2,
      description: conflict.description || 'No description available',
      location: regions.find(r => r.id === conflict.region_id)?.name || 'Unknown',
      timestamp: conflict.created_at,
      type: typeMap[conflict.type] || 'civil_unrest',
    }));
  }, [conflicts, regions]);

  const currentRiskLevel: RiskLevel = useMemo(() => {
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
    const highCount = conflicts.filter(c => c.severity === 'high').length;
    const score = Math.min(100, criticalCount * 25 + highCount * 15 + conflicts.length * 5);

    let level: RiskLevel['level'] = 'low';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 40) level = 'elevated';
    else if (score >= 20) level = 'moderate';

    return {
      level,
      score,
      lastUpdated: new Date().toISOString(),
    };
  }, [conflicts]);

  const isLoading = alertsLoading || conflictsLoading || vehiclesLoading || deliveriesLoading || regionsLoading;

  const updatedMetrics = useMemo(() => {
    if (!deliveryStats) return metricsData;

    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const totalCargo = deliveries
      .filter(d => d.status === 'delivered')
      .reduce((sum, d) => sum + (d.cargo_weight || 0), 0);

    return {
      ...metricsData,
      childrenReached: {
        current: Math.round(totalCargo * 0.8),
        target: 1000000,
        trend: 3.2,
      },
      activeConflictZones: {
        count: conflicts.length,
        trend: -2,
      },
      routeAccessibility: {
        percentage: Math.round((activeVehicles / Math.max(vehicles.length, 1)) * 100),
        trend: -5,
      },
    };
  }, [deliveryStats, vehicles, deliveries, conflicts]);

  return (
    <div className="h-screen flex bg-control-dark overflow-hidden">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header riskLevel={currentRiskLevel} region="Operation Phoenix" />

        <div className="flex-1 flex min-h-0">
          {activeNav === 'map' && (
            <main className="flex-1 flex min-w-0">
              <div className="flex-1">
                <MapView
                  conflictEvents={conflictEvents}
                  weatherEvents={weatherEvents}
                  vehicles={vehicles}
                  deliveries={deliveries}
                  isLoading={isLoading}
                />
              </div>
              <AlertFeed alerts={alerts} isLoading={alertsLoading} />
            </main>
          )}

          {activeNav === 'dashboard' && (
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Operations Dashboard</h2>
                  <p className="text-sm text-control-muted">Real-time humanitarian metrics and delivery tracking</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <MetricsGridCard data={updatedMetrics} />
                </div>
                <DeliveryChart data={updatedMetrics.deliveryHistory} />
                <div className="grid grid-cols-2 gap-6">
                  <RegionStats stats={deliveryStats} isLoading={deliveriesLoading} />
                  <ConflictSummaryCard conflicts={conflicts} />
                </div>
              </div>
            </main>
          )}

          {activeNav === 'settings' && (
            <main className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-control-muted">Settings page coming soon</p>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricsGridCard({ data }: { data: typeof metricsData }) {
  return <MetricsGrid data={data} />;
}

function ConflictSummaryCard({ conflicts }: { conflicts: { severity: string }[] }) {
  const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
  const highCount = conflicts.filter(c => c.severity === 'high').length;
  const mediumCount = conflicts.filter(c => c.severity === 'medium').length;
  const lowCount = conflicts.filter(c => c.severity === 'low').length;

  return (
    <div className="bg-control-base rounded-xl border border-control-border p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Conflict Summary</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-control-muted">Total Incidents</span>
          <span className="text-2xl font-bold text-white">{conflicts.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-control-surface/50 rounded-lg p-3">
            <p className="text-xs text-control-muted mb-1">Critical</p>
            <p className="text-lg font-semibold text-alert-critical">{criticalCount}</p>
          </div>
          <div className="bg-control-surface/50 rounded-lg p-3">
            <p className="text-xs text-control-muted mb-1">High</p>
            <p className="text-lg font-semibold text-orange-500">{highCount}</p>
          </div>
          <div className="bg-control-surface/50 rounded-lg p-3">
            <p className="text-xs text-control-muted mb-1">Moderate</p>
            <p className="text-lg font-semibold text-alert-warning">{mediumCount}</p>
          </div>
          <div className="bg-control-surface/50 rounded-lg p-3">
            <p className="text-xs text-control-muted mb-1">Low</p>
            <p className="text-lg font-semibold text-alert-info">{lowCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
