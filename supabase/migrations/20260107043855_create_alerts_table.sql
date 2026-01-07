/*
  # Create Alerts Table

  1. New Tables
    - `alerts`
      - `id` (uuid, primary key)
      - `operation_id` (uuid, references operations)
      - `region_id` (uuid, references regions, nullable)
      - `vehicle_id` (uuid, references vehicles, nullable)
      - `type` (text) - route_blocked, weather, security, vehicle, medical, supply
      - `severity` (text) - info, warning, critical
      - `title` (text)
      - `message` (text)
      - `latitude` (decimal, nullable)
      - `longitude` (decimal, nullable)
      - `acknowledged` (boolean)
      - `acknowledged_by` (uuid, references user_profiles)
      - `acknowledged_at` (timestamptz)
      - `resolved` (boolean)
      - `resolved_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `alerts` table
    - All authenticated users can view alerts
    - Coordinators and admins can create/update alerts
    - Drivers can acknowledge alerts
*/

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES operations(id) ON DELETE CASCADE NOT NULL,
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('route_blocked', 'weather', 'security', 'vehicle', 'medical', 'supply', 'communication')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  latitude decimal(10, 7),
  longitude decimal(10, 7),
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_operation_id ON alerts(operation_id);
CREATE INDEX IF NOT EXISTS idx_alerts_region_id ON alerts(region_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update alerts"
  ON alerts
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

CREATE POLICY "Drivers can acknowledge alerts for their vehicle"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN user_profiles up ON v.driver_id = up.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN user_profiles up ON v.driver_id = up.id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can delete alerts"
  ON alerts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );