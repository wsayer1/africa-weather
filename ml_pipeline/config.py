import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
RASTER_DIR = DATA_DIR / "rasters"
PROCESSED_DIR = DATA_DIR / "processed"
MODEL_DIR = BASE_DIR / "models"
BOUNDARY_DIR = DATA_DIR / "boundaries"

for dir_path in [DATA_DIR, RASTER_DIR, PROCESSED_DIR, MODEL_DIR, BOUNDARY_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

CHIRPS_BASE_URL = "https://data.chc.ucsb.edu/products/CHIRPS-2.0"
CHIRPS_MONTHLY_URL = f"{CHIRPS_BASE_URL}/africa_monthly/tifs"
CHIRPS_DEKADAL_URL = f"{CHIRPS_BASE_URL}/africa_dekad/tifs"

KENYA_ASAL_BBOX = {
    "min_lat": -5.0,
    "max_lat": 5.5,
    "min_lng": 33.5,
    "max_lng": 42.0
}

ASAL_COUNTIES = [
    {"name": "Turkana", "code": "023"},
    {"name": "Marsabit", "code": "010"},
    {"name": "Samburu", "code": "025"},
    {"name": "Isiolo", "code": "009"},
    {"name": "Mandera", "code": "009"},
    {"name": "Wajir", "code": "046"},
    {"name": "Garissa", "code": "007"},
    {"name": "Tana River", "code": "004"},
    {"name": "Kilifi", "code": "003"},
    {"name": "Kwale", "code": "002"},
    {"name": "Taita Taveta", "code": "006"},
    {"name": "Makueni", "code": "017"},
    {"name": "Kitui", "code": "015"},
    {"name": "Embu", "code": "014"},
    {"name": "Meru", "code": "012"},
    {"name": "Tharaka Nithi", "code": "013"},
    {"name": "Laikipia", "code": "031"},
    {"name": "Baringo", "code": "030"},
    {"name": "West Pokot", "code": "024"},
    {"name": "Elgeyo Marakwet", "code": "028"},
    {"name": "Narok", "code": "033"},
    {"name": "Kajiado", "code": "034"},
    {"name": "Lamu", "code": "005"},
]

TEMPORAL_CONFIG = {
    "training_start_year": 2015,
    "training_end_year": 2023,
    "inference_lookback_months": 12,
    "sequence_length_dekads": 12,
    "sequence_length_months": 6,
}

CNN_CONFIG = {
    "input_height": 64,
    "input_width": 64,
    "time_steps": 12,
    "channels": 1,
    "feature_dim": 128,
    "dropout_rate": 0.4,
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 100,
    "early_stopping_patience": 10,
}

NORMALIZATION_CONFIG = {
    "method": "minmax",
    "precip_min": 0.0,
    "precip_max": 500.0,
}

DROUGHT_THRESHOLDS = {
    "spi_moderate": -1.0,
    "spi_severe": -1.5,
    "spi_extreme": -2.0,
    "dry_dekad_mm": 5.0,
    "percent_normal_drought": 75.0,
}

IPC_PHASE_MAPPING = {
    1: "minimal",
    2: "stressed",
    3: "crisis",
    4: "emergency",
    5: "famine",
}
