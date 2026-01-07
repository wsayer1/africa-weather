import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
from scipy import stats

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import DROUGHT_THRESHOLDS
from db.supabase_client import get_supabase_client, insert_cnn_features

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureCalculator:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.drought_thresholds = DROUGHT_THRESHOLDS

    def calculate_cumulative_precipitation(
        self, precip_series: np.ndarray, window_size: int = 3
    ) -> float:
        if len(precip_series) < window_size:
            return float(np.sum(precip_series))
        return float(np.sum(precip_series[-window_size:]))

    def calculate_precipitation_anomaly(
        self,
        current_precip: float,
        historical_mean: float,
    ) -> float:
        if historical_mean <= 0:
            return 0.0
        return ((current_precip - historical_mean) / historical_mean) * 100

    def calculate_spi(
        self,
        precip_value: float,
        historical_values: np.ndarray,
    ) -> float:
        if len(historical_values) < 10:
            return 0.0

        valid_values = historical_values[historical_values > 0]
        if len(valid_values) < 10:
            return 0.0

        try:
            params = stats.gamma.fit(valid_values, floc=0)
            prob = stats.gamma.cdf(max(precip_value, 0.001), *params)
            prob = max(0.001, min(0.999, prob))
            spi = stats.norm.ppf(prob)
            return float(np.clip(spi, -3, 3))
        except Exception:
            mean_val = np.mean(valid_values)
            std_val = np.std(valid_values)
            if std_val > 0:
                return float(np.clip((precip_value - mean_val) / std_val, -3, 3))
            return 0.0

    def count_consecutive_dry_periods(
        self,
        precip_series: np.ndarray,
        threshold_mm: float = None,
    ) -> int:
        if threshold_mm is None:
            threshold_mm = self.drought_thresholds["dry_dekad_mm"]

        dry_periods = precip_series < threshold_mm

        count = 0
        for i in range(len(dry_periods) - 1, -1, -1):
            if dry_periods[i]:
                count += 1
            else:
                break

        return count

    def calculate_rainy_season_anomaly(
        self,
        precip_series: np.ndarray,
        onset_threshold_mm: float = 20.0,
        expected_onset_index: int = 3,
    ) -> int:
        for i, precip in enumerate(precip_series):
            if precip >= onset_threshold_mm:
                return i - expected_onset_index

        return len(precip_series) - expected_onset_index

    def calculate_spatial_coefficient_of_variation(
        self, spatial_precip: np.ndarray
    ) -> float:
        valid_data = spatial_precip[spatial_precip >= 0]
        if len(valid_data) == 0:
            return 0.0

        mean_val = np.mean(valid_data)
        if mean_val <= 0:
            return 0.0

        std_val = np.std(valid_data)
        return float(std_val / mean_val)

    def calculate_precipitation_trend(
        self, precip_series: np.ndarray
    ) -> float:
        if len(precip_series) < 3:
            return 0.0

        x = np.arange(len(precip_series))
        try:
            slope, _, _, _, _ = stats.linregress(x, precip_series)
            return float(slope)
        except Exception:
            return 0.0

    def calculate_percent_below_normal(
        self,
        spatial_precip: np.ndarray,
        normal_values: np.ndarray,
        threshold_pct: float = None,
    ) -> float:
        if threshold_pct is None:
            threshold_pct = self.drought_thresholds["percent_normal_drought"]

        valid_mask = (spatial_precip >= 0) & (normal_values > 0)
        if not np.any(valid_mask):
            return 0.0

        pct_normal = (spatial_precip[valid_mask] / normal_values[valid_mask]) * 100
        below_normal = pct_normal < threshold_pct

        return float(np.sum(below_normal) / len(below_normal) * 100)

    def calculate_drought_severity_index(
        self,
        spi_value: float,
        consecutive_dry: int,
        pct_below_normal: float,
    ) -> float:
        spi_score = min(1.0, max(0.0, (-spi_value + 2) / 4))

        dry_score = min(1.0, consecutive_dry / 6)

        below_normal_score = min(1.0, pct_below_normal / 100)

        dsi = (spi_score * 0.4) + (dry_score * 0.3) + (below_normal_score * 0.3)

        return float(np.clip(dsi, 0, 1))

    def extract_features_for_boundary(
        self,
        subcounty_code: str,
        feature_date: date,
        precip_time_series: np.ndarray,
        spatial_precip_current: np.ndarray,
        historical_monthly_precip: dict[int, np.ndarray],
        normal_values: np.ndarray,
        cnn_feature_vector: list[float],
        model_version: str = "v1.0",
    ) -> dict:
        current_month = feature_date.month
        historical_for_month = historical_monthly_precip.get(current_month, np.array([]))

        cumulative_3m = self.calculate_cumulative_precipitation(precip_time_series, 3)
        cumulative_6m = self.calculate_cumulative_precipitation(precip_time_series, 6)

        historical_mean = float(np.mean(historical_for_month)) if len(historical_for_month) > 0 else 0
        anomaly_pct = self.calculate_precipitation_anomaly(
            precip_time_series[-1] if len(precip_time_series) > 0 else 0,
            historical_mean
        )

        spi_1m = self.calculate_spi(
            precip_time_series[-1] if len(precip_time_series) > 0 else 0,
            historical_for_month
        )

        cumulative_3m_series = precip_time_series[-3:] if len(precip_time_series) >= 3 else precip_time_series
        spi_3m = self.calculate_spi(
            float(np.sum(cumulative_3m_series)),
            np.array([np.sum(historical_for_month[i:i+3]) for i in range(len(historical_for_month)-2)])
            if len(historical_for_month) >= 3 else historical_for_month
        )

        cumulative_6m_series = precip_time_series[-6:] if len(precip_time_series) >= 6 else precip_time_series
        spi_6m = self.calculate_spi(
            float(np.sum(cumulative_6m_series)),
            np.array([np.sum(historical_for_month[i:i+6]) for i in range(len(historical_for_month)-5)])
            if len(historical_for_month) >= 6 else historical_for_month
        )

        consecutive_dry = self.count_consecutive_dry_periods(precip_time_series)

        rainy_season_anomaly = self.calculate_rainy_season_anomaly(precip_time_series)

        spatial_cv = self.calculate_spatial_coefficient_of_variation(spatial_precip_current)

        trend_slope = self.calculate_precipitation_trend(precip_time_series)

        pct_below_normal = self.calculate_percent_below_normal(
            spatial_precip_current, normal_values
        )

        drought_severity = self.calculate_drought_severity_index(
            spi_3m, consecutive_dry, pct_below_normal
        )

        features = {
            "subcounty_code": subcounty_code,
            "feature_date": feature_date.isoformat(),
            "model_version": model_version,
            "feature_vector": cnn_feature_vector,
            "cumulative_precip_mm": round(cumulative_6m, 2),
            "precip_anomaly_pct": round(anomaly_pct, 2),
            "spi_1month": round(spi_1m, 3),
            "spi_3month": round(spi_3m, 3),
            "spi_6month": round(spi_6m, 3),
            "consecutive_dry_dekads": consecutive_dry,
            "rainy_season_onset_anomaly_days": rainy_season_anomaly * 10,
            "spatial_cv": round(spatial_cv, 4),
            "precip_trend_slope": round(trend_slope, 6),
            "pct_below_normal": round(pct_below_normal, 2),
            "drought_severity_index": round(drought_severity, 4),
        }

        return features

    def save_features_to_db(self, features: dict) -> dict:
        return insert_cnn_features(features)

    def get_primary_drought_drivers(self, features: dict) -> list[str]:
        drivers = []

        if features.get("spi_3month", 0) < self.drought_thresholds["spi_moderate"]:
            if features["spi_3month"] < self.drought_thresholds["spi_extreme"]:
                drivers.append("extreme_precipitation_deficit")
            elif features["spi_3month"] < self.drought_thresholds["spi_severe"]:
                drivers.append("severe_precipitation_deficit")
            else:
                drivers.append("moderate_precipitation_deficit")

        if features.get("consecutive_dry_dekads", 0) >= 3:
            drivers.append("prolonged_dry_spell")

        if features.get("pct_below_normal", 0) > 50:
            drivers.append("widespread_below_normal_rainfall")

        if features.get("precip_trend_slope", 0) < -5:
            drivers.append("declining_rainfall_trend")

        if features.get("rainy_season_onset_anomaly_days", 0) > 20:
            drivers.append("delayed_rainy_season")

        return drivers


if __name__ == "__main__":
    calculator = FeatureCalculator()

    np.random.seed(42)
    precip_series = np.random.gamma(2, 20, 12)
    precip_series[8:] = np.random.gamma(0.5, 5, 4)

    spatial_precip = np.random.gamma(2, 15, (64, 64))
    normal_values = np.full((64, 64), 50.0)

    historical = {
        1: np.random.gamma(2, 20, 30),
        2: np.random.gamma(2, 25, 30),
        3: np.random.gamma(3, 30, 30),
    }

    features = calculator.extract_features_for_boundary(
        subcounty_code="KE023001",
        feature_date=date(2024, 3, 1),
        precip_time_series=precip_series,
        spatial_precip_current=spatial_precip,
        historical_monthly_precip=historical,
        normal_values=normal_values,
        cnn_feature_vector=[0.1] * 128,
        model_version="v1.0",
    )

    print("Extracted Features:")
    for key, value in features.items():
        if key != "feature_vector":
            print(f"  {key}: {value}")

    drivers = calculator.get_primary_drought_drivers(features)
    print(f"\nPrimary drought drivers: {drivers}")
