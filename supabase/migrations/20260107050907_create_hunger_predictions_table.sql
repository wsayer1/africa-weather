/*
  # Create Hunger Predictions Table

  1. New Tables
    - `hunger_predictions`
      - `id` (uuid, primary key)
      - `subcounty_code` (text) - References admin3 boundary
      - `prediction_date` (date) - Date prediction was generated
      - `target_month` (date) - Month being predicted (first day of month)
      - `model_version` (text) - CNN model version
      - `ipc_phase_predicted` (integer) - Predicted IPC phase (1-5)
      - `ipc_phase_probability` (jsonb) - Probability for each phase
      - `confidence_score` (decimal) - Model confidence (0-1)
      - `food_insecure_population` (integer) - Estimated food insecure population
      - `pct_food_insecure` (decimal) - Percentage of population food insecure
      - `risk_level` (text) - 'minimal', 'stressed', 'crisis', 'emergency', 'famine'
      - `primary_drivers` (jsonb) - Array of main contributing factors
      - `feature_importance` (jsonb) - Feature importance scores
      - `actual_ipc_phase` (integer) - Actual IPC phase when available (for validation)
      - `validation_status` (text) - 'pending', 'validated', 'invalidated'
      - `notes` (text) - Additional context or analyst notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - All authenticated users can view predictions
    - Admins and coordinators can manage predictions

  3. Indexes
    - subcounty_code for boundary joins
    - target_month for temporal queries
    - ipc_phase_predicted for risk filtering
    - risk_level for dashboard queries
*/

CREATE TABLE IF NOT EXISTS hunger_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcounty_code text NOT NULL REFERENCES asal_admin3_boundaries(subcounty_code) ON DELETE CASCADE,
  prediction_date date NOT NULL DEFAULT CURRENT_DATE,
  target_month date NOT NULL,
  model_version text NOT NULL DEFAULT 'v1.0',
  ipc_phase_predicted integer NOT NULL CHECK (ipc_phase_predicted >= 1 AND ipc_phase_predicted <= 5),
  ipc_phase_probability jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score decimal(5, 4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  food_insecure_population integer DEFAULT 0,
  pct_food_insecure decimal(5, 2) DEFAULT 0,
  risk_level text NOT NULL CHECK (risk_level IN ('minimal', 'stressed', 'crisis', 'emergency', 'famine')),
  primary_drivers jsonb DEFAULT '[]'::jsonb,
  feature_importance jsonb DEFAULT '{}'::jsonb,
  actual_ipc_phase integer CHECK (actual_ipc_phase IS NULL OR (actual_ipc_phase >= 1 AND actual_ipc_phase <= 5)),
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'invalidated')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subcounty_code, target_month, model_version)
);

CREATE INDEX IF NOT EXISTS idx_predictions_subcounty ON hunger_predictions(subcounty_code);
CREATE INDEX IF NOT EXISTS idx_predictions_target_month ON hunger_predictions(target_month);
CREATE INDEX IF NOT EXISTS idx_predictions_ipc ON hunger_predictions(ipc_phase_predicted);
CREATE INDEX IF NOT EXISTS idx_predictions_risk ON hunger_predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_validation ON hunger_predictions(validation_status);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON hunger_predictions(prediction_date);

ALTER TABLE hunger_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hunger predictions"
  ON hunger_predictions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert predictions"
  ON hunger_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update predictions"
  ON hunger_predictions
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

CREATE POLICY "Only admins can delete predictions"
  ON hunger_predictions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );