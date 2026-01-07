/*
  # Create CHIRPS Raster Metadata Table

  1. New Tables
    - `chirps_raster_metadata`
      - `id` (uuid, primary key)
      - `data_type` (text) - 'dekadal' or 'monthly'
      - `year` (integer) - Year of the data
      - `month` (integer) - Month (1-12)
      - `dekad` (integer) - Dekad number (1, 2, or 3 within month, nullable for monthly)
      - `start_date` (date) - Start date of the period
      - `end_date` (date) - End date of the period
      - `resolution_deg` (decimal) - Spatial resolution in degrees
      - `min_lat` (decimal) - Minimum latitude of extent
      - `max_lat` (decimal) - Maximum latitude of extent
      - `min_lng` (decimal) - Minimum longitude of extent
      - `max_lng` (decimal) - Maximum longitude of extent
      - `min_precip_mm` (decimal) - Minimum precipitation in dataset
      - `max_precip_mm` (decimal) - Maximum precipitation in dataset
      - `mean_precip_mm` (decimal) - Mean precipitation in dataset
      - `file_path` (text) - Path to stored raster file
      - `file_size_bytes` (bigint) - File size
      - `checksum` (text) - MD5 checksum for validation
      - `source_url` (text) - Original download URL
      - `download_status` (text) - 'pending', 'downloading', 'completed', 'failed'
      - `processed` (boolean) - Whether preprocessing is complete
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can view metadata
    - Admins and coordinators can manage metadata

  3. Indexes
    - Temporal indexes for date-based queries
    - Status index for pipeline monitoring
*/

CREATE TABLE IF NOT EXISTS chirps_raster_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type text NOT NULL CHECK (data_type IN ('dekadal', 'monthly')),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  dekad integer CHECK (dekad IS NULL OR (dekad >= 1 AND dekad <= 3)),
  start_date date NOT NULL,
  end_date date NOT NULL,
  resolution_deg decimal(6, 4) NOT NULL DEFAULT 0.05,
  min_lat decimal(10, 7) NOT NULL,
  max_lat decimal(10, 7) NOT NULL,
  min_lng decimal(10, 7) NOT NULL,
  max_lng decimal(10, 7) NOT NULL,
  min_precip_mm decimal(10, 2),
  max_precip_mm decimal(10, 2),
  mean_precip_mm decimal(10, 2),
  file_path text,
  file_size_bytes bigint,
  checksum text,
  source_url text NOT NULL,
  download_status text NOT NULL DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(data_type, year, month, dekad)
);

CREATE INDEX IF NOT EXISTS idx_chirps_metadata_dates ON chirps_raster_metadata(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_chirps_metadata_year_month ON chirps_raster_metadata(year, month);
CREATE INDEX IF NOT EXISTS idx_chirps_metadata_status ON chirps_raster_metadata(download_status);
CREATE INDEX IF NOT EXISTS idx_chirps_metadata_processed ON chirps_raster_metadata(processed);

ALTER TABLE chirps_raster_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view CHIRPS metadata"
  ON chirps_raster_metadata
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and coordinators can insert CHIRPS metadata"
  ON chirps_raster_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update CHIRPS metadata"
  ON chirps_raster_metadata
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

CREATE POLICY "Only admins can delete CHIRPS metadata"
  ON chirps_raster_metadata
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );