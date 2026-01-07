/*
  # Create Weather Events Table

  1. New Tables
    - `weather_events`
      - `id` (uuid, primary key)
      - `operation_id` (uuid, references operations)
      - `type` (text) - flood, drought, storm
      - `severity` (integer) - 1 to 5 scale
      - `description` (text) - Event description
      - `latitude` (decimal) - Center latitude
      - `longitude` (decimal) - Center longitude
      - `polygon` (jsonb) - GeoJSON polygon coordinates
      - `affected_population` (integer) - Estimated affected population
      - `precipitation_mm` (decimal) - Recorded precipitation
      - `source` (text) - Data source (e.g., 'open-meteo')
      - `region_code` (text) - Region identifier
      - `active` (boolean) - Whether event is currently active
      - `started_at` (timestamptz) - When event started
      - `ended_at` (timestamptz) - When event ended (nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `weather_events` table
    - All authenticated users can view weather events
    - System/admin can manage weather events

  3. Indexes
    - operation_id for filtering by operation
    - type for filtering by weather type
    - active for filtering active events
    - region_code for location lookups
*/

CREATE TABLE IF NOT EXISTS weather_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES operations(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('flood', 'drought', 'storm')),
  severity integer NOT NULL CHECK (severity >= 1 AND severity <= 5),
  description text NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  polygon jsonb NOT NULL DEFAULT '[]'::jsonb,
  affected_population integer DEFAULT 0,
  precipitation_mm decimal(10, 2) DEFAULT 0,
  source text DEFAULT 'open-meteo',
  region_code text,
  active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weather_events_operation_id ON weather_events(operation_id);
CREATE INDEX IF NOT EXISTS idx_weather_events_type ON weather_events(type);
CREATE INDEX IF NOT EXISTS idx_weather_events_active ON weather_events(active);
CREATE INDEX IF NOT EXISTS idx_weather_events_region_code ON weather_events(region_code);
CREATE INDEX IF NOT EXISTS idx_weather_events_severity ON weather_events(severity);

ALTER TABLE weather_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view weather events"
  ON weather_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert weather events"
  ON weather_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update weather events"
  ON weather_events
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

CREATE POLICY "Only admins can delete weather events"
  ON weather_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
