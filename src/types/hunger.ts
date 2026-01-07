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
  created_at: string;
  updated_at: string;
}

export interface CNNFeatures {
  id: string;
  subcounty_code: string;
  feature_date: string;
  model_version: string;
  feature_vector: number[];
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
  created_at: string;
  updated_at: string;
}

export interface HungerPrediction {
  id: string;
  subcounty_code: string;
  prediction_date: string;
  target_month: string;
  model_version: string;
  ipc_phase_predicted: 1 | 2 | 3 | 4 | 5;
  ipc_phase_probability: {
    phase_1: number;
    phase_2: number;
    phase_3: number;
    phase_4: number;
    phase_5: number;
  };
  confidence_score: number;
  food_insecure_population: number;
  pct_food_insecure: number;
  risk_level: 'minimal' | 'stressed' | 'crisis' | 'emergency' | 'famine';
  primary_drivers: string[];
  feature_importance: Record<string, number>;
  actual_ipc_phase?: number;
  validation_status: 'pending' | 'validated' | 'invalidated';
  notes?: string;
  created_at: string;
  updated_at: string;
  asal_admin3_boundaries?: ASALBoundary;
}

export interface IPCHistoricalData {
  id: string;
  subcounty_code: string;
  analysis_period_start: string;
  analysis_period_end: string;
  ipc_phase: 1 | 2 | 3 | 4 | 5;
  population_analyzed: number;
  phase1_population: number;
  phase2_population: number;
  phase3_population: number;
  phase4_population: number;
  phase5_population: number;
  contributing_factors: string[];
  data_source: string;
  report_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CHIRPSRasterMetadata {
  id: string;
  data_type: 'dekadal' | 'monthly';
  year: number;
  month: number;
  dekad?: number;
  start_date: string;
  end_date: string;
  resolution_deg: number;
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  min_precip_mm?: number;
  max_precip_mm?: number;
  mean_precip_mm?: number;
  file_path?: string;
  file_size_bytes?: number;
  checksum?: string;
  source_url: string;
  download_status: 'pending' | 'downloading' | 'completed' | 'failed';
  processed: boolean;
  created_at: string;
  updated_at: string;
}

export type IPCPhase = 1 | 2 | 3 | 4 | 5;

export type RiskLevel = 'minimal' | 'stressed' | 'crisis' | 'emergency' | 'famine';

export interface PredictionSummary {
  totalSubcounties: number;
  riskDistribution: Record<RiskLevel, number>;
  averageIPCPhase: number;
  maxIPCPhase: IPCPhase;
  totalFoodInsecure: number;
  highRiskSubcounties: string[];
}

export interface DroughtIndicators {
  spiValue: number;
  spiClassification: 'normal' | 'moderate' | 'severe' | 'extreme';
  consecutiveDryDekads: number;
  percentBelowNormal: number;
  droughtSeverityIndex: number;
}
