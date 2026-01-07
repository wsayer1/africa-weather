import type { ConflictEvent, WeatherEvent, Alert, MetricsData, RiskLevel } from '../types';

export const conflictEvents: ConflictEvent[] = [
  {
    id: 'c1',
    coordinates: [32.5825, 0.3476],
    severity: 4,
    description: 'Armed militia activity reported near supply routes',
    location: 'Northern Uganda',
    timestamp: '2024-01-15T08:30:00Z',
    casualties: 12,
    type: 'armed_conflict',
  },
  {
    id: 'c2',
    coordinates: [36.8219, -1.2921],
    severity: 2,
    description: 'Civil unrest in urban area affecting distribution',
    location: 'Nairobi, Kenya',
    timestamp: '2024-01-15T10:15:00Z',
    type: 'civil_unrest',
  },
  {
    id: 'c3',
    coordinates: [45.3182, 2.0469],
    severity: 5,
    description: 'Major terrorist attack on humanitarian convoy',
    location: 'Mogadishu, Somalia',
    timestamp: '2024-01-15T06:45:00Z',
    casualties: 28,
    type: 'terrorism',
  },
  {
    id: 'c4',
    coordinates: [38.7578, 9.0107],
    severity: 3,
    description: 'Ethnic tensions escalating in regional border',
    location: 'Addis Ababa, Ethiopia',
    timestamp: '2024-01-15T12:00:00Z',
    type: 'civil_unrest',
  },
  {
    id: 'c5',
    coordinates: [32.5599, 15.5007],
    severity: 4,
    description: 'Armed groups blocking aid access',
    location: 'Khartoum, Sudan',
    timestamp: '2024-01-15T09:20:00Z',
    casualties: 8,
    type: 'armed_conflict',
  },
  {
    id: 'c6',
    coordinates: [29.3599, -3.3614],
    severity: 3,
    description: 'Border dispute affecting refugee movement',
    location: 'Bujumbura, Burundi',
    timestamp: '2024-01-15T14:30:00Z',
    type: 'border_dispute',
  },
  {
    id: 'c7',
    coordinates: [30.0619, -1.9403],
    severity: 2,
    description: 'Local protests near distribution center',
    location: 'Kigali, Rwanda',
    timestamp: '2024-01-15T11:45:00Z',
    type: 'civil_unrest',
  },
  {
    id: 'c8',
    coordinates: [31.5497, 4.8594],
    severity: 5,
    description: 'Active combat zone - all operations suspended',
    location: 'Juba, South Sudan',
    timestamp: '2024-01-15T07:00:00Z',
    casualties: 45,
    type: 'armed_conflict',
  },
  {
    id: 'c9',
    coordinates: [39.6682, -4.0435],
    severity: 1,
    description: 'Minor security incident resolved',
    location: 'Mombasa, Kenya',
    timestamp: '2024-01-15T16:00:00Z',
    type: 'civil_unrest',
  },
  {
    id: 'c10',
    coordinates: [34.7525, 0.5143],
    severity: 3,
    description: 'Intermittent fighting near food storage',
    location: 'Kisumu, Kenya',
    timestamp: '2024-01-15T13:15:00Z',
    casualties: 3,
    type: 'armed_conflict',
  },
  {
    id: 'c11',
    coordinates: [44.0653, 9.5574],
    severity: 4,
    description: 'Al-Shabaab presence reported on route',
    location: 'Hargeisa, Somalia',
    timestamp: '2024-01-15T08:00:00Z',
    type: 'terrorism',
  },
  {
    id: 'c12',
    coordinates: [37.5822, 6.2088],
    severity: 2,
    description: 'Political demonstrations affecting transit',
    location: 'Hawassa, Ethiopia',
    timestamp: '2024-01-15T15:30:00Z',
    type: 'civil_unrest',
  },
  {
    id: 'c13',
    coordinates: [33.7878, 5.0322],
    severity: 3,
    description: 'Rebel activity near supply depot',
    location: 'Torit, South Sudan',
    timestamp: '2024-01-15T10:00:00Z',
    casualties: 5,
    type: 'armed_conflict',
  },
  {
    id: 'c14',
    coordinates: [28.8628, -2.5079],
    severity: 2,
    description: 'Militia checkpoint established',
    location: 'Bukavu, DRC',
    timestamp: '2024-01-15T12:30:00Z',
    type: 'armed_conflict',
  },
  {
    id: 'c15',
    coordinates: [47.5079, 11.5890],
    severity: 3,
    description: 'Piracy concerns affecting port operations',
    location: 'Djibouti',
    timestamp: '2024-01-15T09:45:00Z',
    type: 'terrorism',
  },
];

export const weatherEvents: WeatherEvent[] = [
  {
    id: 'w1',
    polygon: [
      [31.5, -0.5],
      [32.5, -0.3],
      [33.0, 0.2],
      [32.8, 0.8],
      [32.0, 1.0],
      [31.2, 0.5],
      [31.5, -0.5],
    ],
    type: 'flood',
    severity: 4,
    description: 'Severe flooding affecting Lake Victoria basin',
    timestamp: '2024-01-15T00:00:00Z',
    affectedPopulation: 125000,
  },
  {
    id: 'w2',
    polygon: [
      [39.0, 3.5],
      [40.5, 3.8],
      [41.0, 5.0],
      [40.0, 5.5],
      [38.5, 5.0],
      [38.5, 4.0],
      [39.0, 3.5],
    ],
    type: 'drought',
    severity: 5,
    description: 'Extreme drought conditions in Ogaden region',
    timestamp: '2024-01-15T00:00:00Z',
    affectedPopulation: 450000,
  },
  {
    id: 'w3',
    polygon: [
      [34.5, -3.0],
      [35.5, -2.8],
      [36.0, -2.0],
      [35.5, -1.5],
      [34.5, -1.8],
      [34.0, -2.5],
      [34.5, -3.0],
    ],
    type: 'flood',
    severity: 3,
    description: 'Seasonal flooding in Rift Valley',
    timestamp: '2024-01-15T00:00:00Z',
    affectedPopulation: 85000,
  },
  {
    id: 'w4',
    polygon: [
      [43.0, 8.0],
      [45.0, 8.5],
      [46.0, 10.0],
      [44.5, 11.0],
      [43.0, 10.5],
      [42.5, 9.0],
      [43.0, 8.0],
    ],
    type: 'drought',
    severity: 4,
    description: 'Prolonged dry spell affecting pastoralist communities',
    timestamp: '2024-01-15T00:00:00Z',
    affectedPopulation: 320000,
  },
  {
    id: 'w5',
    polygon: [
      [29.0, 3.0],
      [30.0, 3.5],
      [30.5, 4.5],
      [29.5, 5.0],
      [28.5, 4.5],
      [28.5, 3.5],
      [29.0, 3.0],
    ],
    type: 'flood',
    severity: 3,
    description: 'Flash flooding along Nile tributaries',
    timestamp: '2024-01-15T00:00:00Z',
    affectedPopulation: 68000,
  },
  {
    id: 'w6',
    polygon: [
      [35.0, 12.0],
      [37.0, 12.5],
      [38.0, 14.0],
      [36.5, 15.0],
      [35.0, 14.5],
      [34.5, 13.0],
      [35.0, 12.0],
    ],
    type: 'drought',
    severity: 4,
    description: 'Critical water shortage in Tigray region',
    timestamp: '2024-01-15T00:00:00Z',
    affectedPopulation: 280000,
  },
];

