/*
  # Create IPC Historical Data Table

  1. New Tables
    - `ipc_historical_data`
      - `id` (uuid, primary key)
      - `subcounty_code` (text) - References admin3 boundary
      - `analysis_period_start` (date) - Start of IPC analysis period
      - `analysis_period_end` (date) - End of IPC analysis period
      - `ipc_phase` (integer) - Official IPC classification (1-5)
      - `population_analyzed` (integer) - Total population analyzed
      - `phase1_population` (integer) - Population in Phase 1 (Minimal)
      - `phase2_population` (integer) - Population in Phase 2 (Stressed)
      - `phase3_population` (integer) - Population in Phase 3 (Crisis)
      - `phase4_population` (integer) - Population in Phase 4 (Emergency)
      - `phase5_population` (integer) - Population in Phase 5 (Famine)
      - `contributing_factors` (jsonb) - Array of contributing factors
      - `data_source` (text) - Source of IPC data (e.g., 'IPC TWG', 'FEWS NET')
      - `report_url` (text) - Link to original report
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Purpose
    - Store historical IPC classifications for model training and validation
    - Enable comparison between predictions and actual outcomes

  3. Security
    - Enable RLS
    - All authenticated users can view historical data
    - Admins can manage historical data
*/

CREATE TABLE IF NOT EXISTS ipc_historical_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcounty_code text NOT NULL REFERENCES asal_admin3_boundaries(subcounty_code) ON DELETE CASCADE,
  analysis_period_start date NOT NULL,
  analysis_period_end date NOT NULL,
  ipc_phase integer NOT NULL CHECK (ipc_phase >= 1 AND ipc_phase <= 5),
  population_analyzed integer DEFAULT 0,
  phase1_population integer DEFAULT 0,
  phase2_population integer DEFAULT 0,
  phase3_population integer DEFAULT 0,
  phase4_population integer DEFAULT 0,
  phase5_population integer DEFAULT 0,
  contributing_factors jsonb DEFAULT '[]'::jsonb,
  data_source text NOT NULL DEFAULT 'IPC TWG',
  report_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subcounty_code, analysis_period_start, analysis_period_end)
);

CREATE INDEX IF NOT EXISTS idx_ipc_historical_subcounty ON ipc_historical_data(subcounty_code);
CREATE INDEX IF NOT EXISTS idx_ipc_historical_period ON ipc_historical_data(analysis_period_start, analysis_period_end);
CREATE INDEX IF NOT EXISTS idx_ipc_historical_phase ON ipc_historical_data(ipc_phase);

ALTER TABLE ipc_historical_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view IPC historical data"
  ON ipc_historical_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert IPC historical data"
  ON ipc_historical_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update IPC historical data"
  ON ipc_historical_data
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete IPC historical data"
  ON ipc_historical_data
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );