import { useState, useCallback } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl';
import { Truck, Navigation, Anchor, Plane, Loader2 } from 'lucide-react';
import type { ConflictEvent, WeatherEvent, Vehicle, Delivery } from '../../types';
import { MapControls } from './MapControls';
import { ConflictPopup } from './ConflictPopup';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapViewProps {
  conflictEvents: ConflictEvent[];
  weatherEvents: WeatherEvent[];
  vehicles?: Vehicle[];
  deliveries?: Delivery[];
  isLoading?: boolean;
}

interface LayerVisibility {
  conflicts: boolean;
  weather: boolean;
  vehicles: boolean;
  deliveries: boolean;
}

const vehicleIcons: Record<string, typeof Truck> = {
  truck: Truck,
  helicopter: Plane,
  boat: Anchor,
  drone: Navigation,
};

const statusColors: Record<string, string> = {
  active: '#10b981',
  idle: '#6b7280',
  maintenance: '#f59e0b',
  emergency: '#ef4444',
};

export function MapView({ conflictEvents, weatherEvents, vehicles = [], deliveries = [], isLoading }: MapViewProps) {
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    conflicts: true,
    weather: true,
    vehicles: true,
    deliveries: true,
  });
  const [selectedConflict, setSelectedConflict] = useState<ConflictEvent | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const weatherGeoJson = {
    type: 'FeatureCollection' as const,
    features: weatherEvents.map((event) => ({
      type: 'Feature' as const,
      properties: {
        id: event.id,
        type: event.type,
        severity: event.severity,
        description: event.description,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [event.polygon],
      },
    })),
  };

  const deliveryRoutesGeoJson = {
    type: 'FeatureCollection' as const,
    features: deliveries
      .filter((d) => d.status === 'in_transit')
      .map((delivery) => ({
        type: 'Feature' as const,
        properties: {
          id: delivery.id,
          priority: delivery.priority,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [Number(delivery.origin_longitude), Number(delivery.origin_latitude)],
            [Number(delivery.destination_longitude), Number(delivery.destination_latitude)],
          ],
        },
      })),
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-control-dark/50 z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-control-base px-4 py-3 rounded-lg border border-control-border">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-sm text-white">Loading operation data...</span>
          </div>
        </div>
      )}

      <Map
        initialViewState={{
          latitude: 5.0,
          longitude: 20.0,
          zoom: 3,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
      >
        {layerVisibility.weather && (
          <Source id="weather-zones" type="geojson" data={weatherGeoJson}>
            <Layer
              id="weather-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'match',
                  ['get', 'type'],
                  'flood', 'rgba(59, 130, 246, 0.3)',
                  'drought', 'rgba(245, 158, 11, 0.25)',
                  'storm', 'rgba(139, 92, 246, 0.3)',
                  'rgba(100, 116, 139, 0.2)',
                ],
                'fill-opacity': 0.7,
              }}
            />
            <Layer
              id="weather-outline"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'type'],
                  'flood', '#3b82f6',
                  'drought', '#f59e0b',
                  'storm', '#8b5cf6',
                  '#64748b',
                ],
                'line-width': 2,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {layerVisibility.deliveries && deliveries.length > 0 && (
          <Source id="delivery-routes" type="geojson" data={deliveryRoutesGeoJson}>
            <Layer
              id="delivery-routes-line"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'priority'],
                  'critical', '#ef4444',
                  'high', '#f59e0b',
                  'medium', '#3b82f6',
                  '#6b7280',
                ],
                'line-width': 2,
                'line-dasharray': [2, 2],
                'line-opacity': 0.7,
              }}
            />
          </Source>
        )}

        {layerVisibility.conflicts &&
          conflictEvents.map((event) => (
            <Marker
              key={event.id}
              latitude={event.coordinates[0]}
              longitude={event.coordinates[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedConflict(event);
                setSelectedVehicle(null);
              }}
            >
              <div
                className={`conflict-marker severity-${event.severity}`}
                title={event.location}
              />
            </Marker>
          ))}

        {layerVisibility.vehicles &&
          vehicles.map((vehicle) => {
            const Icon = vehicleIcons[vehicle.type] || Truck;
            const color = statusColors[vehicle.status] || '#6b7280';

            return (
              <Marker
                key={vehicle.id}
                latitude={Number(vehicle.latitude)}
                longitude={Number(vehicle.longitude)}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedVehicle(vehicle);
                  setSelectedConflict(null);
                }}
              >
                <div
                  className="relative cursor-pointer transition-transform hover:scale-110"
                  style={{
                    transform: `rotate(${vehicle.heading}deg)`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="w-4 h-4 text-white" style={{ transform: `rotate(-${vehicle.heading}deg)` }} />
                  </div>
                  {vehicle.status === 'active' && (
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full animate-ping"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </div>
              </Marker>
            );
          })}

        {layerVisibility.deliveries &&
          deliveries
            .filter((d) => d.status === 'in_transit')
            .map((delivery) => (
              <Marker
                key={`dest-${delivery.id}`}
                latitude={Number(delivery.destination_latitude)}
                longitude={Number(delivery.destination_longitude)}
                anchor="center"
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg animate-pulse" />
              </Marker>
            ))}

        {selectedConflict && (
          <Popup
            latitude={selectedConflict.coordinates[0]}
            longitude={selectedConflict.coordinates[1]}
            anchor="bottom"
            onClose={() => setSelectedConflict(null)}
            closeOnClick={false}
            offset={15}
          >
            <ConflictPopup event={selectedConflict} onClose={() => setSelectedConflict(null)} />
          </Popup>
        )}

        {selectedVehicle && (
          <Popup
            latitude={Number(selectedVehicle.latitude)}
            longitude={Number(selectedVehicle.longitude)}
            anchor="bottom"
            onClose={() => setSelectedVehicle(null)}
            closeOnClick={false}
            offset={20}
          >
            <div className="bg-control-base rounded-lg p-3 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{selectedVehicle.call_sign}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full capitalize"
                  style={{
                    backgroundColor: `${statusColors[selectedVehicle.status]}20`,
                    color: statusColors[selectedVehicle.status],
                  }}
                >
                  {selectedVehicle.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-control-muted">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-white capitalize">{selectedVehicle.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Speed:</span>
                  <span className="text-white">{selectedVehicle.speed} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span>Fuel:</span>
                  <span className={selectedVehicle.fuel_level < 30 ? 'text-amber-400' : 'text-white'}>
                    {selectedVehicle.fuel_level}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cargo:</span>
                  <span className="text-white">
                    {selectedVehicle.current_load}/{selectedVehicle.cargo_capacity} kg
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <MapControls
        layerVisibility={layerVisibility}
        onToggleLayer={toggleLayer}
      />

      <div className="absolute bottom-4 left-4 glass-panel rounded-lg px-3 py-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-alert-critical animate-pulse" />
            <span className="text-slate-300">Conflict Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Active Vehicle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            <span className="text-slate-300">Destination</span>
          </div>
        </div>
      </div>
    </div>
  );
}
