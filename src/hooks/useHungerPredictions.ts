import { useState, useEffect, useCallback } from 'react';
import {
  HungerPrediction,
  ASALBoundary,
  CNNFeatures,
  getLatestPredictions,
  getPredictionsByMonth,
  getASALBoundaries,
  getCNNFeatures,
  calculatePredictionSummary,
  PredictionSummary,
} from '../services/hungerPredictionService';

interface UseHungerPredictionsResult {
  predictions: HungerPrediction[];
  boundaries: ASALBoundary[];
  summary: PredictionSummary | null;
  loading: boolean;
  error: string | null;
  selectedMonth: string | null;
  setSelectedMonth: (month: string | null) => void;
  refreshPredictions: () => Promise<void>;
}

export function useHungerPredictions(): UseHungerPredictionsResult {
  const [predictions, setPredictions] = useState<HungerPrediction[]>([]);
  const [boundaries, setBoundaries] = useState<ASALBoundary[]>([]);
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [predictionsData, boundariesData] = await Promise.all([
        selectedMonth
          ? getPredictionsByMonth(selectedMonth)
          : getLatestPredictions(),
        getASALBoundaries(),
      ]);

      setPredictions(predictionsData);
      setBoundaries(boundariesData);
      setSummary(calculatePredictionSummary(predictionsData));
    } catch (err) {
      console.error('Error fetching hunger predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshPredictions = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    predictions,
    boundaries,
    summary,
    loading,
    error,
    selectedMonth,
    setSelectedMonth,
    refreshPredictions,
  };
}

interface UseSubcountyDetailsResult {
  prediction: HungerPrediction | null;
  features: CNNFeatures[];
  loading: boolean;
  error: string | null;
}

export function useSubcountyDetails(
  subcountyCode: string | null
): UseSubcountyDetailsResult {
  const [prediction, setPrediction] = useState<HungerPrediction | null>(null);
  const [features, setFeatures] = useState<CNNFeatures[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subcountyCode) {
      setPrediction(null);
      setFeatures([]);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const featuresData = await getCNNFeatures(subcountyCode);
        setFeatures(featuresData);

        const predictionResponse = await getLatestPredictions();
        const matchingPrediction = predictionResponse.find(
          (p) => p.subcounty_code === subcountyCode
        );
        setPrediction(matchingPrediction || null);
      } catch (err) {
        console.error('Error fetching subcounty details:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [subcountyCode]);

  return {
    prediction,
    features,
    loading,
    error,
  };
}
