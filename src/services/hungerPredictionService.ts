import { supabase } from '../lib/supabase';

export interface ASALBoundary {
  id: string;
  county_name: string;
  county_code: string;
  subcounty_name: string;
  subcounty_code: string;
  centroid_lat: number;
  centroid_lng: number;
  bbox_min_lat: number;
  bbox_max_lat: number;
  bbox_min_lng: number;
  bbox_max_lng: number;
  area_km2: number;
  population: number;
  geometry_geojson: GeoJSON.Polygon;
}

export interface CNNFeatures {
  id: string;
  subcounty_code: string;
  feature_date: string;
  model_version: string;
  cumulative_precip_mm: number;
  precip_anomaly_pct: number;
  spi_1month: number;
  spi_3month: number;
  spi_6month: number;
  consecutive_dry_dekads: number;
  rainy_season_onset_anomaly_days: number;
  spatial_cv: number;
  precip_trend_slope: number;
  pct_below_normal: number;
  drought_severity_index: number;
}

export interface HungerPrediction {
  id: string;
  subcounty_code: string;
  prediction_date: string;
  target_month: string;
  model_version: string;
  ipc_phase_predicted: 1 | 2 | 3 | 4 | 5;
  ipc_phase_probability: Record<string, number>;
  confidence_score: number;
  food_insecure_population: number;
  pct_food_insecure: number;
  risk_level: 'minimal' | 'stressed' | 'crisis' | 'emergency' | 'famine';
  primary_drivers: string[];
  feature_importance: Record<string, number>;
  actual_ipc_phase?: number;
  validation_status: 'pending' | 'validated' | 'invalidated';
  asal_admin3_boundaries?: ASALBoundary;
}

export interface PredictionSummary {
  totalSubcounties: number;
  riskDistribution: Record<string, number>;
  averageIPCPhase: number;
  maxIPCPhase: number;
  totalFoodInsecure: number;
  highRiskSubcounties: string[];
}

export const IPC_PHASE_COLORS: Record<number, string> = {
  1: '#c6ffc1',
  2: '#ffe66d',
  3: '#ff9f43',
  4: '#ff6b6b',
  5: '#6c0f0f',
};

export const IPC_PHASE_LABELS: Record<number, string> = {
  1: 'Minimal',
  2: 'Stressed',
  3: 'Crisis',
  4: 'Emergency',
  5: 'Famine',
};

export async function getASALBoundaries(): Promise<ASALBoundary[]> {
  const { data, error } = await supabase
    .from('asal_admin3_boundaries')
    .select('*')
    .order('county_name', { ascending: true });

  if (error) {
    console.error('Error fetching ASAL boundaries:', error);
    return [];
  }

  return data || [];
}

export async function getLatestPredictions(): Promise<HungerPrediction[]> {
  const { data, error } = await supabase
    .from('hunger_predictions')
    .select('*, asal_admin3_boundaries(*)')
    .order('target_month', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching predictions:', error);
    return [];
  }

  return data || [];
}

export async function getPredictionsByMonth(
  targetMonth: string
): Promise<HungerPrediction[]> {
  const { data, error } = await supabase
    .from('hunger_predictions')
    .select('*, asal_admin3_boundaries(*)')
    .eq('target_month', targetMonth)
    .order('ipc_phase_predicted', { ascending: false });

  if (error) {
    console.error('Error fetching predictions by month:', error);
    return [];
  }

  return data || [];
}

export async function getPredictionsByRiskLevel(
  riskLevel: HungerPrediction['risk_level']
): Promise<HungerPrediction[]> {
  const { data, error } = await supabase
    .from('hunger_predictions')
    .select('*, asal_admin3_boundaries(*)')
    .eq('risk_level', riskLevel)
    .order('target_month', { ascending: false });

  if (error) {
    console.error('Error fetching predictions by risk level:', error);
    return [];
  }

  return data || [];
}

export async function getPredictionForSubcounty(
  subcountyCode: string
): Promise<HungerPrediction | null> {
  const { data, error } = await supabase
    .from('hunger_predictions')
    .select('*, asal_admin3_boundaries(*)')
    .eq('subcounty_code', subcountyCode)
    .order('target_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching prediction for subcounty:', error);
    return null;
  }

  return data;
}

export async function getCNNFeatures(
  subcountyCode: string,
  startDate?: string,
  endDate?: string
): Promise<CNNFeatures[]> {
  let query = supabase
    .from('cnn_extracted_features')
    .select('*')
    .eq('subcounty_code', subcountyCode);

  if (startDate) {
    query = query.gte('feature_date', startDate);
  }
  if (endDate) {
    query = query.lte('feature_date', endDate);
  }

  const { data, error } = await query.order('feature_date', { ascending: false });

  if (error) {
    console.error('Error fetching CNN features:', error);
    return [];
  }

  return data || [];
}

export async function getPredictionHistory(
  subcountyCode: string,
  limit: number = 12
): Promise<HungerPrediction[]> {
  const { data, error } = await supabase
    .from('hunger_predictions')
    .select('*')
    .eq('subcounty_code', subcountyCode)
    .order('target_month', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching prediction history:', error);
    return [];
  }

  return data || [];
}

export function calculatePredictionSummary(
  predictions: HungerPrediction[]
): PredictionSummary {
  if (predictions.length === 0) {
    return {
      totalSubcounties: 0,
      riskDistribution: {},
      averageIPCPhase: 0,
      maxIPCPhase: 0,
      totalFoodInsecure: 0,
      highRiskSubcounties: [],
    };
  }

  const riskDistribution: Record<string, number> = {};
  let totalPhase = 0;
  let maxPhase = 0;
  let totalFoodInsecure = 0;
  const highRiskSubcounties: string[] = [];

  for (const prediction of predictions) {
    const risk = prediction.risk_level;
    riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;

    totalPhase += prediction.ipc_phase_predicted;
    maxPhase = Math.max(maxPhase, prediction.ipc_phase_predicted);
    totalFoodInsecure += prediction.food_insecure_population;

    if (prediction.ipc_phase_predicted >= 3) {
      highRiskSubcounties.push(prediction.subcounty_code);
    }
  }

  return {
    totalSubcounties: predictions.length,
    riskDistribution,
    averageIPCPhase: Math.round((totalPhase / predictions.length) * 100) / 100,
    maxIPCPhase: maxPhase,
    totalFoodInsecure,
    highRiskSubcounties,
  };
}

export function getIPCPhaseColor(phase: number): string {
  return IPC_PHASE_COLORS[phase] || '#cccccc';
}

export function getIPCPhaseLabel(phase: number): string {
  return IPC_PHASE_LABELS[phase] || 'Unknown';
}

export function getRiskLevelColor(riskLevel: HungerPrediction['risk_level']): string {
  const colorMap: Record<string, string> = {
    minimal: '#c6ffc1',
    stressed: '#ffe66d',
    crisis: '#ff9f43',
    emergency: '#ff6b6b',
    famine: '#6c0f0f',
  };
  return colorMap[riskLevel] || '#cccccc';
}

export function formatDriverLabel(driver: string): string {
  return driver
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function getAvailablePredictionMonths(): Promise<string[]> {
  const { data, error } = await supabase
    .from('hunger_predictions')
    .select('target_month')
    .order('target_month', { ascending: false });

  if (error) {
    console.error('Error fetching available months:', error);
    return [];
  }

  const uniqueMonths = [...new Set(data?.map((d) => d.target_month) || [])];
  return uniqueMonths;
}
