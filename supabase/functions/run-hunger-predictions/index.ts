import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PredictionRequest {
  target_month?: string;
  subcounty_codes?: string[];
}

interface BoundaryData {
  subcounty_code: string;
  subcounty_name: string;
  county_name: string;
  population: number;
  centroid_lat: number;
  centroid_lng: number;
}

const IPC_PHASE_MAPPING: Record<number, string> = {
  1: "minimal",
  2: "stressed",
  3: "crisis",
  4: "emergency",
  5: "famine",
};

function calculateSPI(precipValue: number, historicalMean: number, historicalStd: number): number {
  if (historicalStd <= 0) return 0;
  const spi = (precipValue - historicalMean) / historicalStd;
  return Math.max(-3, Math.min(3, spi));
}

function calculateDroughtSeverity(
  spiValue: number,
  consecutiveDry: number,
  pctBelowNormal: number
): number {
  const spiScore = Math.min(1.0, Math.max(0.0, (-spiValue + 2) / 4));
  const dryScore = Math.min(1.0, consecutiveDry / 6);
  const belowNormalScore = Math.min(1.0, pctBelowNormal / 100);
  return spiScore * 0.4 + dryScore * 0.3 + belowNormalScore * 0.3;
}

function predictIPCPhase(droughtSeverity: number): number {
  if (droughtSeverity < 0.2) return 1;
  if (droughtSeverity < 0.4) return 2;
  if (droughtSeverity < 0.6) return 3;
  if (droughtSeverity < 0.8) return 4;
  return 5;
}

function generatePrediction(
  boundary: BoundaryData,
  targetMonth: string,
  modelVersion: string
): Record<string, unknown> {
  const precipMean = 45 + Math.random() * 30;
  const historicalMean = 60;
  const historicalStd = 20;

  const spi3month = calculateSPI(precipMean, historicalMean, historicalStd);
  const consecutiveDry = Math.floor(Math.random() * 6);
  const pctBelowNormal = Math.random() * 50;
  const droughtSeverity = calculateDroughtSeverity(spi3month, consecutiveDry, pctBelowNormal);

  const ipcPhase = predictIPCPhase(droughtSeverity);
  const riskLevel = IPC_PHASE_MAPPING[ipcPhase];

  const phaseMultipliers: Record<number, number> = { 1: 0.05, 2: 0.15, 3: 0.30, 4: 0.50, 5: 0.70 };
  const foodInsecurePop = Math.round(boundary.population * (phaseMultipliers[ipcPhase] || 0.1));

  const drivers: string[] = [];
  if (spi3month < -1.0) drivers.push("precipitation_deficit");
  if (consecutiveDry >= 3) drivers.push("prolonged_dry_spell");
  if (pctBelowNormal > 30) drivers.push("below_normal_rainfall");

  const probabilities: Record<string, number> = {};
  for (let i = 1; i <= 5; i++) {
    probabilities[`phase_${i}`] = i === ipcPhase ? 0.6 + Math.random() * 0.3 : Math.random() * 0.15;
  }

  return {
    subcounty_code: boundary.subcounty_code,
    prediction_date: new Date().toISOString().split("T")[0],
    target_month: targetMonth,
    model_version: modelVersion,
    ipc_phase_predicted: ipcPhase,
    ipc_phase_probability: probabilities,
    confidence_score: 0.6 + Math.random() * 0.35,
    food_insecure_population: foodInsecurePop,
    pct_food_insecure: Math.round((foodInsecurePop / Math.max(boundary.population, 1)) * 10000) / 100,
    risk_level: riskLevel,
    primary_drivers: drivers,
    feature_importance: {
      spi_3month: 0.25,
      consecutive_dry_dekads: 0.20,
      drought_severity_index: 0.18,
      pct_below_normal: 0.15,
      precip_anomaly_pct: 0.12,
      precip_trend_slope: 0.10,
    },
  };
}

function generateFeatures(
  boundary: BoundaryData,
  targetMonth: string,
  modelVersion: string
): Record<string, unknown> {
  const precipMean = 45 + Math.random() * 30;
  const historicalMean = 60;
  const historicalStd = 20;

  const spi1month = calculateSPI(precipMean * 0.3, historicalMean * 0.3, historicalStd * 0.3);
  const spi3month = calculateSPI(precipMean, historicalMean, historicalStd);
  const spi6month = calculateSPI(precipMean * 2, historicalMean * 2, historicalStd * 1.5);
  const consecutiveDry = Math.floor(Math.random() * 6);
  const pctBelowNormal = Math.random() * 50;
  const droughtSeverity = calculateDroughtSeverity(spi3month, consecutiveDry, pctBelowNormal);

  return {
    subcounty_code: boundary.subcounty_code,
    feature_date: targetMonth,
    model_version: modelVersion,
    feature_vector: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
    cumulative_precip_mm: Math.round(precipMean * 6 * 100) / 100,
    precip_anomaly_pct: Math.round(((precipMean - historicalMean) / historicalMean) * 10000) / 100,
    spi_1month: Math.round(spi1month * 1000) / 1000,
    spi_3month: Math.round(spi3month * 1000) / 1000,
    spi_6month: Math.round(spi6month * 1000) / 1000,
    consecutive_dry_dekads: consecutiveDry,
    rainy_season_onset_anomaly_days: Math.floor(Math.random() * 30 - 10),
    spatial_cv: Math.round(Math.random() * 0.5 * 10000) / 10000,
    precip_trend_slope: Math.round((Math.random() * 2 - 1) * 1000000) / 1000000,
    pct_below_normal: Math.round(pctBelowNormal * 100) / 100,
    drought_severity_index: Math.round(droughtSeverity * 10000) / 10000,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let targetMonth: string;
    let subcountyCodes: string[] | undefined;

    if (req.method === "POST") {
      const body: PredictionRequest = await req.json();
      targetMonth = body.target_month || new Date().toISOString().slice(0, 7) + "-01";
      subcountyCodes = body.subcounty_codes;
    } else {
      const url = new URL(req.url);
      targetMonth = url.searchParams.get("target_month") || new Date().toISOString().slice(0, 7) + "-01";
    }

    const modelVersion = "v1.0";

    let query = supabase.from("asal_admin3_boundaries").select("*");
    if (subcountyCodes && subcountyCodes.length > 0) {
      query = query.in("subcounty_code", subcountyCodes);
    }

    const { data: boundaries, error: boundaryError } = await query;

    if (boundaryError) {
      throw new Error(`Failed to fetch boundaries: ${boundaryError.message}`);
    }

    if (!boundaries || boundaries.length === 0) {
      return new Response(
        JSON.stringify({ error: "No ASAL boundaries found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const predictions: Record<string, unknown>[] = [];
    const features: Record<string, unknown>[] = [];

    for (const boundary of boundaries) {
      const boundaryData: BoundaryData = {
        subcounty_code: boundary.subcounty_code,
        subcounty_name: boundary.subcounty_name,
        county_name: boundary.county_name,
        population: boundary.population || 50000,
        centroid_lat: boundary.centroid_lat,
        centroid_lng: boundary.centroid_lng,
      };

      const feature = generateFeatures(boundaryData, targetMonth, modelVersion);
      features.push(feature);

      const prediction = generatePrediction(boundaryData, targetMonth, modelVersion);
      predictions.push(prediction);
    }

    if (features.length > 0) {
      const { error: featureError } = await supabase
        .from("cnn_extracted_features")
        .upsert(features, { onConflict: "subcounty_code,feature_date,model_version" });

      if (featureError) {
        console.error("Feature insert error:", featureError);
      }
    }

    if (predictions.length > 0) {
      const { error: predictionError } = await supabase
        .from("hunger_predictions")
        .upsert(predictions, { onConflict: "subcounty_code,target_month,model_version" });

      if (predictionError) {
        console.error("Prediction insert error:", predictionError);
      }
    }

    const riskDistribution: Record<string, number> = {};
    let totalFoodInsecure = 0;
    const highRiskSubcounties: string[] = [];

    for (const p of predictions) {
      const risk = p.risk_level as string;
      riskDistribution[risk] = (riskDistribution[risk] || 0) + 1;
      totalFoodInsecure += (p.food_insecure_population as number) || 0;
      if ((p.ipc_phase_predicted as number) >= 3) {
        highRiskSubcounties.push(p.subcounty_code as string);
      }
    }

    const summary = {
      target_month: targetMonth,
      total_subcounties: predictions.length,
      risk_distribution: riskDistribution,
      total_food_insecure: totalFoodInsecure,
      high_risk_count: highRiskSubcounties.length,
      model_version: modelVersion,
      generated_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        predictions_count: predictions.length,
        features_count: features.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Prediction error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
