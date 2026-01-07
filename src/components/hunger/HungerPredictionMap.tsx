import { useCallback, useState } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl';
import type { MapLayerMouseEvent, FillLayer } from 'react-map-gl';
import { AlertTriangle, Users, TrendingDown } from 'lucide-react';
import {
  HungerPrediction,
  ASALBoundary,
  getIPCPhaseColor,
  getIPCPhaseLabel,
  formatDriverLabel,
} from '../../services/hungerPredictionService';

interface HungerPredictionMapProps {
  predictions: HungerPrediction[];
  boundaries: ASALBoundary[];
  onSubcountySelect?: (subcountyCode: string) => void;
}

interface PopupInfo {
  longitude: number;
  latitude: number;
  prediction: HungerPrediction;
  boundary: ASALBoundary;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function HungerPredictionMap({
  predictions,
  boundaries,
  onSubcountySelect,
}: HungerPredictionMapProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [viewState, setViewState] = useState({
    latitude: 1.0,
    longitude: 38.0,
    zoom: 5.5,
  });

  const geojsonData = useCallback(() => {
    const predictionMap = new Map(
      predictions.map((p) => [p.subcounty_code, p])
    );

    const features = boundaries
      .filter((b) => b.geometry_geojson)
      .map((boundary) => {
        const prediction = predictionMap.get(boundary.subcounty_code);
        return {
          type: 'Feature' as const,
          geometry: boundary.geometry_geojson,
          properties: {
            subcounty_code: boundary.subcounty_code,
            subcounty_name: boundary.subcounty_name,
            county_name: boundary.county_name,
            population: boundary.population,
            ipc_phase: prediction?.ipc_phase_predicted || 0,
            risk_level: prediction?.risk_level || 'unknown',
            food_insecure: prediction?.food_insecure_population || 0,
            confidence: prediction?.confidence_score || 0,
            fillColor: prediction
              ? getIPCPhaseColor(prediction.ipc_phase_predicted)
              : '#cccccc',
          },
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [predictions, boundaries]);

  const layerStyle: FillLayer = {
    id: 'ipc-fill',
    type: 'fill',
    paint: {
      'fill-color': ['get', 'fillColor'],
      'fill-opacity': 0.7,
    },
  };

  const outlineStyle: FillLayer = {
    id: 'ipc-outline',
    type: 'fill',
    paint: {
      'fill-outline-color': '#374151',
      'fill-color': 'transparent',
    },
  };

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;

      const props = feature.properties;
      const prediction = predictions.find(
        (p) => p.subcounty_code === props?.subcounty_code
      );
      const boundary = boundaries.find(
        (b) => b.subcounty_code === props?.subcounty_code
      );

      if (prediction && boundary) {
        setPopupInfo({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          prediction,
          boundary,
        });

        if (onSubcountySelect) {
          onSubcountySelect(boundary.subcounty_code);
        }
      }
    },
    [predictions, boundaries, onSubcountySelect]
  );

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactiveLayerIds={['ipc-fill']}
        onClick={handleClick}
      >
        <Source id="ipc-data" type="geojson" data={geojsonData()}>
          <Layer {...layerStyle} />
          <Layer {...outlineStyle} />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="ipc-popup"
          >
            <div className="p-3 min-w-64">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor: getIPCPhaseColor(
                      popupInfo.prediction.ipc_phase_predicted
                    ),
                  }}
                />
                <h3 className="font-semibold text-gray-900">
                  {popupInfo.boundary.subcounty_name}
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                {popupInfo.boundary.county_name} County
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">IPC Phase:</span>
                  <span
                    className="px-2 py-0.5 rounded text-sm font-medium"
                    style={{
                      backgroundColor: getIPCPhaseColor(
                        popupInfo.prediction.ipc_phase_predicted
                      ),
                      color:
                        popupInfo.prediction.ipc_phase_predicted >= 4
                          ? 'white'
                          : 'inherit',
                    }}
                  >
                    {popupInfo.prediction.ipc_phase_predicted} -{' '}
                    {getIPCPhaseLabel(popupInfo.prediction.ipc_phase_predicted)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Food Insecure:
                  </span>
                  <span className="text-sm font-medium">
                    {popupInfo.prediction.food_insecure_population.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className="text-sm font-medium">
                    {(popupInfo.prediction.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>

                {popupInfo.prediction.primary_drivers.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <TrendingDown className="w-3 h-3" />
                      Primary Drivers:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {popupInfo.prediction.primary_drivers.map((driver) => (
                        <span
                          key={driver}
                          className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs"
                        >
                          {formatDriverLabel(driver)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">
          IPC Phase Legend
        </h4>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map((phase) => (
            <div key={phase} className="flex items-center gap-2">
              <div
                className="w-4 h-3 rounded"
                style={{ backgroundColor: getIPCPhaseColor(phase) }}
              />
              <span className="text-xs text-gray-600">
                {phase} - {getIPCPhaseLabel(phase)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {predictions.some((p) => p.ipc_phase_predicted >= 3) && (
        <div className="absolute top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 max-w-xs">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {predictions.filter((p) => p.ipc_phase_predicted >= 3).length}{' '}
              sub-counties in crisis or worse
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
