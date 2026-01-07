import type { WeatherEvent } from '../types';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    precipitation_sum: number[];
  };
}

interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  regionCode: string;
}

const MONITORED_LOCATIONS: WeatherLocation[] = [
  { name: 'Tunis', latitude: 36.8, longitude: 10.18, regionCode: 'TN-TUN' },
  { name: 'Bizerte', latitude: 37.27, longitude: 9.87, regionCode: 'TN-BIZ' },
  { name: 'Sousse', latitude: 35.83, longitude: 10.59, regionCode: 'TN-SOU' },
  { name: 'Sfax', latitude: 34.74, longitude: 10.76, regionCode: 'TN-SFX' },
  { name: 'Kairouan', latitude: 35.68, longitude: 10.1, regionCode: 'TN-KAI' },
  { name: 'Gabes', latitude: 33.88, longitude: 10.1, regionCode: 'TN-GAB' },
  { name: 'Nabeul', latitude: 36.45, longitude: 10.74, regionCode: 'TN-NAB' },
  { name: 'Kasserine', latitude: 35.17, longitude: 8.83, regionCode: 'TN-KAS' },
];

const DROUGHT_THRESHOLD_MM = 5;
const FLOOD_THRESHOLD_MM = 50;
const STORM_THRESHOLD_MM = 30;

function generatePolygon(lat: number, lng: number, radiusKm: number = 25): [number, number][] {
  const points: [number, number][] = [];
  const numPoints = 6;
  const latOffset = radiusKm / 111;
  const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    const variation = 0.8 + Math.random() * 0.4;
    points.push([
      lng + lngOffset * Math.cos(angle) * variation,
      lat + latOffset * Math.sin(angle) * variation,
    ]);
  }
  points.push(points[0]);

  return points;
}

function calculateSeverity(precipitationSum: number, type: 'flood' | 'drought' | 'storm'): 1 | 2 | 3 | 4 | 5 {
  if (type === 'drought') {
    if (precipitationSum === 0) return 5;
    if (precipitationSum < 1) return 4;
    if (precipitationSum < 3) return 3;
    if (precipitationSum < 5) return 2;
    return 1;
  }

  if (type === 'flood') {
    if (precipitationSum > 100) return 5;
    if (precipitationSum > 80) return 4;
    if (precipitationSum > 60) return 3;
    if (precipitationSum > 50) return 2;
    return 1;
  }

  if (precipitationSum > 60) return 5;
  if (precipitationSum > 50) return 4;
  if (precipitationSum > 40) return 3;
  if (precipitationSum > 30) return 2;
  return 1;
}

function estimateAffectedPopulation(severity: number, basePopulation: number = 50000): number {
  const multipliers = [0.05, 0.1, 0.2, 0.35, 0.5];
  return Math.round(basePopulation * multipliers[severity - 1] * (0.8 + Math.random() * 0.4));
}

export async function fetchWeatherData(): Promise<WeatherEvent[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const weatherEvents: WeatherEvent[] = [];

  const fetchPromises = MONITORED_LOCATIONS.map(async (location) => {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&daily=precipitation_sum&timezone=auto`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch weather for ${location.name}: ${response.status}`);
        return null;
      }

      const data: OpenMeteoResponse = await response.json();
      return { location, data };
    } catch (error) {
      console.error(`Error fetching weather for ${location.name}:`, error);
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);

  results.forEach((result) => {
    if (!result) return;

    const { location, data } = result;
    const precipitationSum = data.daily.precipitation_sum.reduce((sum, val) => sum + (val || 0), 0);
    const recentPrecipitation = data.daily.precipitation_sum.slice(-3).reduce((sum, val) => sum + (val || 0), 0);

    if (precipitationSum < DROUGHT_THRESHOLD_MM) {
      const severity = calculateSeverity(precipitationSum, 'drought');
      weatherEvents.push({
        id: `drought-${location.regionCode}`,
        polygon: generatePolygon(location.latitude, location.longitude, 30 + severity * 5),
        type: 'drought',
        severity,
        description: `Low precipitation in ${location.name} region: ${precipitationSum.toFixed(1)}mm over 14 days`,
        timestamp: new Date().toISOString(),
        affectedPopulation: estimateAffectedPopulation(severity, 75000),
      });
    }

    if (recentPrecipitation > FLOOD_THRESHOLD_MM) {
      const severity = calculateSeverity(recentPrecipitation, 'flood');
      weatherEvents.push({
        id: `flood-${location.regionCode}`,
        polygon: generatePolygon(location.latitude, location.longitude, 20 + severity * 4),
        type: 'flood',
        severity,
        description: `Heavy rainfall in ${location.name}: ${recentPrecipitation.toFixed(1)}mm in last 3 days`,
        timestamp: new Date().toISOString(),
        affectedPopulation: estimateAffectedPopulation(severity, 100000),
      });
    } else if (recentPrecipitation > STORM_THRESHOLD_MM) {
      const severity = calculateSeverity(recentPrecipitation, 'storm');
      weatherEvents.push({
        id: `storm-${location.regionCode}`,
        polygon: generatePolygon(location.latitude, location.longitude, 15 + severity * 3),
        type: 'storm',
        severity,
        description: `Storm activity in ${location.name}: ${recentPrecipitation.toFixed(1)}mm in last 3 days`,
        timestamp: new Date().toISOString(),
        affectedPopulation: estimateAffectedPopulation(severity, 60000),
      });
    }
  });

  return weatherEvents;
}

export async function fetchCurrentConditions(latitude: number, longitude: number): Promise<{
  precipitation: number;
  description: string;
} | null> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&daily=precipitation_sum&timezone=auto`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data: OpenMeteoResponse = await response.json();
    const precipitation = data.daily.precipitation_sum.reduce((sum, val) => sum + (val || 0), 0);

    let description = 'Normal conditions';
    if (precipitation < 2) description = 'Dry conditions';
    else if (precipitation > 50) description = 'Heavy rainfall';
    else if (precipitation > 30) description = 'Moderate rainfall';

    return { precipitation, description };
  } catch {
    return null;
  }
}
