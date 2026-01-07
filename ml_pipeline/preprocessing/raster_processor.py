import logging
from pathlib import Path
from datetime import date, datetime
from typing import Optional

import numpy as np
import rasterio
from rasterio.mask import mask
from rasterio.warp import reproject, Resampling, calculate_default_transform
from scipy import ndimage
from shapely.geometry import shape, box

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import (
    RASTER_DIR,
    PROCESSED_DIR,
    KENYA_ASAL_BBOX,
    CNN_CONFIG,
    NORMALIZATION_CONFIG,
)
from db.supabase_client import get_supabase_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RasterProcessor:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.processed_dir = PROCESSED_DIR
        self.target_shape = (CNN_CONFIG["input_height"], CNN_CONFIG["input_width"])
        self.bbox = KENYA_ASAL_BBOX

    def clip_to_kenya_asal(
        self, input_path: Path, output_path: Optional[Path] = None
    ) -> np.ndarray:
        bbox_geom = box(
            self.bbox["min_lng"],
            self.bbox["min_lat"],
            self.bbox["max_lng"],
            self.bbox["max_lat"],
        )

        with rasterio.open(input_path) as src:
            out_image, out_transform = mask(
                src, [bbox_geom], crop=True, nodata=-9999
            )
            out_meta = src.meta.copy()

            out_meta.update({
                "driver": "GTiff",
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform,
                "nodata": -9999,
            })

            if output_path:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with rasterio.open(output_path, "w", **out_meta) as dst:
                    dst.write(out_image)

            return out_image[0]

    def resample_to_target_shape(
        self, data: np.ndarray, target_shape: Optional[tuple] = None
    ) -> np.ndarray:
        if target_shape is None:
            target_shape = self.target_shape

        if data.shape == target_shape:
            return data

        zoom_factors = (
            target_shape[0] / data.shape[0],
            target_shape[1] / data.shape[1],
        )

        resampled = ndimage.zoom(data, zoom_factors, order=1)

        return resampled

    def normalize_precipitation(
        self,
        data: np.ndarray,
        method: str = "minmax",
        min_val: Optional[float] = None,
        max_val: Optional[float] = None,
    ) -> np.ndarray:
        nodata_mask = data < 0

        if method == "minmax":
            if min_val is None:
                min_val = NORMALIZATION_CONFIG["precip_min"]
            if max_val is None:
                max_val = NORMALIZATION_CONFIG["precip_max"]

            normalized = (data - min_val) / (max_val - min_val)
            normalized = np.clip(normalized, 0, 1)

        elif method == "zscore":
            valid_data = data[~nodata_mask]
            if len(valid_data) > 0:
                mean_val = np.mean(valid_data)
                std_val = np.std(valid_data)
                if std_val > 0:
                    normalized = (data - mean_val) / std_val
                else:
                    normalized = np.zeros_like(data)
            else:
                normalized = np.zeros_like(data)

        elif method == "percentile":
            valid_data = data[~nodata_mask]
            if len(valid_data) > 0:
                p5 = np.percentile(valid_data, 5)
                p95 = np.percentile(valid_data, 95)
                normalized = (data - p5) / (p95 - p5)
                normalized = np.clip(normalized, 0, 1)
            else:
                normalized = np.zeros_like(data)

        else:
            raise ValueError(f"Unknown normalization method: {method}")

        normalized[nodata_mask] = 0

        return normalized

    def fill_missing_data(
        self, data: np.ndarray, method: str = "nearest"
    ) -> np.ndarray:
        nodata_mask = (data < 0) | np.isnan(data)

        if not np.any(nodata_mask):
            return data

        filled = data.copy()

        if method == "nearest":
            valid_mask = ~nodata_mask
            if np.any(valid_mask):
                indices = ndimage.distance_transform_edt(
                    nodata_mask, return_distances=False, return_indices=True
                )
                filled = data[tuple(indices)]

        elif method == "mean":
            valid_data = data[~nodata_mask]
            if len(valid_data) > 0:
                mean_val = np.mean(valid_data)
                filled[nodata_mask] = mean_val
            else:
                filled[nodata_mask] = 0

        elif method == "zero":
            filled[nodata_mask] = 0

        return filled

    def process_single_raster(
        self,
        input_path: Path,
        normalize: bool = True,
        fill_missing: bool = True,
        resample: bool = True,
    ) -> np.ndarray:
        logger.debug(f"Processing raster: {input_path}")

        clipped = self.clip_to_kenya_asal(input_path)

        if fill_missing:
            clipped = self.fill_missing_data(clipped, method="nearest")

        if normalize:
            clipped = self.normalize_precipitation(
                clipped, method=NORMALIZATION_CONFIG["method"]
            )

        if resample:
            clipped = self.resample_to_target_shape(clipped)

        return clipped

    def create_temporal_sequence(
        self,
        raster_paths: list[Path],
        sequence_length: int = 12,
    ) -> np.ndarray:
        if len(raster_paths) < sequence_length:
            logger.warning(
                f"Not enough rasters ({len(raster_paths)}) for sequence length {sequence_length}"
            )
            return None

        processed_frames = []

        for path in raster_paths[-sequence_length:]:
            frame = self.process_single_raster(path)
            processed_frames.append(frame)

        sequence = np.stack(processed_frames, axis=0)

        sequence = np.expand_dims(sequence, axis=-1)

        return sequence

    def get_available_rasters(
        self,
        data_type: str = "monthly",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[dict]:
        query = (
            self.supabase.table("chirps_raster_metadata")
            .select("*")
            .eq("data_type", data_type)
            .eq("download_status", "completed")
        )

        if start_date:
            query = query.gte("start_date", start_date.isoformat())
        if end_date:
            query = query.lte("end_date", end_date.isoformat())

        result = query.order("start_date").execute()
        return result.data

    def compute_statistics(self, data: np.ndarray) -> dict:
        valid_data = data[data >= 0]

        if len(valid_data) == 0:
            return {
                "min": None,
                "max": None,
                "mean": None,
                "std": None,
                "median": None,
                "pct_missing": 100.0,
            }

        return {
            "min": float(np.min(valid_data)),
            "max": float(np.max(valid_data)),
            "mean": float(np.mean(valid_data)),
            "std": float(np.std(valid_data)),
            "median": float(np.median(valid_data)),
            "pct_missing": float(np.sum(data < 0) / data.size * 100),
        }

    def save_processed_sequence(
        self,
        sequence: np.ndarray,
        output_path: Path,
        metadata: dict,
    ):
        output_path.parent.mkdir(parents=True, exist_ok=True)

        np.save(output_path, sequence)

        meta_path = output_path.with_suffix(".json")
        import json
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2, default=str)

        logger.info(f"Saved processed sequence to {output_path}")

    def batch_process_for_training(
        self,
        data_type: str = "monthly",
        sequence_length: int = 12,
        stride: int = 1,
    ) -> list[tuple[np.ndarray, dict]]:
        rasters = self.get_available_rasters(data_type=data_type)

        if len(rasters) < sequence_length:
            logger.error(f"Not enough rasters for training: {len(rasters)}")
            return []

        raster_paths = [Path(r["file_path"]) for r in rasters if r["file_path"]]
        raster_paths = [p for p in raster_paths if p.exists()]

        sequences = []

        for i in range(0, len(raster_paths) - sequence_length + 1, stride):
            seq_paths = raster_paths[i : i + sequence_length]
            seq_rasters = rasters[i : i + sequence_length]

            sequence = self.create_temporal_sequence(seq_paths, sequence_length)

            if sequence is not None:
                metadata = {
                    "start_date": seq_rasters[0]["start_date"],
                    "end_date": seq_rasters[-1]["end_date"],
                    "data_type": data_type,
                    "sequence_length": sequence_length,
                    "shape": list(sequence.shape),
                }
                sequences.append((sequence, metadata))

        logger.info(f"Created {len(sequences)} sequences for training")
        return sequences


