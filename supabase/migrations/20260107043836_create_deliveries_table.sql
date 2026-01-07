/*
  # Create Deliveries Table

  1. New Tables
    - `deliveries`
      - `id` (uuid, primary key)
      - `operation_id` (uuid, references operations)
      - `region_id` (uuid, references regions) - Target region for tracking
      - `vehicle_id` (uuid, references vehicles)
      - `status` (text) - pending, in_transit, delivered, failed
      - `priority` (text) - low, medium, high, critical
      - `cargo_type` (text) - food, medical, water, shelter, equipment
      - `cargo_weight` (integer) - Weight in kg
      - `origin_latitude` (decimal)
      - `origin_longitude` (decimal)
      - `destination_latitude` (decimal)
      - `destination_longitude` (decimal)
      - `destination_name` (text)
      - `eta` (timestamptz) - Estimated arrival
      - `delivered_at` (timestamptz) - Actual delivery time
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `deliveries` table
    - All authenticated users can view deliveries
    - Coordinators can manage deliveries
    - Drivers can update delivery status
*/

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES operations(id) ON DELETE CASCADE NOT NULL,
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'failed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  cargo_type text NOT NULL CHECK (cargo_type IN ('food', 'medical', 'water', 'shelter', 'equipment', 'mixed')),
  cargo_weight integer DEFAULT 0,
  origin_latitude decimal(10, 7) NOT NULL,
  origin_longitude decimal(10, 7) NOT NULL,
  destination_latitude decimal(10, 7) NOT NULL,
  destination_longitude decimal(10, 7) NOT NULL,
  destination_name text NOT NULL,
  eta timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_operation_id ON deliveries(operation_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_region_id ON deliveries(region_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_vehicle_id ON deliveries(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_priority ON deliveries(priority);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deliveries"
  ON deliveries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert deliveries"
  ON deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update deliveries"
  ON deliveries
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

CREATE POLICY "Drivers can update assigned delivery status"
  ON deliveries
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

CREATE POLICY "Only admins can delete deliveries"
  ON deliveries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE OR REPLACE VIEW delivery_stats_by_region AS
SELECT 
  r.id AS region_id,
  r.name AS region_name,
  r.operation_id,
  COUNT(d.id) AS total_deliveries,
  COUNT(d.id) FILTER (WHERE d.status = 'delivered') AS completed_deliveries,
  COUNT(d.id) FILTER (WHERE d.status = 'in_transit') AS in_transit_deliveries,
  COUNT(d.id) FILTER (WHERE d.status = 'pending') AS pending_deliveries,
  COUNT(d.id) FILTER (WHERE d.status = 'failed') AS failed_deliveries,
  COALESCE(SUM(d.cargo_weight) FILTER (WHERE d.status = 'delivered'), 0) AS total_weight_delivered,
  COALESCE(SUM(d.cargo_weight) FILTER (WHERE d.status IN ('pending', 'in_transit')), 0) AS total_weight_pending
FROM regions r
LEFT JOIN deliveries d ON r.id = d.region_id
GROUP BY r.id, r.name, r.operation_id;