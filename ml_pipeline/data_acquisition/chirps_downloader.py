import os
import hashlib
import requests
from datetime import date, timedelta
from pathlib import Path
from typing import Optional
from tqdm import tqdm
import logging

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import (
    CHIRPS_MONTHLY_URL,
    CHIRPS_DEKADAL_URL,
    RASTER_DIR,
    KENYA_ASAL_BBOX,
)
from db.supabase_client import get_supabase_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CHIRPSDownloader:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.monthly_dir = RASTER_DIR / "monthly"
        self.dekadal_dir = RASTER_DIR / "dekadal"
        self.monthly_dir.mkdir(parents=True, exist_ok=True)
        self.dekadal_dir.mkdir(parents=True, exist_ok=True)

    def _get_monthly_filename(self, year: int, month: int) -> str:
        return f"chirps-v2.0.{year}.{month:02d}.tif"

    def _get_dekadal_filename(self, year: int, month: int, dekad: int) -> str:
        return f"chirps-v2.0.{year}.{month:02d}.{dekad}.tif"

    def _get_monthly_url(self, year: int, month: int) -> str:
        filename = self._get_monthly_filename(year, month)
        return f"{CHIRPS_MONTHLY_URL}/{filename}"

    def _get_dekadal_url(self, year: int, month: int, dekad: int) -> str:
        filename = self._get_dekadal_filename(year, month, dekad)
        return f"{CHIRPS_DEKADAL_URL}/{filename}"

    def _calculate_md5(self, filepath: Path) -> str:
        hash_md5 = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def _get_dekad_dates(self, year: int, month: int, dekad: int) -> tuple[date, date]:
        if dekad == 1:
            start = date(year, month, 1)
            end = date(year, month, 10)
        elif dekad == 2:
            start = date(year, month, 11)
            end = date(year, month, 20)
        else:
            start = date(year, month, 21)
            if month == 12:
                end = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end = date(year, month + 1, 1) - timedelta(days=1)
        return start, end

    def _get_month_dates(self, year: int, month: int) -> tuple[date, date]:
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(year, month + 1, 1) - timedelta(days=1)
        return start, end

    def _download_file(self, url: str, filepath: Path) -> bool:
        try:
            response = requests.get(url, stream=True, timeout=300)
            response.raise_for_status()

            total_size = int(response.headers.get("content-length", 0))

            with open(filepath, "wb") as f:
                with tqdm(total=total_size, unit="B", unit_scale=True, desc=filepath.name) as pbar:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                        pbar.update(len(chunk))

            return True
        except requests.RequestException as e:
            logger.error(f"Failed to download {url}: {e}")
            if filepath.exists():
                filepath.unlink()
            return False

    def _record_metadata(
        self,
        data_type: str,
        year: int,
        month: int,
        dekad: Optional[int],
        start_date: date,
        end_date: date,
        filepath: Path,
        source_url: str,
        status: str,
    ):
        file_size = filepath.stat().st_size if filepath.exists() else None
        checksum = self._calculate_md5(filepath) if filepath.exists() and status == "completed" else None

        record = {
            "data_type": data_type,
            "year": year,
            "month": month,
            "dekad": dekad,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "resolution_deg": 0.05,
            "min_lat": KENYA_ASAL_BBOX["min_lat"],
            "max_lat": KENYA_ASAL_BBOX["max_lat"],
            "min_lng": KENYA_ASAL_BBOX["min_lng"],
            "max_lng": KENYA_ASAL_BBOX["max_lng"],
            "file_path": str(filepath) if filepath.exists() else None,
            "file_size_bytes": file_size,
            "checksum": checksum,
            "source_url": source_url,
            "download_status": status,
            "processed": False,
        }

        existing = (
            self.supabase.table("chirps_raster_metadata")
            .select("id")
            .eq("data_type", data_type)
            .eq("year", year)
            .eq("month", month)
        )

        if dekad is not None:
            existing = existing.eq("dekad", dekad)
        else:
            existing = existing.is_("dekad", "null")

        result = existing.maybeSingle().execute()

        if result.data:
            self.supabase.table("chirps_raster_metadata").update(record).eq(
                "id", result.data["id"]
            ).execute()
        else:
            self.supabase.table("chirps_raster_metadata").insert(record).execute()

    def download_monthly(self, year: int, month: int, force: bool = False) -> bool:
        filename = self._get_monthly_filename(year, month)
        filepath = self.monthly_dir / filename
        url = self._get_monthly_url(year, month)
        start_date, end_date = self._get_month_dates(year, month)

        if filepath.exists() and not force:
            logger.info(f"Monthly file already exists: {filename}")
            self._record_metadata(
                "monthly", year, month, None, start_date, end_date, filepath, url, "completed"
            )
            return True

        self._record_metadata(
            "monthly", year, month, None, start_date, end_date, filepath, url, "downloading"
        )

        logger.info(f"Downloading monthly CHIRPS: {filename}")
        success = self._download_file(url, filepath)

        status = "completed" if success else "failed"
        self._record_metadata(
            "monthly", year, month, None, start_date, end_date, filepath, url, status
        )

        return success

    def download_dekadal(self, year: int, month: int, dekad: int, force: bool = False) -> bool:
        if dekad not in [1, 2, 3]:
            raise ValueError("Dekad must be 1, 2, or 3")

        filename = self._get_dekadal_filename(year, month, dekad)
        filepath = self.dekadal_dir / filename
        url = self._get_dekadal_url(year, month, dekad)
        start_date, end_date = self._get_dekad_dates(year, month, dekad)

        if filepath.exists() and not force:
            logger.info(f"Dekadal file already exists: {filename}")
            self._record_metadata(
                "dekadal", year, month, dekad, start_date, end_date, filepath, url, "completed"
            )
            return True

        self._record_metadata(
            "dekadal", year, month, dekad, start_date, end_date, filepath, url, "downloading"
        )

        logger.info(f"Downloading dekadal CHIRPS: {filename}")
        success = self._download_file(url, filepath)

        status = "completed" if success else "failed"
        self._record_metadata(
            "dekadal", year, month, dekad, start_date, end_date, filepath, url, status
        )

        return success

    def download_year_monthly(self, year: int, force: bool = False) -> dict:
        results = {}
        for month in range(1, 13):
            results[f"{year}-{month:02d}"] = self.download_monthly(year, month, force)
        return results

    def download_year_dekadal(self, year: int, force: bool = False) -> dict:
        results = {}
        for month in range(1, 13):
            for dekad in range(1, 4):
                key = f"{year}-{month:02d}-d{dekad}"
                results[key] = self.download_dekadal(year, month, dekad, force)
        return results

    def download_range(
        self,
        start_year: int,
        end_year: int,
        data_type: str = "monthly",
        force: bool = False,
    ) -> dict:
        all_results = {}
        for year in range(start_year, end_year + 1):
            logger.info(f"Downloading {data_type} data for {year}")
            if data_type == "monthly":
                results = self.download_year_monthly(year, force)
            else:
                results = self.download_year_dekadal(year, force)
            all_results.update(results)
        return all_results

    def get_download_status(self) -> dict:
        result = (
            self.supabase.table("chirps_raster_metadata")
            .select("data_type, download_status, count")
            .execute()
        )

        status_counts = {"monthly": {}, "dekadal": {}}
        for row in result.data:
            dtype = row["data_type"]
            status = row["download_status"]
            if status not in status_counts[dtype]:
                status_counts[dtype][status] = 0
            status_counts[dtype][status] += 1

        return status_counts


if __name__ == "__main__":
    downloader = CHIRPSDownloader()

    print("Downloading sample monthly data for 2023...")
    downloader.download_monthly(2023, 1)
    downloader.download_monthly(2023, 2)

    print("\nDownload status:")
    print(downloader.get_download_status())
