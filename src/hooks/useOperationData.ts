import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Operation, Region, Vehicle, Delivery, Alert, Conflict } from '../types/database';

const DEFAULT_OPERATION_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export function useOperations() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOperations() {
      const { data, error } = await supabase
        .from('operations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setOperations(data || []);
      }
      setLoading(false);
    }

    fetchOperations();
  }, []);

  return { operations, loading, error };
}

export function useRegions(operationId: string = DEFAULT_OPERATION_ID) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRegions() {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .eq('operation_id', operationId)
        .order('name');

      if (error) {
        setError(error.message);
      } else {
        setRegions(data || []);
      }
      setLoading(false);
    }

    fetchRegions();
  }, [operationId]);

  return { regions, loading, error };
}

export function useVehicles(operationId: string = DEFAULT_OPERATION_ID) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVehicles() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('operation_id', operationId)
        .order('call_sign');

      if (error) {
        setError(error.message);
      } else {
        setVehicles(data || []);
      }
      setLoading(false);
    }

    fetchVehicles();

    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: `operation_id=eq.${operationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVehicles((prev) => [...prev, payload.new as Vehicle]);
          } else if (payload.eventType === 'UPDATE') {
            setVehicles((prev) =>
              prev.map((v) => (v.id === payload.new.id ? (payload.new as Vehicle) : v))
            );
          } else if (payload.eventType === 'DELETE') {
            setVehicles((prev) => prev.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationId]);

  return { vehicles, loading, error };
}

export function useDeliveries(operationId: string = DEFAULT_OPERATION_ID) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeliveries() {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('operation_id', operationId)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setDeliveries(data || []);
      }
      setLoading(false);
    }

    fetchDeliveries();

    const channel = supabase
      .channel('deliveries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `operation_id=eq.${operationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDeliveries((prev) => [payload.new as Delivery, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDeliveries((prev) =>
              prev.map((d) => (d.id === payload.new.id ? (payload.new as Delivery) : d))
            );
          } else if (payload.eventType === 'DELETE') {
            setDeliveries((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationId]);

  return { deliveries, loading, error };
}

export function useAlerts(operationId: string = DEFAULT_OPERATION_ID) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('operation_id', operationId)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setAlerts(data || []);
    }
  }, [operationId]);

  useEffect(() => {
    async function fetchAlerts() {
      await refetch();
      setLoading(false);
    }

    fetchAlerts();

    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `operation_id=eq.${operationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAlerts((prev) => [payload.new as Alert, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAlerts((prev) =>
              prev.map((a) => (a.id === payload.new.id ? (payload.new as Alert) : a))
            );
          } else if (payload.eventType === 'DELETE') {
            setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationId, refetch]);

  return { alerts, loading, error, refetch };
}

export function useConflicts(operationId: string = DEFAULT_OPERATION_ID) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConflicts() {
      const { data, error } = await supabase
        .from('conflicts')
        .select('*')
        .eq('operation_id', operationId)
        .eq('active', true)
        .order('severity', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setConflicts(data || []);
      }
      setLoading(false);
    }

    fetchConflicts();

    const channel = supabase
      .channel('conflicts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conflicts',
          filter: `operation_id=eq.${operationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && (payload.new as Conflict).active) {
            setConflicts((prev) => [payload.new as Conflict, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Conflict;
            if (updated.active) {
              setConflicts((prev) =>
                prev.some((c) => c.id === updated.id)
                  ? prev.map((c) => (c.id === updated.id ? updated : c))
                  : [updated, ...prev]
              );
            } else {
              setConflicts((prev) => prev.filter((c) => c.id !== updated.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setConflicts((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [operationId]);

  return { conflicts, loading, error };
}

export function useDeliveryStats(operationId: string = DEFAULT_OPERATION_ID) {
  const [stats, setStats] = useState<{
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
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('*, regions(name)')
        .eq('operation_id', operationId);

      const { data: regions } = await supabase
        .from('regions')
        .select('id, name')
        .eq('operation_id', operationId);

      if (deliveries && regions) {
        const byRegion = regions.map((region) => {
          const regionDeliveries = deliveries.filter((d) => d.region_id === region.id);
          return {
            regionId: region.id,
            regionName: region.name,
            total: regionDeliveries.length,
            completed: regionDeliveries.filter((d) => d.status === 'delivered').length,
            inTransit: regionDeliveries.filter((d) => d.status === 'in_transit').length,
            pending: regionDeliveries.filter((d) => d.status === 'pending').length,
          };
        });

        setStats({
          total: deliveries.length,
          completed: deliveries.filter((d) => d.status === 'delivered').length,
          inTransit: deliveries.filter((d) => d.status === 'in_transit').length,
          pending: deliveries.filter((d) => d.status === 'pending').length,
          failed: deliveries.filter((d) => d.status === 'failed').length,
          totalWeightDelivered: deliveries
            .filter((d) => d.status === 'delivered')
            .reduce((sum, d) => sum + (d.cargo_weight || 0), 0),
          byRegion,
        });
      }
      setLoading(false);
    }

    fetchStats();
  }, [operationId]);

  return { stats, loading };
}
