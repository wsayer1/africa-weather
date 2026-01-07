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
  // North Africa
  { name: 'Cairo', latitude: 30.04, longitude: 31.24, regionCode: 'EG-CAI' },
  { name: 'Alexandria', latitude: 31.20, longitude: 29.92, regionCode: 'EG-ALX' },
  { name: 'Aswan', latitude: 24.09, longitude: 32.90, regionCode: 'EG-ASW' },
  { name: 'Tunis', latitude: 36.80, longitude: 10.18, regionCode: 'TN-TUN' },
  { name: 'Algiers', latitude: 36.75, longitude: 3.06, regionCode: 'DZ-ALG' },
  { name: 'Oran', latitude: 35.70, longitude: -0.63, regionCode: 'DZ-ORA' },
  { name: 'Casablanca', latitude: 33.57, longitude: -7.59, regionCode: 'MA-CAS' },
  { name: 'Marrakech', latitude: 31.63, longitude: -8.01, regionCode: 'MA-MAR' },
  { name: 'Tripoli', latitude: 32.90, longitude: 13.19, regionCode: 'LY-TRI' },
  { name: 'Benghazi', latitude: 32.12, longitude: 20.07, regionCode: 'LY-BEN' },

  // West Africa
  { name: 'Lagos', latitude: 6.52, longitude: 3.38, regionCode: 'NG-LAG' },
  { name: 'Abuja', latitude: 9.08, longitude: 7.40, regionCode: 'NG-ABU' },
  { name: 'Kano', latitude: 12.00, longitude: 8.52, regionCode: 'NG-KAN' },
  { name: 'Accra', latitude: 5.56, longitude: -0.19, regionCode: 'GH-ACC' },
  { name: 'Kumasi', latitude: 6.69, longitude: -1.62, regionCode: 'GH-KUM' },
  { name: 'Dakar', latitude: 14.69, longitude: -17.44, regionCode: 'SN-DAK' },
  { name: 'Abidjan', latitude: 5.36, longitude: -4.01, regionCode: 'CI-ABJ' },
  { name: 'Bamako', latitude: 12.64, longitude: -8.00, regionCode: 'ML-BAM' },
  { name: 'Ouagadougou', latitude: 12.37, longitude: -1.52, regionCode: 'BF-OUA' },
  { name: 'Niamey', latitude: 13.51, longitude: 2.11, regionCode: 'NE-NIA' },
  { name: 'Conakry', latitude: 9.64, longitude: -13.58, regionCode: 'GN-CON' },
  { name: 'Freetown', latitude: 8.48, longitude: -13.23, regionCode: 'SL-FRE' },
  { name: 'Monrovia', latitude: 6.30, longitude: -10.80, regionCode: 'LR-MON' },
  { name: 'Nouakchott', latitude: 18.09, longitude: -15.98, regionCode: 'MR-NOU' },

  // East Africa
  { name: 'Nairobi', latitude: -1.29, longitude: 36.82, regionCode: 'KE-NAI' },
  { name: 'Mombasa', latitude: -4.04, longitude: 39.67, regionCode: 'KE-MOM' },
  { name: 'Kisumu', latitude: -0.09, longitude: 34.77, regionCode: 'KE-KIS' },
  { name: 'Addis Ababa', latitude: 9.01, longitude: 38.75, regionCode: 'ET-ADD' },
  { name: 'Dire Dawa', latitude: 9.60, longitude: 41.85, regionCode: 'ET-DIR' },
  { name: 'Dar es Salaam', latitude: -6.79, longitude: 39.21, regionCode: 'TZ-DAR' },
  { name: 'Dodoma', latitude: -6.17, longitude: 35.74, regionCode: 'TZ-DOD' },
  { name: 'Arusha', latitude: -3.39, longitude: 36.68, regionCode: 'TZ-ARU' },
  { name: 'Kampala', latitude: 0.35, longitude: 32.58, regionCode: 'UG-KAM' },
  { name: 'Mogadishu', latitude: 2.05, longitude: 45.34, regionCode: 'SO-MOG' },
  { name: 'Hargeisa', latitude: 9.56, longitude: 44.06, regionCode: 'SO-HAR' },
  { name: 'Khartoum', latitude: 15.50, longitude: 32.56, regionCode: 'SD-KHA' },
  { name: 'Port Sudan', latitude: 19.62, longitude: 37.22, regionCode: 'SD-POR' },
  { name: 'Juba', latitude: 4.86, longitude: 31.57, regionCode: 'SS-JUB' },
  { name: 'Kigali', latitude: -1.95, longitude: 30.06, regionCode: 'RW-KIG' },
  { name: 'Bujumbura', latitude: -3.38, longitude: 29.36, regionCode: 'BI-BJM' },
  { name: 'Asmara', latitude: 15.34, longitude: 38.93, regionCode: 'ER-ASM' },
  { name: 'Djibouti City', latitude: 11.59, longitude: 43.15, regionCode: 'DJ-DJI' },

  // Central Africa
  { name: 'Kinshasa', latitude: -4.44, longitude: 15.27, regionCode: 'CD-KIN' },
  { name: 'Lubumbashi', latitude: -11.66, longitude: 27.48, regionCode: 'CD-LUB' },
  { name: 'Goma', latitude: -1.68, longitude: 29.23, regionCode: 'CD-GOM' },
  { name: 'Brazzaville', latitude: -4.27, longitude: 15.28, regionCode: 'CG-BZV' },
  { name: 'Douala', latitude: 4.05, longitude: 9.77, regionCode: 'CM-DOU' },
  { name: 'Yaounde', latitude: 3.87, longitude: 11.52, regionCode: 'CM-YAO' },
  { name: 'Bangui', latitude: 4.36, longitude: 18.56, regionCode: 'CF-BGI' },
  { name: 'NDjamena', latitude: 12.13, longitude: 15.05, regionCode: 'TD-NDJ' },
  { name: 'Libreville', latitude: 0.39, longitude: 9.45, regionCode: 'GA-LIB' },
  { name: 'Malabo', latitude: 3.75, longitude: 8.78, regionCode: 'GQ-MAL' },
  { name: 'Luanda', latitude: -8.84, longitude: 13.23, regionCode: 'AO-LUA' },

  // Southern Africa
  { name: 'Johannesburg', latitude: -26.20, longitude: 28.05, regionCode: 'ZA-JHB' },
  { name: 'Cape Town', latitude: -33.93, longitude: 18.42, regionCode: 'ZA-CPT' },
  { name: 'Durban', latitude: -29.86, longitude: 31.02, regionCode: 'ZA-DUR' },
  { name: 'Pretoria', latitude: -25.75, longitude: 28.19, regionCode: 'ZA-PRE' },
  { name: 'Harare', latitude: -17.83, longitude: 31.05, regionCode: 'ZW-HAR' },
  { name: 'Bulawayo', latitude: -20.15, longitude: 28.58, regionCode: 'ZW-BUL' },
  { name: 'Lusaka', latitude: -15.39, longitude: 28.32, regionCode: 'ZM-LUS' },
  { name: 'Maputo', latitude: -25.97, longitude: 32.58, regionCode: 'MZ-MAP' },
  { name: 'Beira', latitude: -19.84, longitude: 34.84, regionCode: 'MZ-BEI' },
  { name: 'Gaborone', latitude: -24.65, longitude: 25.91, regionCode: 'BW-GAB' },
  { name: 'Windhoek', latitude: -22.56, longitude: 17.08, regionCode: 'NA-WIN' },
  { name: 'Antananarivo', latitude: -18.88, longitude: 47.51, regionCode: 'MG-ANT' },
  { name: 'Toamasina', latitude: -18.15, longitude: 49.40, regionCode: 'MG-TOA' },
  { name: 'Lilongwe', latitude: -13.97, longitude: 33.79, regionCode: 'MW-LIL' },
  { name: 'Blantyre', latitude: -15.79, longitude: 35.01, regionCode: 'MW-BLA' },
  { name: 'Port Louis', latitude: -20.16, longitude: 57.50, regionCode: 'MU-POR' },
  { name: 'Mbabane', latitude: -26.32, longitude: 31.13, regionCode: 'SZ-MBA' },
  { name: 'Maseru', latitude: -29.31, longitude: 27.48, regionCode: 'LS-MAS' },
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
