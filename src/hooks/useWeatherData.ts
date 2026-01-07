import { useState, useEffect, useCallback } from 'react';
import { fetchWeatherData } from '../services/weatherService';
import type { WeatherEvent } from '../types';

const CACHE_DURATION_MS = 30 * 60 * 1000;

interface CachedWeatherData {
  data: WeatherEvent[];
  timestamp: number;
}

let weatherCache: CachedWeatherData | null = null;

export function useWeatherData() {
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadWeatherData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && weatherCache && Date.now() - weatherCache.timestamp < CACHE_DURATION_MS) {
      setWeatherEvents(weatherCache.data);
      setLastUpdated(new Date(weatherCache.timestamp));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const events = await fetchWeatherData();
      weatherCache = {
        data: events,
        timestamp: Date.now(),
      };
      setWeatherEvents(events);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(message);
      if (weatherCache) {
        setWeatherEvents(weatherCache.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeatherData();
  }, [loadWeatherData]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadWeatherData();
    }, CACHE_DURATION_MS);

    return () => clearInterval(interval);
  }, [loadWeatherData]);

  const refresh = useCallback(() => {
    loadWeatherData(true);
  }, [loadWeatherData]);

  return {
    weatherEvents,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}

export function useWeatherSummary(weatherEvents: WeatherEvent[]) {
  const summary = {
    totalEvents: weatherEvents.length,
    byType: {
      flood: weatherEvents.filter((e) => e.type === 'flood'),
      drought: weatherEvents.filter((e) => e.type === 'drought'),
      storm: weatherEvents.filter((e) => e.type === 'storm'),
    },
    criticalEvents: weatherEvents.filter((e) => e.severity >= 4),
    totalAffectedPopulation: weatherEvents.reduce((sum, e) => sum + (e.affectedPopulation || 0), 0),
    averageSeverity: weatherEvents.length > 0
      ? weatherEvents.reduce((sum, e) => sum + e.severity, 0) / weatherEvents.length
      : 0,
  };

  return summary;
}
