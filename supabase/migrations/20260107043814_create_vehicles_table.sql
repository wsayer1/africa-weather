/*
  # Create Vehicles Table

  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `operation_id` (uuid, references operations)
      - `call_sign` (text) - Vehicle identifier like "ALPHA-7"
      - `type` (text) - truck, helicopter, boat, drone
      - `status` (text) - active, idle, maintenance, emergency
      - `latitude` (decimal) - Current latitude
      - `longitude` (decimal) - Current longitude
      - `heading` (integer) - Direction in degrees
      - `speed` (decimal) - Current speed in km/h
      - `fuel_level` (integer) - Fuel percentage
      - `cargo_capacity` (integer) - Total capacity in kg
      - `current_load` (integer) - Current load in kg
      - `driver_id` (uuid, references user_profiles) - Assigned driver
      - `last_update` (timestamptz) - Last position update
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `vehicles` table
    - All authenticated users can view vehicles
    - Coordinators can manage all vehicles
    - Drivers can update their assigned vehicles
*/

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES operations(id) ON DELETE CASCADE NOT NULL,
  call_sign text NOT NULL,
  type text NOT NULL DEFAULT 'truck' CHECK (type IN ('truck', 'helicopter', 'boat', 'drone')),
  status text NOT NULL DEFAULT 'idle' CHECK (status IN ('active', 'idle', 'maintenance', 'emergency')),
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  heading integer DEFAULT 0 CHECK (heading >= 0 AND heading < 360),
  speed decimal(6, 2) DEFAULT 0,
  fuel_level integer DEFAULT 100 CHECK (fuel_level >= 0 AND fuel_level <= 100),
  cargo_capacity integer DEFAULT 0,
  current_load integer DEFAULT 0,
  driver_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(operation_id, call_sign)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_operation_id ON vehicles(operation_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update any vehicle"
  ON vehicles
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

CREATE POLICY "Drivers can update their assigned vehicle"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    driver_id = (
      SELECT id FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    driver_id = (
      SELECT id FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can delete vehicles"
  ON vehicles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );