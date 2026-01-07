import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingDown, Droplets, AlertTriangle } from 'lucide-react';
import { CNNFeatures } from '../../services/hungerPredictionService';

interface FeatureTimeSeriesProps {
  features: CNNFeatures[];
  subcountyName?: string;
}

export default function FeatureTimeSeries({
  features,
  subcountyName,
}: FeatureTimeSeriesProps) {
  if (features.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No feature data available
      </div>
    );
  }

  const sortedFeatures = [...features].sort(
    (a, b) =>
      new Date(a.feature_date).getTime() - new Date(b.feature_date).getTime()
  );

  const chartData = sortedFeatures.map((f) => ({
    date: new Date(f.feature_date).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
    spi3: f.spi_3month,
    droughtIndex: f.drought_severity_index,
    precipAnomaly: f.precip_anomaly_pct,
    consecutiveDry: f.consecutive_dry_dekads,
  }));

  const latestFeature = sortedFeatures[sortedFeatures.length - 1];

  const getSPIClassification = (spi: number): string => {
    if (spi >= -0.5) return 'Normal';
    if (spi >= -1.0) return 'Mild Drought';
    if (spi >= -1.5) return 'Moderate Drought';
    if (spi >= -2.0) return 'Severe Drought';
    return 'Extreme Drought';
  };

  const getSPIColor = (spi: number): string => {
    if (spi >= -0.5) return 'text-green-600';
    if (spi >= -1.0) return 'text-yellow-600';
    if (spi >= -1.5) return 'text-orange-600';
    if (spi >= -2.0) return 'text-red-600';
    return 'text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500">SPI-3 Month</span>
          </div>
          <p className={`text-2xl font-bold ${getSPIColor(latestFeature.spi_3month)}`}>
            {latestFeature.spi_3month.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            {getSPIClassification(latestFeature.spi_3month)}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-500">Drought Severity</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(latestFeature.drought_severity_index * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">Composite Index</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-gray-500">Dry Dekads</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {latestFeature.consecutive_dry_dekads}
          </p>
          <p className="text-xs text-gray-500">Consecutive periods</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-500">Precip. Anomaly</span>
          </div>
          <p
            className={`text-2xl font-bold ${
              latestFeature.precip_anomaly_pct < 0
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {latestFeature.precip_anomaly_pct > 0 ? '+' : ''}
            {latestFeature.precip_anomaly_pct.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">vs. historical average</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          SPI-3 Month Trend
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[-3, 3]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
              <ReferenceLine
                y={-1}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: 'Moderate Drought', position: 'right', fontSize: 10 }}
              />
              <ReferenceLine
                y={-1.5}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: 'Severe', position: 'right', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="spi3"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="SPI-3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Drought Severity Index Trend
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <ReferenceLine
                y={0.4}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: 'Elevated Risk', position: 'right', fontSize: 10 }}
              />
              <ReferenceLine
                y={0.6}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: 'High Risk', position: 'right', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="droughtIndex"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Drought Severity"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">
          Feature Interpretation Guide
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>SPI-3:</strong> Standardized Precipitation Index for 3-month
            accumulation. Values below -1 indicate drought conditions.
          </li>
          <li>
            <strong>Drought Severity Index:</strong> Composite score (0-1)
            combining SPI, consecutive dry periods, and below-normal area
            percentage.
          </li>
          <li>
            <strong>Consecutive Dry Dekads:</strong> Number of sequential 10-day
            periods with rainfall below 5mm.
          </li>
          <li>
            <strong>Precipitation Anomaly:</strong> Current precipitation as
            percentage deviation from historical monthly average.
          </li>
        </ul>
      </div>
    </div>
  );
}