export const generateAlerts = (): Alert[] => {
  const alerts: Alert[] = [
    {
      id: 'a1',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      message: 'Supply convoy attacked near Juba - 3 vehicles damaged',
      severity: 'critical',
      type: 'conflict',
      location: 'South Sudan',
    },
    {
      id: 'a2',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      message: 'Weather alert: Flash flood warning for Rift Valley',
      severity: 'warning',
      type: 'weather',
      location: 'Kenya',
    },
    {
      id: 'a3',
      timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
      message: 'Route B-17 reopened after security clearance',
      severity: 'info',
      type: 'logistics',
      location: 'Uganda',
    },
    {
      id: 'a4',
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      message: 'Armed group activity detected near Mogadishu port',
      severity: 'critical',
      type: 'security',
      location: 'Somalia',
    },
    {
      id: 'a5',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
      message: 'Food distribution completed in Kakuma Camp',
      severity: 'info',
      type: 'logistics',
      location: 'Kenya',
    },
    {
      id: 'a6',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      message: 'Security incident: Checkpoint established by militia',
      severity: 'warning',
      type: 'security',
      location: 'DRC',
    },
    {
      id: 'a7',
      timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
      message: 'Drought conditions worsening in Ogaden region',
      severity: 'warning',
      type: 'weather',
      location: 'Ethiopia',
    },
    {
      id: 'a8',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      message: 'Emergency: Medical supplies critically low in Bujumbura',
      severity: 'critical',
      type: 'logistics',
      location: 'Burundi',
    },
    {
      id: 'a9',
      timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
      message: 'Border crossing delays reported at Moyale',
      severity: 'info',
      type: 'logistics',
      location: 'Kenya-Ethiopia',
    },
    {
      id: 'a10',
      timestamp: new Date(Date.now() - 68 * 60000).toISOString(),
      message: 'Civil unrest subsiding in Nairobi suburbs',
      severity: 'info',
      type: 'conflict',
      location: 'Kenya',
    },
  ];
  return alerts;
};

export const generateDeliveryHistory = (): MetricsData['deliveryHistory'] => {
  const history: MetricsData['deliveryHistory'] = [];
  const baseVolume = 45000;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const variation = Math.sin(i * 0.3) * 8000 + (Math.random() - 0.5) * 6000;
    const disruption = i > 20 && i < 25 ? -15000 : 0;

    history.push({
      date: date.toISOString().split('T')[0],
      volume: Math.round(Math.max(20000, baseVolume + variation + disruption)),
      target: 50000,
    });
  }

  return history;
};

export const metricsData: MetricsData = {
  childrenReached: {
    current: 847392,
    target: 1000000,
    trend: 3.2,
  },
  activeConflictZones: {
    count: 15,
    trend: -2,
  },
  routeAccessibility: {
    percentage: 67,
    trend: -5,
  },
  deliveryHistory: generateDeliveryHistory(),
};

export const currentRiskLevel: RiskLevel = {
  level: 'high',
  score: 78,
  lastUpdated: new Date().toISOString(),
};

export const newAlertTemplates: Omit<Alert, 'id' | 'timestamp'>[] = [
  { message: 'New conflict incident reported near supply route', severity: 'warning', type: 'conflict', location: 'South Sudan' },
  { message: 'Weather conditions improving in flood zone', severity: 'info', type: 'weather', location: 'Uganda' },
  { message: 'Armed escort required for convoy departure', severity: 'warning', type: 'security', location: 'Somalia' },
  { message: 'Emergency food supplies en route to affected area', severity: 'info', type: 'logistics', location: 'Ethiopia' },
  { message: 'Explosion reported near humanitarian compound', severity: 'critical', type: 'conflict', location: 'Sudan' },
  { message: 'Road blockade cleared - route now accessible', severity: 'info', type: 'logistics', location: 'Kenya' },
  { message: 'Severe weather advisory issued for coastal regions', severity: 'warning', type: 'weather', location: 'Somalia' },
  { message: 'Aid workers evacuated due to security threat', severity: 'critical', type: 'security', location: 'DRC' },
];
