export type {
  Operation,
  Region,
  Vehicle,
  Delivery,
  Alert as DbAlert,
  Conflict,
  UserProfile
} from './database';

export interface ConflictEvent {
  id: string;
  coordinates: [number, number];
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  location: string;
  timestamp: string;
  casualties?: number;
  type: 'armed_conflict' | 'civil_unrest' | 'terrorism' | 'border_dispute';
}

export interface WeatherEvent {
  id: string;
  polygon: [number, number][];
  type: 'flood' | 'drought' | 'storm';
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;
  timestamp: string;
  affectedPopulation?: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'conflict' | 'weather' | 'logistics' | 'security' | 'route_blocked' | 'vehicle' | 'medical' | 'supply' | 'communication';
  location?: string;
  title?: string;
}

export interface MetricsData {
  childrenReached: {
    current: number;
    target: number;
    trend: number;
  };
  activeConflictZones: {
    count: number;
    trend: number;
  };
  routeAccessibility: {
    percentage: number;
    trend: number;
  };
  deliveryHistory: {
    date: string;
    volume: number;
    target: number;
  }[];
}

export interface RiskLevel {
  level: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  score: number;
  lastUpdated: string;
}
