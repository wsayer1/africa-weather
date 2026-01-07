/*
  # Create ASAL Admin Level 3 Boundaries Table

  1. New Tables
    - `asal_admin3_boundaries`
      - `id` (uuid, primary key)
      - `county_name` (text) - ASAL county name (e.g., Turkana, Marsabit)
      - `county_code` (text) - County administrative code
      - `subcounty_name` (text) - Sub-county (admin3) name
      - `subcounty_code` (text) - Sub-county administrative code
      - `centroid_lat` (decimal) - Centroid latitude
      - `centroid_lng` (decimal) - Centroid longitude
      - `bbox_min_lat` (decimal) - Bounding box minimum latitude
      - `bbox_max_lat` (decimal) - Bounding box maximum latitude
      - `bbox_min_lng` (decimal) - Bounding box minimum longitude
      - `bbox_max_lng` (decimal) - Bounding box maximum longitude
      - `area_km2` (decimal) - Area in square kilometers
      - `population` (integer) - Estimated population
      - `geometry_geojson` (jsonb) - GeoJSON polygon geometry
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - All authenticated users can view boundaries
    - Only admins can modify boundary data

  3. Indexes
    - county_code for filtering by county
    - subcounty_code for lookups
    - Spatial indexes on centroid coordinates
*/

CREATE TABLE IF NOT EXISTS asal_admin3_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_name text NOT NULL,
  county_code text NOT NULL,
  subcounty_name text NOT NULL,
  subcounty_code text NOT NULL UNIQUE,
  centroid_lat decimal(10, 7) NOT NULL,
  centroid_lng decimal(10, 7) NOT NULL,
  bbox_min_lat decimal(10, 7) NOT NULL,
  bbox_max_lat decimal(10, 7) NOT NULL,
  bbox_min_lng decimal(10, 7) NOT NULL,
  bbox_max_lng decimal(10, 7) NOT NULL,
  area_km2 decimal(12, 2) NOT NULL DEFAULT 0,
  population integer DEFAULT 0,
  geometry_geojson jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asal_admin3_county_code ON asal_admin3_boundaries(county_code);
CREATE INDEX IF NOT EXISTS idx_asal_admin3_subcounty_code ON asal_admin3_boundaries(subcounty_code);
CREATE INDEX IF NOT EXISTS idx_asal_admin3_centroid ON asal_admin3_boundaries(centroid_lat, centroid_lng);

ALTER TABLE asal_admin3_boundaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ASAL boundaries"
  ON asal_admin3_boundaries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert ASAL boundaries"
  ON asal_admin3_boundaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update ASAL boundaries"
  ON asal_admin3_boundaries
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

CREATE POLICY "Only admins can delete ASAL boundaries"
  ON asal_admin3_boundaries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );