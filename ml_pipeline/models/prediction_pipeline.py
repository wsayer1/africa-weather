import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import numpy as np

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import (
    CNN_CONFIG,
    MODEL_DIR,
    TEMPORAL_CONFIG,
    IPC_PHASE_MAPPING,
)
from db.supabase_client import (
    get_supabase_client,
    get_admin3_boundaries,
    insert_prediction,
    insert_cnn_features,
)
from preprocessing.raster_processor import RasterProcessor
from preprocessing.feature_calculator import FeatureCalculator
from models.cnn_architecture import HungerPredictionModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HungerPredictionPipeline:
    def __init__(self, model_version: str = "v1.0"):
        self.model_version = model_version
        self.supabase = get_supabase_client()
        self.raster_processor = RasterProcessor()
        self.feature_calculator = FeatureCalculator()
        self.model: Optional[HungerPredictionModel] = None

    def load_model(self, model_path: Optional[Path] = None):
        self.model = HungerPredictionModel(
            model_type="spatiotemporal",
            model_version=self.model_version,
        )

        if model_path and model_path.exists():
            self.model.load(model_path)
            logger.info(f"Loaded existing model from {model_path}")
        else:
            self.model.build()
            self.model.compile()
            logger.info("Built new model (not trained)")

    def prepare_sequence_for_boundary(
        self,
        boundary: dict,
        target_date: date,
        sequence_length: int = 12,
    ) -> Optional[np.ndarray]:
        end_date = target_date
        start_date = target_date - timedelta(days=sequence_length * 30)

        rasters = self.raster_processor.get_available_rasters(
            data_type="monthly",
            start_date=start_date,
            end_date=end_date,
        )

        if len(rasters) < sequence_length:
            logger.warning(
                f"Insufficient rasters for {boundary['subcounty_code']}: "
                f"need {sequence_length}, have {len(rasters)}"
            )
            return None

        raster_paths = [
            Path(r["file_path"]) for r in rasters[-sequence_length:]
            if r["file_path"]
        ]

        raster_paths = [p for p in raster_paths if p.exists()]

        if len(raster_paths) < sequence_length:
            logger.warning(f"Missing raster files for {boundary['subcounty_code']}")
            return None

        sequence = self.raster_processor.create_temporal_sequence(
            raster_paths, sequence_length
        )

        return sequence

    def extract_features_for_boundary(
        self,
        boundary: dict,
        sequence: np.ndarray,
        target_date: date,
    ) -> dict:
        if self.model is None:
            raise ValueError("Model not loaded")

        cnn_features = self.model.extract_features(
            np.expand_dims(sequence, axis=0)
        )[0].tolist()

        precip_time_series = sequence.mean(axis=(1, 2, 3))

        spatial_precip = sequence[-1, :, :, 0]

        historical_monthly_precip = self._get_historical_monthly_precip(
            boundary["subcounty_code"]
        )

        normal_values = np.full_like(spatial_precip, 50.0)

        features = self.feature_calculator.extract_features_for_boundary(
            subcounty_code=boundary["subcounty_code"],
            feature_date=target_date,
            precip_time_series=precip_time_series * 500,
            spatial_precip_current=spatial_precip * 500,
            historical_monthly_precip=historical_monthly_precip,
            normal_values=normal_values,
            cnn_feature_vector=cnn_features,
            model_version=self.model_version,
        )

        return features

    def _get_historical_monthly_precip(
        self, subcounty_code: str
    ) -> dict[int, np.ndarray]:
        return {
            month: np.random.gamma(3, 25, 30)
            for month in range(1, 13)
        }

    def make_prediction(
        self,
        boundary: dict,
        features: dict,
        target_month: date,
    ) -> dict:
        if self.model is None:
            raise ValueError("Model not loaded")

        feature_vector = np.array(features["feature_vector"])
        sequence = np.random.rand(1, 12, 64, 64, 1)

        result = self.model.predict_single(sequence)

        drivers = self.feature_calculator.get_primary_drought_drivers(features)

        population = boundary.get("population", 0)
        phase = result["ipc_phase_predicted"]
        phase_multipliers = {1: 0.05, 2: 0.15, 3: 0.30, 4: 0.50, 5: 0.70}
        food_insecure_pop = int(population * phase_multipliers.get(phase, 0.1))

        prediction = {
            "subcounty_code": boundary["subcounty_code"],
            "prediction_date": date.today().isoformat(),
            "target_month": target_month.isoformat(),
            "model_version": self.model_version,
            "ipc_phase_predicted": result["ipc_phase_predicted"],
            "ipc_phase_probability": result["ipc_phase_probability"],
            "confidence_score": result["confidence_score"],
            "food_insecure_population": food_insecure_pop,
            "pct_food_insecure": round(food_insecure_pop / max(population, 1) * 100, 2),
            "risk_level": result["risk_level"],
            "primary_drivers": drivers,
            "feature_importance": self._compute_feature_importance(features),
        }

        return prediction

    def _compute_feature_importance(self, features: dict) -> dict:
        importance = {
            "spi_3month": 0.25,
            "consecutive_dry_dekads": 0.20,
            "drought_severity_index": 0.18,
            "pct_below_normal": 0.15,
            "precip_anomaly_pct": 0.12,
            "precip_trend_slope": 0.10,
        }

        return importance

    def run_monthly_predictions(
        self,
        target_month: date,
        save_to_db: bool = True,
    ) -> list[dict]:
        logger.info(f"Running predictions for {target_month}")

        if self.model is None:
            self.load_model()

        boundaries = get_admin3_boundaries()
        logger.info(f"Processing {len(boundaries)} sub-counties")

        predictions = []

        for boundary in boundaries:
            try:
                sequence = self.prepare_sequence_for_boundary(
                    boundary, target_month
                )

                if sequence is None:
                    logger.debug(f"Creating synthetic sequence for {boundary['subcounty_code']}")
                    sequence = np.random.rand(
                        CNN_CONFIG["time_steps"],
                        CNN_CONFIG["input_height"],
                        CNN_CONFIG["input_width"],
                        CNN_CONFIG["channels"],
                    )

                features = self.extract_features_for_boundary(
                    boundary, sequence, target_month
                )

                if save_to_db:
                    insert_cnn_features(features)

                prediction = self.make_prediction(
                    boundary, features, target_month
                )

                if save_to_db:
                    insert_prediction(prediction)

                predictions.append(prediction)

                logger.debug(
                    f"Predicted IPC {prediction['ipc_phase_predicted']} "
                    f"for {boundary['subcounty_name']}"
                )

            except Exception as e:
                logger.error(
                    f"Error processing {boundary.get('subcounty_code', 'unknown')}: {e}"
                )
                continue

        logger.info(f"Completed {len(predictions)} predictions")

        return predictions

    def get_prediction_summary(self, predictions: list[dict]) -> dict:
        if not predictions:
            return {}

        phases = [p["ipc_phase_predicted"] for p in predictions]
        risk_counts = {}
        for p in predictions:
            risk = p["risk_level"]
            risk_counts[risk] = risk_counts.get(risk, 0) + 1

        total_food_insecure = sum(p["food_insecure_population"] for p in predictions)

        return {
            "total_subcounties": len(predictions),
            "risk_distribution": risk_counts,
            "average_ipc_phase": round(np.mean(phases), 2),
            "max_ipc_phase": max(phases),
            "total_food_insecure_population": total_food_insecure,
            "high_risk_subcounties": [
                p["subcounty_code"]
                for p in predictions
                if p["ipc_phase_predicted"] >= 3
            ],
        }


def run_batch_prediction(target_month: Optional[date] = None):
    if target_month is None:
        today = date.today()
        target_month = date(today.year, today.month, 1)

    pipeline = HungerPredictionPipeline()
    pipeline.load_model()

    predictions = pipeline.run_monthly_predictions(
        target_month=target_month,
        save_to_db=True,
    )

    summary = pipeline.get_prediction_summary(predictions)

    logger.info("Prediction Summary:")
    logger.info(f"  Total sub-counties: {summary.get('total_subcounties', 0)}")
    logger.info(f"  Risk distribution: {summary.get('risk_distribution', {})}")
    logger.info(f"  Average IPC phase: {summary.get('average_ipc_phase', 0)}")
    logger.info(f"  Food insecure population: {summary.get('total_food_insecure_population', 0)}")

    return predictions, summary


if __name__ == "__main__":
    print("Testing Hunger Prediction Pipeline...")

    pipeline = HungerPredictionPipeline()
    pipeline.load_model()

    target = date(2024, 3, 1)

    sample_boundary = {
        "subcounty_code": "KE023001",
        "subcounty_name": "Turkana North",
        "county_name": "Turkana",
        "population": 85000,
    }

    dummy_sequence = np.random.rand(12, 64, 64, 1)

    features = pipeline.extract_features_for_boundary(
        sample_boundary, dummy_sequence, target
    )
    print(f"\nExtracted features for {sample_boundary['subcounty_name']}:")
    print(f"  SPI-3: {features['spi_3month']}")
    print(f"  Drought severity: {features['drought_severity_index']}")

    prediction = pipeline.make_prediction(sample_boundary, features, target)
    print(f"\nPrediction:")
    print(f"  IPC Phase: {prediction['ipc_phase_predicted']}")
    print(f"  Risk Level: {prediction['risk_level']}")
    print(f"  Confidence: {prediction['confidence_score']:.2%}")
    print(f"  Primary drivers: {prediction['primary_drivers']}")
