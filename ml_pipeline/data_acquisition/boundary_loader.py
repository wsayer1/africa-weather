import json
import logging
from pathlib import Path
from typing import Optional

import geopandas as gpd
import numpy as np
from shapely.geometry import shape, mapping

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import BOUNDARY_DIR, ASAL_COUNTIES, KENYA_ASAL_BBOX
from db.supabase_client import get_supabase_client, insert_admin3_boundary

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KENYA_ADMIN3_URL = "https://data.humdata.org/dataset/cod-ab-ken"


class KenyaBoundaryLoader:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.boundary_dir = BOUNDARY_DIR
        self.asal_county_names = {c["name"].lower() for c in ASAL_COUNTIES}

    def load_shapefile(self, shapefile_path: Path) -> gpd.GeoDataFrame:
        if not shapefile_path.exists():
            raise FileNotFoundError(f"Shapefile not found: {shapefile_path}")

        gdf = gpd.read_file(shapefile_path)

        if gdf.crs is None or gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)

        return gdf

    def filter_asal_counties(self, gdf: gpd.GeoDataFrame, county_column: str = "ADM1_EN") -> gpd.GeoDataFrame:
        gdf["county_lower"] = gdf[county_column].str.lower().str.strip()
        asal_gdf = gdf[gdf["county_lower"].isin(self.asal_county_names)].copy()
        asal_gdf.drop(columns=["county_lower"], inplace=True)
        logger.info(f"Filtered to {len(asal_gdf)} ASAL sub-counties")
        return asal_gdf

    def extract_boundary_data(
        self,
        gdf: gpd.GeoDataFrame,
        county_col: str = "ADM1_EN",
        county_code_col: str = "ADM1_PCODE",
        subcounty_col: str = "ADM2_EN",
        subcounty_code_col: str = "ADM2_PCODE",
    ) -> list[dict]:
        boundaries = []

        for _, row in gdf.iterrows():
            geometry = row.geometry
            centroid = geometry.centroid
            bounds = geometry.bounds

            geojson = mapping(geometry)

            area_km2 = 0
            try:
                gdf_temp = gpd.GeoDataFrame([row], crs="EPSG:4326")
                gdf_projected = gdf_temp.to_crs(epsg=32637)
                area_km2 = gdf_projected.geometry.area.iloc[0] / 1e6
            except Exception as e:
                logger.warning(f"Could not calculate area: {e}")

            boundary_data = {
                "county_name": row[county_col],
                "county_code": row[county_code_col],
                "subcounty_name": row[subcounty_col],
                "subcounty_code": row[subcounty_code_col],
                "centroid_lat": centroid.y,
                "centroid_lng": centroid.x,
                "bbox_min_lat": bounds[1],
                "bbox_max_lat": bounds[3],
                "bbox_min_lng": bounds[0],
                "bbox_max_lng": bounds[2],
                "area_km2": round(area_km2, 2),
                "population": 0,
                "geometry_geojson": geojson,
            }

            boundaries.append(boundary_data)

        return boundaries

    def upload_boundaries_to_db(self, boundaries: list[dict]) -> int:
        uploaded = 0
        for boundary in boundaries:
            try:
                insert_admin3_boundary(boundary)
                uploaded += 1
                logger.debug(f"Uploaded boundary: {boundary['subcounty_name']}")
            except Exception as e:
                logger.error(f"Failed to upload {boundary['subcounty_name']}: {e}")

        logger.info(f"Successfully uploaded {uploaded}/{len(boundaries)} boundaries")
        return uploaded

    def get_boundaries_from_db(self) -> list[dict]:
        result = self.supabase.table("asal_admin3_boundaries").select("*").execute()
        return result.data

    def process_admin3_shapefile(
        self,
        shapefile_path: Path,
        county_col: str = "ADM1_EN",
        county_code_col: str = "ADM1_PCODE",
        subcounty_col: str = "ADM2_EN",
        subcounty_code_col: str = "ADM2_PCODE",
    ) -> int:
        logger.info(f"Loading shapefile: {shapefile_path}")
        gdf = self.load_shapefile(shapefile_path)

        logger.info("Filtering to ASAL counties...")
        asal_gdf = self.filter_asal_counties(gdf, county_column=county_col)

        if len(asal_gdf) == 0:
            logger.warning("No ASAL sub-counties found. Check column names.")
            return 0

        logger.info("Extracting boundary data...")
        boundaries = self.extract_boundary_data(
            asal_gdf, county_col, county_code_col, subcounty_col, subcounty_code_col
        )

        logger.info("Uploading to database...")
        return self.upload_boundaries_to_db(boundaries)

    def create_sample_boundaries(self) -> int:
        sample_boundaries = [
            {
                "county_name": "Turkana",
                "county_code": "KE023",
                "subcounty_name": "Turkana North",
                "subcounty_code": "KE023001",
                "centroid_lat": 4.2,
                "centroid_lng": 35.8,
                "bbox_min_lat": 3.8,
                "bbox_max_lat": 4.6,
                "bbox_min_lng": 35.2,
                "bbox_max_lng": 36.4,
                "area_km2": 12500.0,
                "population": 85000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[35.2, 3.8], [36.4, 3.8], [36.4, 4.6], [35.2, 4.6], [35.2, 3.8]]]
                }
            },
            {
                "county_name": "Turkana",
                "county_code": "KE023",
                "subcounty_name": "Turkana Central",
                "subcounty_code": "KE023002",
                "centroid_lat": 3.5,
                "centroid_lng": 35.9,
                "bbox_min_lat": 3.0,
                "bbox_max_lat": 4.0,
                "bbox_min_lng": 35.4,
                "bbox_max_lng": 36.4,
                "area_km2": 11200.0,
                "population": 72000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[35.4, 3.0], [36.4, 3.0], [36.4, 4.0], [35.4, 4.0], [35.4, 3.0]]]
                }
            },
            {
                "county_name": "Marsabit",
                "county_code": "KE010",
                "subcounty_name": "Moyale",
                "subcounty_code": "KE010001",
                "centroid_lat": 3.5,
                "centroid_lng": 39.0,
                "bbox_min_lat": 3.0,
                "bbox_max_lat": 4.0,
                "bbox_min_lng": 38.5,
                "bbox_max_lng": 39.5,
                "area_km2": 9800.0,
                "population": 45000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[38.5, 3.0], [39.5, 3.0], [39.5, 4.0], [38.5, 4.0], [38.5, 3.0]]]
                }
            },
            {
                "county_name": "Marsabit",
                "county_code": "KE010",
                "subcounty_name": "North Horr",
                "subcounty_code": "KE010002",
                "centroid_lat": 3.3,
                "centroid_lng": 37.0,
                "bbox_min_lat": 2.8,
                "bbox_max_lat": 3.8,
                "bbox_min_lng": 36.5,
                "bbox_max_lng": 37.5,
                "area_km2": 18500.0,
                "population": 32000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[36.5, 2.8], [37.5, 2.8], [37.5, 3.8], [36.5, 3.8], [36.5, 2.8]]]
                }
            },
            {
                "county_name": "Wajir",
                "county_code": "KE046",
                "subcounty_name": "Wajir North",
                "subcounty_code": "KE046001",
                "centroid_lat": 2.8,
                "centroid_lng": 40.0,
                "bbox_min_lat": 2.3,
                "bbox_max_lat": 3.3,
                "bbox_min_lng": 39.5,
                "bbox_max_lng": 40.5,
                "area_km2": 14200.0,
                "population": 58000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[39.5, 2.3], [40.5, 2.3], [40.5, 3.3], [39.5, 3.3], [39.5, 2.3]]]
                }
            },
            {
                "county_name": "Garissa",
                "county_code": "KE007",
                "subcounty_name": "Garissa Township",
                "subcounty_code": "KE007001",
                "centroid_lat": -0.45,
                "centroid_lng": 39.65,
                "bbox_min_lat": -0.8,
                "bbox_max_lat": -0.1,
                "bbox_min_lng": 39.3,
                "bbox_max_lng": 40.0,
                "area_km2": 4800.0,
                "population": 125000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[39.3, -0.8], [40.0, -0.8], [40.0, -0.1], [39.3, -0.1], [39.3, -0.8]]]
                }
            },
            {
                "county_name": "Isiolo",
                "county_code": "KE009",
                "subcounty_name": "Isiolo North",
                "subcounty_code": "KE009001",
                "centroid_lat": 1.5,
                "centroid_lng": 38.5,
                "bbox_min_lat": 1.0,
                "bbox_max_lat": 2.0,
                "bbox_min_lng": 38.0,
                "bbox_max_lng": 39.0,
                "area_km2": 16800.0,
                "population": 48000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[38.0, 1.0], [39.0, 1.0], [39.0, 2.0], [38.0, 2.0], [38.0, 1.0]]]
                }
            },
            {
                "county_name": "Samburu",
                "county_code": "KE025",
                "subcounty_name": "Samburu North",
                "subcounty_code": "KE025001",
                "centroid_lat": 1.8,
                "centroid_lng": 37.0,
                "bbox_min_lat": 1.3,
                "bbox_max_lat": 2.3,
                "bbox_min_lng": 36.5,
                "bbox_max_lng": 37.5,
                "area_km2": 12400.0,
                "population": 35000,
                "geometry_geojson": {
                    "type": "Polygon",
                    "coordinates": [[[36.5, 1.3], [37.5, 1.3], [37.5, 2.3], [36.5, 2.3], [36.5, 1.3]]]
                }
            },
        ]

        return self.upload_boundaries_to_db(sample_boundaries)


if __name__ == "__main__":
    loader = KenyaBoundaryLoader()

    print("Creating sample ASAL boundaries...")
    count = loader.create_sample_boundaries()
    print(f"Created {count} sample boundaries")

    print("\nRetrieving boundaries from database...")
    boundaries = loader.get_boundaries_from_db()
    for b in boundaries[:3]:
        print(f"  - {b['county_name']}: {b['subcounty_name']}")
