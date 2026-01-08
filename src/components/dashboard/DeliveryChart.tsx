import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { MetricsData } from '../../types';

interface DeliveryChartProps {
  data: MetricsData['deliveryHistory'];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { date: string; target: number } }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const date = new Date(data.payload.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-control-base border border-control-border rounded-lg p-3 shadow-xl">
      <p className="text-xs text-control-muted mb-1">{formattedDate}</p>
      <p className="text-lg font-semibold text-white">
        {data.value.toLocaleString()} <span className="text-sm text-control-muted">MT</span>
      </p>
      <p className="text-xs text-control-muted">
        Target: {data.payload.target.toLocaleString()} MT
      </p>
      <p className={`text-xs ${data.value >= data.payload.target ? 'text-alert-success' : 'text-alert-warning'}`}>
        {data.value >= data.payload.target
          ? `+${((data.value / data.payload.target - 1) * 100).toFixed(0)}% above target`
          : `-${((1 - data.value / data.payload.target) * 100).toFixed(0)}% below target`
        }
      </p>
    </div>
  );
}

export function DeliveryChart({ data }: DeliveryChartProps) {
  const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
  const target = data[0]?.target || 50000;

  return (
    <div className="bg-control-base rounded-xl border border-control-border overflow-hidden">
      <div className="p-6 pb-4 border-b border-control-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-alert-info/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-alert-info" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Food Delivery Amount</h3>
              <p className="text-xs text-control-muted mt-0.5">Last 30 days | Metric Tons (MT)</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-alert-info rounded-full" />
              <span className="text-control-muted">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-alert-warning" style={{ borderTop: '2px dashed' }} />
              <span className="text-control-muted">Target</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-4">
        <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString('en-US', { day: 'numeric' })
              }
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={target}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#deliveryGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#3b82f6',
                stroke: '#1e293b',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

        <div className="mt-4 pt-4 border-t border-control-border flex items-center justify-between">
          <div>
            <p className="text-xs text-control-muted mb-1">30-day average</p>
            <p className="text-lg font-bold text-white">{Math.round(avgVolume).toLocaleString()} <span className="text-sm font-normal text-control-muted">MT</span></p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${avgVolume >= target ? 'bg-alert-success/20' : 'bg-alert-warning/20'}`}>
            <span className={`text-sm font-medium ${avgVolume >= target ? 'text-alert-success' : 'text-alert-warning'}`}>
              {avgVolume >= target ? 'Meeting targets' : 'Below target average'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
