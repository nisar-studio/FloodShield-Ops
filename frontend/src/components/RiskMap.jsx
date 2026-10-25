import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Layers, 
  Compass, 
  CloudRain, 
  Maximize2, 
  SlidersHorizontal,
  Flame,
  CheckCircle,
  XCircle,
  Activity,
  Crosshair,
  Wind,
  Droplets,
  AlertTriangle,
  X
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

const DISPATCH_ORIGIN = {
  name: 'Central Emergency Dispatch Unit (Mahadevapura)',
  lat: 12.9370,
  lng: 77.6920,
};

// Tactical SVG markers
function createMarkerIcon(type, label = '', isSelected = false) {
  let innerSvg = '';
  const strokeHighlight = isSelected ? 'stroke="#ffffff" stroke-width="3"' : '';

  if (type === 'hotspot') {
    innerSvg = `
      <circle cx="18" cy="18" r="14" fill="#D65B4C" fill-opacity="0.95" ${strokeHighlight}/>
      <circle cx="18" cy="18" r="17" fill="none" stroke="#D65B4C" stroke-width="2" stroke-opacity="0.6"/>
      <text x="18" y="22" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="Space Grotesk, sans-serif">${label}</text>
    `;
  } else if (type === 'hospital') {
    innerSvg = `
      <rect x="5" y="5" width="26" height="26" rx="6" fill="#1C2B36" stroke="#6FA9B8" stroke-width="2" ${strokeHighlight}/>
      <path d="M18 10 v16 M10 18 h16" stroke="#6FA9B8" stroke-width="3.5" stroke-linecap="round"/>
    `;
  } else if (type === 'shelter') {
    innerSvg = `
      <rect x="5" y="5" width="26" height="26" rx="6" fill="#1C2B36" stroke="#34D399" stroke-width="2" ${strokeHighlight}/>
      <path d="M10 23 L18 11 L26 23 Z" fill="#34D399"/>
    `;
  } else if (type === 'dispatch') {
    innerSvg = `
      <circle cx="18" cy="18" r="14" fill="#3C7F82" stroke="#E8EEF0" stroke-width="2.5" ${strokeHighlight}/>
      <circle cx="18" cy="18" r="5" fill="#E8EEF0"/>
    `;
  }

  const html = `
    <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); transition: transform 0.2s ease;">
      <svg width="36" height="36" viewBox="0 0 36 36">${innerSvg}</svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'floodshield-tactical-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export const RiskMap = forwardRef(function RiskMap(
  {
    facilities = [],
    hotspots = [],
    simulation = null,
    bbox = null,
    selectedItem = null,
    onSelectItem = () => {},
    replayHour = 6,
    rainfall = null,
  },
  ref
) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    markers: null,
    floodZones: null,
    routes: null,
    watershed: null,
    radarCanvas: null,
  });

  const [layerVisibility, setLayerVisibility] = useState({
    floodZones: true,
    routes: true,
    hotspots: true,
    facilities: true,
    watershed: true,
    radarOverlay: false,
  });

  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isFocusMenuOpen, setIsFocusMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('map');

  // CARTO API Key configuration
  const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY;
  const isCartoKeyMissing = !cartoApiKey || cartoApiKey === 'PASTE_MY_REGENERATED_KEY_HERE' || cartoApiKey.trim() === '';
  const [hasDismissedKeyWarning, setHasDismissedKeyWarning] = useState(false);
  const [hasTileError, setHasTileError] = useState(false);
  const showKeySetupNotice = (isCartoKeyMissing || hasTileError) && !hasDismissedKeyWarning;

  // Expose camera flyTo method
  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 15) {
      if (mapInstanceRef.current && typeof lat === 'number' && typeof lng === 'number') {
        mapInstanceRef.current.flyTo([lat, lng], zoom, {
          duration: 0.85,
          easeLinearity: 0.2,
        });
      }
    },
    resetView() {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([12.945, 77.70], 13, { duration: 0.85 });
      }
    },
  }));

  // Initialize Map
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        const defaultCenter = [12.945, 77.70];
        const defaultZoom = 13;

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          zoomControl: false,
          attributionControl: false,
        });

        // Top right zoom
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.control.attribution({ position: 'bottomright', prefix: false })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style="color:var(--text-muted)">OpenStreetMap</a> contributors &bull; &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" style="color:var(--text-muted)">CARTO</a>')
          .addTo(map);

        // Dark Matter basemap (dark_all style) with API key query parameter
        const cartoTileUrl = cartoApiKey
          ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        const tileLayer = L.tileLayer(cartoTileUrl, {
          maxZoom: 19,
          subdomains: 'abcd',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &bull; &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
        });

        tileLayer.on('tileerror', () => {
          setHasTileError(true);
        });

        tileLayer.addTo(map);

        layersRef.current.watershed = L.layerGroup().addTo(map);
        layersRef.current.floodZones = L.layerGroup().addTo(map);
        layersRef.current.routes = L.layerGroup().addTo(map);
        layersRef.current.markers = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
      }
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
      setViewMode('list');
    }
  }, [viewMode]);

  // Update Geometry & Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || viewMode !== 'map') return;

    const { markers, floodZones, routes, watershed } = layersRef.current;
    if (!markers || !floodZones || !routes || !watershed) return;

    markers.clearLayers();
    floodZones.clearLayers();
    routes.clearLayers();
    watershed.clearLayers();

    const bounds = L.latLngBounds();

    // 1. Watershed Bounding Box Polygon
    if (layerVisibility.watershed && bbox && bbox.south && bbox.north && bbox.west && bbox.east) {
      const bboxPolygon = L.rectangle(
        [
          [bbox.south, bbox.west],
          [bbox.north, bbox.east],
        ],
        {
          color: '#3C7F82',
          weight: 1.5,
          dashArray: '6, 6',
          fillColor: '#1C2B36',
          fillOpacity: 0.12,
        }
      ).bindTooltip('Mahadevapura Watershed Pilot Basin (KSNDMC Radar Scope)', { sticky: true });
      watershed.addLayer(bboxPolygon);
    }

    // 2. Dispatch Origin Hub
    const dispatchMarker = L.marker([DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng], {
      icon: createMarkerIcon('dispatch'),
    });
    dispatchMarker.on('click', () => {
      onSelectItem({
        type: 'facility',
        data: {
          id: 'origin_001',
          name: DISPATCH_ORIGIN.name,
          type: 'Dispatch Hub',
          lat: DISPATCH_ORIGIN.lat,
          lng: DISPATCH_ORIGIN.lng,
          nodeId: 'node_dispatch_hub',
        },
      });
    });
    markers.addLayer(dispatchMarker);
    bounds.extend([DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng]);

    // 3. Flood Extent Inundation Zones (Around Hotspots) - Dynamically scaled by Replay Storm Hour
    const hourly = rainfall?.hourlyMm || [5, 10, 20, 35, 35, 20];
    const totalMm = rainfall?.totalMm || 125;
    const cumulativeMm = hourly.slice(0, replayHour || 6).reduce((a, b) => a + b, 0);
    const rainfallRatio = Math.max(0.18, cumulativeMm / totalMm);

    if (layerVisibility.floodZones) {
      hotspots.forEach((hs) => {
        if (typeof hs.lat === 'number' && typeof hs.lng === 'number') {
          const baseRadius = 240 + (hs.riskScore || 0.5) * 380;
          const radiusMeters = Math.round(baseRadius * (0.35 + 0.65 * rainfallRatio));
          const opacity = Math.min(0.38, 0.12 + 0.26 * rainfallRatio);

          const floodCircle = L.circle([hs.lat, hs.lng], {
            radius: radiusMeters,
            color: '#D65B4C',
            weight: 1.5,
            fillColor: '#D65B4C',
            fillOpacity: opacity,
            className: 'flood-radar-pulse',
          }).bindTooltip(
            `Inundation Pool (H${replayHour}): ${hs.name} &bull; ${(hs.riskScore * 100).toFixed(0)}% Risk &bull; Extent: ${radiusMeters}m`,
            { sticky: true }
          );

          floodCircle.on('click', () => {
            onSelectItem({ type: 'hotspot', data: hs });
          });
          floodZones.addLayer(floodCircle);
        }
      });
    }

    // 4. Hotspots Markers
    if (layerVisibility.hotspots) {
      hotspots.forEach((hs) => {
        if (typeof hs.lat === 'number' && typeof hs.lng === 'number') {
          const isSelected = selectedItem?.type === 'hotspot' && selectedItem?.data?.id === hs.id;
          const scorePercent = Math.round((hs.riskScore || 0) * 100);
          const marker = L.marker([hs.lat, hs.lng], {
            icon: createMarkerIcon('hotspot', `${scorePercent}%`, isSelected),
          });

          marker.on('click', () => {
            onSelectItem({ type: 'hotspot', data: hs });
          });

          markers.addLayer(marker);
          bounds.extend([hs.lat, hs.lng]);
        }
      });
    }

    // 5. Critical Facilities & Verified Response Corridors
    const perFacMap = (simulation?.perFacility || []).reduce((acc, pf) => {
      acc[pf.facilityId] = pf;
      return acc;
    }, {});

    if (layerVisibility.facilities) {
      facilities.forEach((fac) => {
        if (typeof fac.lat === 'number' && typeof fac.lng === 'number') {
          const simFac = perFacMap[fac.id];
          const isHospital = fac.type === 'hospital';
          const isSelected = selectedItem?.type === 'facility' && selectedItem?.data?.id === fac.id;

          // Draw Verified Green Response Pathway if reachable
          if (layerVisibility.routes && simFac?.reachableAfter) {
            const corridor = L.polyline(
              [
                [DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng],
                [fac.lat, fac.lng],
              ],
              {
                color: '#34D399',
                weight: 2.5,
                opacity: 0.75,
                className: 'animated-route-flow',
              }
            ).bindTooltip(`Emergency Corridor: Hub &rarr; ${fac.name} (${simFac.minutesAfter} min)`, { sticky: true });

            corridor.on('click', () => {
              onSelectItem({
                type: 'route',
                data: {
                  targetFacility: fac.name,
                  facilityId: fac.id,
                  type: fac.type,
                  transitMinutes: simFac.minutesAfter,
                  baselineMinutes: simFac.minutesBefore,
                  status: 'Reachable via Protected Corridor',
                },
              });
            });

            routes.addLayer(corridor);
          }

          const marker = L.marker([fac.lat, fac.lng], {
            icon: createMarkerIcon(isHospital ? 'hospital' : 'shelter', '', isSelected),
          });

          marker.on('click', () => {
            onSelectItem({ type: 'facility', data: fac });
          });

          markers.addLayer(marker);
          bounds.extend([fac.lat, fac.lng]);
        }
      });
    }
  }, [facilities, hotspots, simulation, bbox, selectedItem, layerVisibility, viewMode, onSelectItem, replayHour, rainfall]);

  // Smooth camera auto-focus when selectedItem changes
  useEffect(() => {
    if (!selectedItem || !mapInstanceRef.current || viewMode !== 'map') return;
    const data = selectedItem.data;
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      mapInstanceRef.current.flyTo([data.lat, data.lng], 15.5, {
        duration: 0.85,
        easeLinearity: 0.25,
      });
    }
  }, [selectedItem, viewMode]);

  const handleFocusPreset = (preset) => {
    setIsFocusMenuOpen(false);
    if (!mapInstanceRef.current) return;

    if (preset === 'overview') {
      mapInstanceRef.current.flyTo([12.945, 77.70], 13, { duration: 0.85 });
    } else if (preset === 'ecospace') {
      mapInstanceRef.current.flyTo([12.9260, 77.6830], 15.5, { duration: 0.85 });
    } else if (preset === 'rainbow') {
      mapInstanceRef.current.flyTo([12.9110, 77.6795], 15.5, { duration: 0.85 });
    } else if (preset === 'sakra') {
      mapInstanceRef.current.flyTo([12.9255, 77.6845], 16, { duration: 0.85 });
    } else if (preset === 'manipal') {
      mapInstanceRef.current.flyTo([12.9572, 77.7391], 15.5, { duration: 0.85 });
    }
  };

  return (
    <div className="map-viewport">
      {/* Map Atmospheric Haze Overlay (Cinematic Depth) */}
      <div className="map-haze-overlay" />

      {/* CARTO Basemap Key Setup Notice */}
      {showKeySetupNotice && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 500,
            background: 'rgba(17, 26, 35, 0.95)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: '8px',
            padding: '0.75rem 1.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            maxWidth: '580px',
            width: 'calc(100% - 40px)',
            fontSize: '0.825rem',
            color: 'var(--text-primary)',
          }}
        >
          <AlertTriangle size={20} color="var(--color-amber)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--color-amber)', display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>
              CARTO Basemap Key Setup Required
            </strong>
            <span style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {hasTileError
                ? 'Tile request failed. Replace the placeholder in frontend/.env with your valid key and restart the dev server.'
                : 'Configure VITE_CARTO_API_KEY in frontend/.env with your regenerated key and restart the frontend to load authenticated CARTO tiles.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHasDismissedKeyWarning(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Dismiss notice"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Simulated Radar Sweep Overlay when Radar Layer is Enabled */}
      {layerVisibility.radarOverlay && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            border: '1px solid rgba(111, 169, 184, 0.2)',
            pointerEvents: 'none',
            zIndex: 360,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'conic-gradient(from 0deg at 50% 50%, rgba(111, 169, 184, 0.15) 0deg, transparent 60deg, transparent 360deg)',
              animation: 'radarSweep 4s linear infinite',
            }}
          />
        </div>
      )}

      {viewMode === 'map' ? (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      ) : (
        /* Fallback List View */
        <div style={{ height: '100%', overflowY: 'auto', padding: '1.5rem', background: 'var(--color-obsidian)', position: 'relative', zIndex: 400 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <h3 style={{ color: 'var(--color-vermilion)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                Hotspots ({hotspots.length})
              </h3>
              {hotspots.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onSelectItem({ type: 'hotspot', data: h })}
                  style={{
                    background: 'var(--color-deep-slate)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{h.name}</div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--color-water)' }}>
                    Risk: {(h.riskScore * 100).toFixed(0)}% &bull; ({h.lat}, {h.lng})
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ color: 'var(--color-water)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                Facilities ({facilities.length})
              </h3>
              {facilities.map((f) => (
                <div
                  key={f.id}
                  onClick={() => onSelectItem({ type: 'facility', data: f })}
                  style={{
                    background: 'var(--color-deep-slate)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{f.name}</div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {f.type?.toUpperCase()} &bull; ({f.lat}, {f.lng})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Glass Tactical Controls Dock (Top Left) */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          zIndex: 400,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {/* Layer Manager */}
        <button
          type="button"
          onClick={() => {
            setIsLayerMenuOpen(!isLayerMenuOpen);
            setIsFocusMenuOpen(false);
          }}
          className={`map-glass-btn ${isLayerMenuOpen ? 'active' : ''}`}
        >
          <Layers size={14} color="var(--color-water)" />
          <span>Layers ({Object.values(layerVisibility).filter(Boolean).length})</span>
        </button>

        {/* Camera Focus Presets */}
        <button
          type="button"
          onClick={() => {
            setIsFocusMenuOpen(!isFocusMenuOpen);
            setIsLayerMenuOpen(false);
          }}
          className={`map-glass-btn ${isFocusMenuOpen ? 'active' : ''}`}
        >
          <Crosshair size={14} color="var(--color-teal)" />
          <span>Camera Presets</span>
        </button>

        {/* Radar Toggle */}
        <button
          type="button"
          onClick={() =>
            setLayerVisibility((prev) => ({ ...prev, radarOverlay: !prev.radarOverlay }))
          }
          className={`map-glass-btn ${layerVisibility.radarOverlay ? 'active' : ''}`}
          title="Toggle KSNDMC Doppler Radar sweep simulation"
        >
          <Wind size={14} color={layerVisibility.radarOverlay ? 'var(--color-water)' : 'var(--text-muted)'} />
          <span>Radar Sweep</span>
        </button>

        {/* Map / List Toggle */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          className="map-glass-btn"
        >
          {viewMode === 'map' ? 'List View' : 'Map View'}
        </button>
      </div>

      {/* Layer Toggle Dropdown */}
      {isLayerMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            left: '14px',
            zIndex: 450,
            background: 'var(--color-deep-slate)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '0.85rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            width: '230px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Geospatial Layer Overlays
          </div>

          {[
            { key: 'floodZones', label: 'Flood Extent Inundation', color: '#D65B4C' },
            { key: 'routes', label: 'Verified Response Corridors', color: '#34D399' },
            { key: 'hotspots', label: 'Vulnerable Hotspot Pins', color: '#E4AA55' },
            { key: 'facilities', label: 'Hospital & Shelter Assets', color: '#6FA9B8' },
            { key: 'watershed', label: 'Mahadevapura Basin Scope', color: '#3C7F82' },
          ].map((layer) => (
            <label
              key={layer.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: layer.color }} />
                <span>{layer.label}</span>
              </div>
              <input
                type="checkbox"
                checked={layerVisibility[layer.key]}
                onChange={(e) =>
                  setLayerVisibility((prev) => ({ ...prev, [layer.key]: e.target.checked }))
                }
              />
            </label>
          ))}
        </div>
      )}

      {/* Focus Presets Dropdown */}
      {isFocusMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '52px',
            left: '140px',
            zIndex: 450,
            background: 'var(--color-deep-slate)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '0.75rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            width: '220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Quick Camera Presets
          </div>

          <button
            type="button"
            onClick={() => handleFocusPreset('overview')}
            className="ops-btn ops-btn-outline"
            style={{ justifyContent: 'flex-start', padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
          >
            Overview (Mahadevapura)
          </button>
          <button
            type="button"
            onClick={() => handleFocusPreset('ecospace')}
            className="ops-btn ops-btn-outline"
            style={{ justifyContent: 'flex-start', padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
          >
            Hotspot: ORR EcoSpace Sump
          </button>
          <button
            type="button"
            onClick={() => handleFocusPreset('rainbow')}
            className="ops-btn ops-btn-outline"
            style={{ justifyContent: 'flex-start', padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
          >
            Hotspot: Rainbow Drive Culvert
          </button>
          <button
            type="button"
            onClick={() => handleFocusPreset('sakra')}
            className="ops-btn ops-btn-outline"
            style={{ justifyContent: 'flex-start', padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
          >
            Facility: Sakra World Hospital
          </button>
          <button
            type="button"
            onClick={() => handleFocusPreset('manipal')}
            className="ops-btn ops-btn-outline"
            style={{ justifyContent: 'flex-start', padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
          >
            Facility: Manipal Hospital Varthur
          </button>
        </div>
      )}

      {/* Floating Tactical Compass / True North (Bottom Left) */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 400,
          background: 'rgba(17, 26, 35, 0.9)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '6px 12px',
          backdropFilter: 'blur(10px)',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        <button
          type="button"
          onClick={() => handleFocusPreset('overview')}
          title="Reset Camera to True North & Basin Overview"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-water)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: 0,
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <Compass size={15} />
          <span>N 0&deg; TRUE</span>
        </button>
        <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }} />
        <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
          SCOPE: MAHADEVAPURA 12.90&ndash;12.99N
        </span>
      </div>

      {/* Tactical Map Legend (Bottom Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 400,
          background: 'rgba(17, 26, 35, 0.9)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '6px 14px',
          backdropFilter: 'blur(10px)',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D65B4C' }} />
          <span>Flood Hotspot</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#6FA9B8' }} />
          <span>Hospital</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#34D399' }} />
          <span>Shelter</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '16px', height: '2px', background: '#34D399', borderTop: '2px dashed #34D399' }} />
          <span>Verified Corridor</span>
        </div>
      </div>
    </div>
  );
});
