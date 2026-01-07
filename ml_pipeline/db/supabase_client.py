from supabase import create_client, Client
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from config import SUPABASE_URL, SUPABASE_KEY

_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


def insert_admin3_boundary(boundary_data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("asal_admin3_boundaries").insert(boundary_data).execute()
    return result.data[0] if result.data else {}


def get_admin3_boundaries(county_code: str | None = None) -> list[dict]:
    client = get_supabase_client()
    query = client.table("asal_admin3_boundaries").select("*")
    if county_code:
        query = query.eq("county_code", county_code)
    result = query.execute()
    return result.data


def insert_cnn_features(features_data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("cnn_extracted_features").upsert(
        features_data,
        on_conflict="subcounty_code,feature_date,model_version"
    ).execute()
    return result.data[0] if result.data else {}


def get_cnn_features(
    subcounty_code: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    client = get_supabase_client()
    query = client.table("cnn_extracted_features").select("*")
    if subcounty_code:
        query = query.eq("subcounty_code", subcounty_code)
    if start_date:
        query = query.gte("feature_date", start_date)
    if end_date:
        query = query.lte("feature_date", end_date)
    result = query.order("feature_date", desc=True).execute()
    return result.data


def insert_prediction(prediction_data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("hunger_predictions").upsert(
        prediction_data,
        on_conflict="subcounty_code,target_month,model_version"
    ).execute()
    return result.data[0] if result.data else {}


def get_predictions(
    subcounty_code: str | None = None,
    target_month: str | None = None,
    risk_level: str | None = None,
) -> list[dict]:
    client = get_supabase_client()
    query = client.table("hunger_predictions").select("*")
    if subcounty_code:
        query = query.eq("subcounty_code", subcounty_code)
    if target_month:
        query = query.eq("target_month", target_month)
    if risk_level:
        query = query.eq("risk_level", risk_level)
    result = query.order("target_month", desc=True).execute()
    return result.data


def get_latest_predictions() -> list[dict]:
    client = get_supabase_client()
    result = (
        client.table("hunger_predictions")
        .select("*, asal_admin3_boundaries(*)")
        .order("target_month", desc=True)
        .limit(500)
        .execute()
    )
    return result.data


def insert_ipc_historical(ipc_data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("ipc_historical_data").upsert(
        ipc_data,
        on_conflict="subcounty_code,analysis_period_start,analysis_period_end"
    ).execute()
    return result.data[0] if result.data else {}


def get_ipc_historical(
    subcounty_code: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    client = get_supabase_client()
    query = client.table("ipc_historical_data").select("*")
    if subcounty_code:
        query = query.eq("subcounty_code", subcounty_code)
    if start_date:
        query = query.gte("analysis_period_start", start_date)
    if end_date:
        query = query.lte("analysis_period_end", end_date)
    result = query.order("analysis_period_start", desc=True).execute()
    return result.data
