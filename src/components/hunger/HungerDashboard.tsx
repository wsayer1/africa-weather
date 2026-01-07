import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Users,
  MapPin,
  TrendingUp,
  Calendar,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useHungerPredictions } from '../../hooks/useHungerPredictions';
import {
  HungerPrediction,
  IPC_PHASE_COLORS,
  IPC_PHASE_LABELS,
  getIPCPhaseColor,
  getIPCPhaseLabel,
} from '../../services/hungerPredictionService';
import HungerPredictionMap from './HungerPredictionMap';

const RISK_COLORS: Record<string, string> = {
  minimal: '#c6ffc1',
  stressed: '#ffe66d',
  crisis: '#ff9f43',
  emergency: '#ff6b6b',
  famine: '#6c0f0f',
};

export default function HungerDashboard() {
  const {
    predictions,
    boundaries,
    summary,
    loading,
    error,
    selectedMonth,
    setSelectedMonth,
    refreshPredictions,
  } = useHungerPredictions();

  const [selectedSubcounty, setSelectedSubcounty] = useState<string | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPredictions();
    setIsRefreshing(false);
  };

  const riskDistributionData = summary
    ? Object.entries(summary.riskDistribution).map(([risk, count]) => ({
        name: risk.charAt(0).toUpperCase() + risk.slice(1),
        value: count,
        color: RISK_COLORS[risk] || '#cccccc',
      }))
    : [];

  const phaseDistributionData = predictions.reduce((acc, p) => {
    const phase = p.ipc_phase_predicted;
    const existing = acc.find((item) => item.phase === phase);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        phase,
        name: `Phase ${phase}`,
        count: 1,
        color: IPC_PHASE_COLORS[phase],
      });
    }
    return acc;
  }, [] as { phase: number; name: string; count: number; color: string }[]);

  const topRiskSubcounties = [...predictions]
    .sort((a, b) => {
      if (b.ipc_phase_predicted !== a.ipc_phase_predicted) {
        return b.ipc_phase_predicted - a.ipc_phase_predicted;
      }
      return b.food_insecure_population - a.food_insecure_population;
    })
    .slice(0, 10);

  const selectedPrediction = selectedSubcounty
    ? predictions.find((p) => p.subcounty_code === selectedSubcounty)
    : null;

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>Error loading predictions: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Kenya ASAL Hunger Prediction Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              CNN-based food security predictions for Arid and Semi-Arid Lands
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sub-counties</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary?.totalSubcounties || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">High Risk Areas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary?.highRiskSubcounties.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Users className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Food Insecure</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(summary?.totalFoodInsecure || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg IPC Phase</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary?.averageIPCPhase.toFixed(1) || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    IPC Classification Map
                  </h2>
                </div>
                <div className="h-96">
                  <HungerPredictionMap
                    predictions={predictions}
                    boundaries={boundaries}
                    onSubcountySelect={setSelectedSubcounty}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Risk Distribution
                  </h2>
                </div>
                <div className="p-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {riskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Phase Distribution
                  </h2>
                </div>
                <div className="p-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={phaseDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Sub-counties">
                        {phaseDistributionData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Highest Risk Sub-counties
                  </h2>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Sub-county
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Phase
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Food Insecure
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topRiskSubcounties.map((prediction) => (
                        <tr
                          key={prediction.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() =>
                            setSelectedSubcounty(prediction.subcounty_code)
                          }
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {prediction.asal_admin3_boundaries?.subcounty_name ||
                              prediction.subcounty_code}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: getIPCPhaseColor(
                                  prediction.ipc_phase_predicted
                                ),
                                color:
                                  prediction.ipc_phase_predicted >= 4
                                    ? 'white'
                                    : 'inherit',
                              }}
                            >
                              {getIPCPhaseLabel(prediction.ipc_phase_predicted)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {prediction.food_insecure_population.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {selectedPrediction && (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedPrediction.asal_admin3_boundaries?.subcounty_name ||
                      selectedPrediction.subcounty_code}{' '}
                    Details
                  </h2>
                  <button
                    onClick={() => setSelectedSubcounty(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Classification
                    </h3>
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: getIPCPhaseColor(
                          selectedPrediction.ipc_phase_predicted
                        ),
                      }}
                    >
                      <span
                        className={`text-lg font-bold ${
                          selectedPrediction.ipc_phase_predicted >= 4
                            ? 'text-white'
                            : 'text-gray-900'
                        }`}
                      >
                        Phase {selectedPrediction.ipc_phase_predicted}
                      </span>
                      <span
                        className={`text-sm ${
                          selectedPrediction.ipc_phase_predicted >= 4
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                      >
                        {getIPCPhaseLabel(
                          selectedPrediction.ipc_phase_predicted
                        )}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Population Impact
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedPrediction.food_insecure_population.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedPrediction.pct_food_insecure}% of population
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Model Confidence
                    </h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {(selectedPrediction.confidence_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {selectedPrediction.primary_drivers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Primary Drivers
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPrediction.primary_drivers.map((driver) => (
                        <span
                          key={driver}
                          className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                        >
                          {driver
                            .split('_')
                            .map(
                              (w) => w.charAt(0).toUpperCase() + w.slice(1)
                            )
                            .join(' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