class SPICalculator:
    def __init__(self):
        self.historical_data = {}

    def fit_historical(
        self, monthly_precip: np.ndarray, years: list[int], months: list[int]
    ):
        for i, (year, month) in enumerate(zip(years, months)):
            if month not in self.historical_data:
                self.historical_data[month] = []
            self.historical_data[month].append(monthly_precip[i])

        for month in self.historical_data:
            self.historical_data[month] = np.array(self.historical_data[month])

    def calculate_spi(
        self, precip_value: float, month: int, accumulation_months: int = 1
    ) -> float:
        if month not in self.historical_data:
            return 0.0

        historical = self.historical_data[month]

        if len(historical) < 30:
            mean_val = np.mean(historical)
            std_val = np.std(historical)
            if std_val > 0:
                return (precip_value - mean_val) / std_val
            return 0.0

        from scipy import stats

        try:
            params = stats.gamma.fit(historical[historical > 0], floc=0)
            prob = stats.gamma.cdf(precip_value, *params)
            spi = stats.norm.ppf(prob)
            return float(np.clip(spi, -3, 3))
        except Exception:
            mean_val = np.mean(historical)
            std_val = np.std(historical)
            if std_val > 0:
                return (precip_value - mean_val) / std_val
            return 0.0


if __name__ == "__main__":
    processor = RasterProcessor()

    print("Raster processor initialized")
    print(f"Target shape: {processor.target_shape}")
    print(f"Bounding box: {processor.bbox}")

    sample_data = np.random.rand(100, 100) * 200
    sample_data[10:20, 10:20] = -9999

    print("\nTesting normalization...")
    normalized = processor.normalize_precipitation(sample_data)
    print(f"Normalized range: [{normalized.min():.3f}, {normalized.max():.3f}]")

    print("\nTesting missing data filling...")
    filled = processor.fill_missing_data(sample_data)
    print(f"Missing values after fill: {np.sum(filled < 0)}")

    print("\nTesting resampling...")
    resampled = processor.resample_to_target_shape(sample_data)
    print(f"Resampled shape: {resampled.shape}")
