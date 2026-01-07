import { Crosshair, CloudRain, Layers, Truck, Package } from 'lucide-react';

interface LayerVisibility {
  conflicts: boolean;
  weather: boolean;
  vehicles: boolean;
  deliveries: boolean;
}

interface MapControlsProps {
  layerVisibility: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

interface LayerToggleProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
}

function LayerToggle({ active, onClick, icon, label, activeColor }: LayerToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
        ${active
          ? `bg-${activeColor}/20 text-${activeColor}`
          : 'text-control-muted hover:bg-control-surface/50 hover:text-slate-300'
        }
      `}
      style={active ? { backgroundColor: `var(--color-${activeColor}, #ef4444)20`, color: `var(--color-${activeColor}, #ef4444)` } : {}}
    >
      {icon}
      <span className="text-sm">{label}</span>
      <div
        className="ml-auto w-8 h-4 rounded-full transition-colors duration-200"
        style={{ backgroundColor: active ? `var(--color-${activeColor}, #ef4444)` : 'var(--color-control-surface, #1e293b)' }}
      >
        <div
          className={`
            w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5
            ${active ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </div>
    </button>
  );
}

export function MapControls({ layerVisibility, onToggleLayer }: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 glass-panel rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-control-border">
        <Layers size={14} className="text-control-muted" />
        <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">Layers</span>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => onToggleLayer('conflicts')}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
            ${layerVisibility.conflicts
              ? 'bg-alert-critical/20 text-alert-critical'
              : 'text-control-muted hover:bg-control-surface/50 hover:text-slate-300'
            }
          `}
        >
          <Crosshair size={16} />
          <span className="text-sm">Conflict Zones</span>
          <div
            className={`
              ml-auto w-8 h-4 rounded-full transition-colors duration-200
              ${layerVisibility.conflicts ? 'bg-alert-critical' : 'bg-control-surface'}
            `}
          >
            <div
              className={`
                w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5
                ${layerVisibility.conflicts ? 'translate-x-4' : 'translate-x-0.5'}
              `}
            />
          </div>
        </button>

        <button
          onClick={() => onToggleLayer('weather')}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
            ${layerVisibility.weather
              ? 'bg-alert-info/20 text-alert-info'
              : 'text-control-muted hover:bg-control-surface/50 hover:text-slate-300'
            }
          `}
        >
          <CloudRain size={16} />
          <span className="text-sm">Weather Zones</span>
          <div
            className={`
              ml-auto w-8 h-4 rounded-full transition-colors duration-200
              ${layerVisibility.weather ? 'bg-alert-info' : 'bg-control-surface'}
            `}
          >
            <div
              className={`
                w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5
                ${layerVisibility.weather ? 'translate-x-4' : 'translate-x-0.5'}
              `}
            />
          </div>
        </button>

        <button
          onClick={() => onToggleLayer('vehicles')}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
            ${layerVisibility.vehicles
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-control-muted hover:bg-control-surface/50 hover:text-slate-300'
            }
          `}
        >
          <Truck size={16} />
          <span className="text-sm">Vehicles</span>
          <div
            className={`
              ml-auto w-8 h-4 rounded-full transition-colors duration-200
              ${layerVisibility.vehicles ? 'bg-emerald-500' : 'bg-control-surface'}
            `}
          >
            <div
              className={`
                w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5
                ${layerVisibility.vehicles ? 'translate-x-4' : 'translate-x-0.5'}
              `}
            />
          </div>
        </button>

        <button
          onClick={() => onToggleLayer('deliveries')}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200
            ${layerVisibility.deliveries
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-control-muted hover:bg-control-surface/50 hover:text-slate-300'
            }
          `}
        >
          <Package size={16} />
          <span className="text-sm">Deliveries</span>
          <div
            className={`
              ml-auto w-8 h-4 rounded-full transition-colors duration-200
              ${layerVisibility.deliveries ? 'bg-blue-500' : 'bg-control-surface'}
            `}
          >
            <div
              className={`
                w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5
                ${layerVisibility.deliveries ? 'translate-x-4' : 'translate-x-0.5'}
              `}
            />
          </div>
        </button>
      </div>
    </div>
  );
}
