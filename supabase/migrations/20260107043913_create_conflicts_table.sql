/*
  # Create Conflicts Table

  1. New Tables
    - `conflicts`
      - `id` (uuid, primary key)
      - `operation_id` (uuid, references operations)
      - `region_id` (uuid, references regions, nullable)
      - `type` (text) - active_conflict, roadblock, checkpoint, danger_zone
      - `severity` (text) - low, medium, high, critical
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `radius` (integer) - Affected radius in meters
      - `description` (text)
      - `reported_by` (uuid, references user_profiles)
      - `verified` (boolean)
      - `active` (boolean)
      - `expires_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `conflicts` table
    - All authenticated users can view conflicts
    - Coordinators and admins can manage conflicts
    - Drivers can report conflicts
*/

CREATE TABLE IF NOT EXISTS conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES operations(id) ON DELETE CASCADE NOT NULL,
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('active_conflict', 'roadblock', 'checkpoint', 'danger_zone', 'natural_hazard', 'infrastructure')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  radius integer DEFAULT 500,
  description text,
  reported_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  verified boolean DEFAULT false,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conflicts_operation_id ON conflicts(operation_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_region_id ON conflicts(region_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_type ON conflicts(type);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON conflicts(severity);
CREATE INDEX IF NOT EXISTS idx_conflicts_active ON conflicts(active);
CREATE INDEX IF NOT EXISTS idx_conflicts_location ON conflicts(latitude, longitude);

ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conflicts"
  ON conflicts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert conflicts"
  ON conflicts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Drivers can report conflicts"
  ON conflicts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'driver'
    )
    AND verified = false
  );

CREATE POLICY "Admins and coordinators can update conflicts"
  ON conflicts
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

CREATE POLICY "Only admins can delete conflicts"
  ON conflicts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );