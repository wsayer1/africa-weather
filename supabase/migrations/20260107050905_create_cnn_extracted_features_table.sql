/*
  # Create CNN Extracted Features Table

  1. New Tables
    - `cnn_extracted_features`
      - `id` (uuid, primary key)
      - `subcounty_code` (text) - References admin3 boundary
      - `feature_date` (date) - Date the features represent
      - `model_version` (text) - Version of CNN model used
      - `feature_vector` (jsonb) - Full CNN feature vector (128-256 dim)
      - `cumulative_precip_mm` (decimal) - Total precipitation over analysis window
      - `precip_anomaly_pct` (decimal) - Percent deviation from normal
      - `spi_1month` (decimal) - 1-month Standardized Precipitation Index
      - `spi_3month` (decimal) - 3-month Standardized Precipitation Index
      - `spi_6month` (decimal) - 6-month Standardized Precipitation Index
      - `consecutive_dry_dekads` (integer) - Number of consecutive dry periods
      - `rainy_season_onset_anomaly_days` (integer) - Days early/late for rainy season
      - `spatial_cv` (decimal) - Coefficient of variation across subcounty
      - `precip_trend_slope` (decimal) - Precipitation trend slope
      - `pct_below_normal` (decimal) - Percentage of area below normal
      - `drought_severity_index` (decimal) - Composite drought severity (0-1)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can view features
    - System processes can write features

  3. Indexes
    - subcounty_code for boundary joins
    - feature_date for temporal queries
    - model_version for tracking
*/

CREATE TABLE IF NOT EXISTS cnn_extracted_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcounty_code text NOT NULL REFERENCES asal_admin3_boundaries(subcounty_code) ON DELETE CASCADE,
  feature_date date NOT NULL,
  model_version text NOT NULL DEFAULT 'v1.0',
  feature_vector jsonb NOT NULL DEFAULT '[]'::jsonb,
  cumulative_precip_mm decimal(10, 2),
  precip_anomaly_pct decimal(8, 2),
  spi_1month decimal(6, 3),
  spi_3month decimal(6, 3),
  spi_6month decimal(6, 3),
  consecutive_dry_dekads integer DEFAULT 0,
  rainy_season_onset_anomaly_days integer,
  spatial_cv decimal(6, 4),
  precip_trend_slope decimal(10, 6),
  pct_below_normal decimal(5, 2),
  drought_severity_index decimal(5, 4),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subcounty_code, feature_date, model_version)
);

CREATE INDEX IF NOT EXISTS idx_cnn_features_subcounty ON cnn_extracted_features(subcounty_code);
CREATE INDEX IF NOT EXISTS idx_cnn_features_date ON cnn_extracted_features(feature_date);
CREATE INDEX IF NOT EXISTS idx_cnn_features_model ON cnn_extracted_features(model_version);
CREATE INDEX IF NOT EXISTS idx_cnn_features_drought ON cnn_extracted_features(drought_severity_index);

ALTER TABLE cnn_extracted_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view CNN features"
  ON cnn_extracted_features
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert CNN features"
  ON cnn_extracted_features
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update CNN features"
  ON cnn_extracted_features
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Only admins can delete CNN features"
  ON cnn_extracted_features
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );