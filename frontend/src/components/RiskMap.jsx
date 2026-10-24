import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Layers, ListFilter, Navigation } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

const DISPATCH_ORIGIN = {
  name: 'Central Emergency Dispatch Unit (Mahadevapura)',
  lat: 12.9370,
  lng: 77.6920,
};

function createMarkerIcon(type, label = '') {
  let color = '#0ea5e9';
  let innerSvg = '';

  if (type === 'hotspot') {
    color = '#f43f5e';
    innerSvg = `<circle cx="18" cy="18" r="12" fill="${color}" fill-opacity="0.95"/>
                <circle cx="18" cy="18" r="16" fill="none" stroke="${color}" stroke-width="2.5" stroke-opacity="0.6"/>
                <text x="18" y="22" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text>`;
  } else if (type === 'hospital') {
    color = '#0ea5e9';
    innerSvg = `<rect x="6" y="6" width="24" height="24" rx="6" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                <path d="M18 11 v14 M11 18 h14" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`;
  } else if (type === 'shelter') {
    color = '#22c55e';
    innerSvg = `<rect x="6" y="6" width="24" height="24" rx="6" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                <path d="M11 23 L18 11 L25 23 Z" fill="#ffffff"/>`;
  } else if (type === 'dispatch') {
    color = '#a855f7';
    innerSvg = `<circle cx="18" cy="18" r="13" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
                <circle cx="18" cy="18" r="5" fill="#ffffff"/>`;
  }

  const html = `
    <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
      <svg width="36" height="36" viewBox="0 0 36 36">${innerSvg}</svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export function RiskMap({
  facilities = [],
  hotspots = [],
  simulation = null,
  bbox = null,
  selectedHotspotId = null,
  onSelectHotspot = () => {},
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [viewMode, setViewMode] = useState('map');
  const [mapError, setMapError] = useState(null);

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

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.control.attribution({ position: 'bottomright', prefix: false })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style="color:#71717a">OpenStreetMap</a> &bull; CartoDB')
          .addTo(map);

        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        });

        tileLayer.addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
      }
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
      setMapError('Interactive map initialization failed. Switched to coordinate list mode.');
      setViewMode('list');
    }
  }, [viewMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || viewMode !== 'map') return;

    markersLayer.clearLayers();
    const bounds = L.latLngBounds();

    // 1. Dispatch Origin Marker
    const dispatchMarker = L.marker([DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng], {
      icon: createMarkerIcon('dispatch'),
    }).bindPopup(`
      <div style="font-family: var(--font-sans); font-size: 14px;">
        <div style="font-weight: 800; color: #c084fc; margin-bottom: 4px;">DISPATCH ORIGIN (T=30m Hub)</div>
        <div style="color: #f4f4f5; font-weight:600;">${DISPATCH_ORIGIN.name}</div>
        <div style="font-family: var(--font-mono); font-size: 12px; color: #a1a1aa; margin-top: 6px;">
          Lat: ${DISPATCH_ORIGIN.lat.toFixed(4)}, Lng: ${DISPATCH_ORIGIN.lng.toFixed(4)}
        </div>
      </div>
    `);
    markersLayer.addLayer(dispatchMarker);
    bounds.extend([DISPATCH_ORIGIN.lat, DISPATCH_ORIGIN.lng]);

    // 2. Hotspots Markers
    hotspots.forEach((hs) => {
      if (typeof hs.lat === 'number' && typeof hs.lng === 'number') {
        const riskPercent = Math.round((hs.riskScore || 0) * 100);
        const marker = L.marker([hs.lat, hs.lng], {
          icon: createMarkerIcon('hotspot', `${riskPercent}%`),
        }).bindPopup(`
          <div style="font-family: var(--font-sans); font-size: 14px; max-width: 280px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
              <span style="font-weight: 800; color: #fb7185;">FLOOD HOTSPOT</span>
              <span style="background: rgba(244,63,94,0.15); color:#fb7185; padding: 2px 6px; border-radius:4px; font-weight:700; font-size:12px;">
                Risk ${(hs.riskScore || 0).toFixed(2)}
              </span>
            </div>
            <div style="font-weight: 700; color: #fafafa; font-size: 15px;">${hs.name}</div>
            <div style="font-size: 13px; color: #d4d4d8; margin-top: 8px;">
              <strong>Contributing Factors:</strong>
              <ul style="padding-left: 16px; margin-top: 4px;">
                ${(hs.reasons || []).map((r) => `<li>${r}</li>`).join('')}
              </ul>
            </div>
            ${
              hs.floodedEdgeIds?.length
                ? `<div style="margin-top: 8px; font-family: var(--font-mono); font-size: 11px; color: #a1a1aa;">
                    Flooded Edges: ${hs.floodedEdgeIds.join(', ')}
                   </div>`
                : ''
            }
          </div>
        `);

        marker.on('click', () => onSelectHotspot(hs.id));
        markersLayer.addLayer(marker);
        bounds.extend([hs.lat, hs.lng]);
      }
    });

    // 3. Facilities Markers
    const perFacMap = (simulation?.perFacility || []).reduce((acc, pf) => {
      acc[pf.facilityId] = pf;
      return acc;
    }, {});

    facilities.forEach((fac) => {
      if (typeof fac.lat === 'number' && typeof fac.lng === 'number') {
        const simFac = perFacMap[fac.id];
        const isHospital = fac.type === 'hospital';
        const marker = L.marker([fac.lat, fac.lng], {
          icon: createMarkerIcon(isHospital ? 'hospital' : 'shelter'),
        }).bindPopup(`
          <div style="font-family: var(--font-sans); font-size: 14px; max-width: 280px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
              <span style="font-weight: 800; color: ${isHospital ? '#38bdf8' : '#4ade80'};">
                ${(fac.type || 'FACILITY').toUpperCase()}
              </span>
              <span style="font-family: var(--font-mono); font-size: 12px; color: #a1a1aa;">
                ${fac.id}
              </span>
            </div>
            <div style="font-weight: 700; color: #fafafa; font-size: 15px;">${fac.name}</div>
            
            ${
              simFac
                ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 13px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                      <span style="color:#a1a1aa;">Baseline:</span>
                      <strong style="color: ${simFac.reachableBefore ? '#4ade80' : '#fb7185'};">
                        ${simFac.reachableBefore ? `Reachable (${simFac.minutesBefore}m)` : 'Cut Off'}
                      </strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:#a1a1aa;">With Plan:</span>
                      <strong style="color: ${simFac.reachableAfter ? '#4ade80' : '#fb7185'};">
                        ${simFac.reachableAfter ? `Reachable (${simFac.minutesAfter}m)` : 'Unreachable'}
                      </strong>
                    </div>
                   </div>`
                : ''
            }
          </div>
        `);

        markersLayer.addLayer(marker);
        bounds.extend([fac.lat, fac.lng]);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [facilities, hotspots, simulation, viewMode, onSelectHotspot]);

  return (
    <div className="ops-card" style={{ height: '540px', position: 'relative' }}>
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Layers size={20} color="var(--color-info)" />
          <span>Spatial Operations & Risk Geometry</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            variant={viewMode === 'map' ? 'primary' : 'outline'}
            onClick={() => setViewMode('map')}
            icon={MapPin}
          >
            Map View
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            onClick={() => setViewMode('list')}
            icon={ListFilter}
          >
            Coordinate List
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {viewMode === 'map' ? (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: 'var(--bg-app)' }} />
        ) : (
          <div
            style={{
              padding: '1.5rem',
              height: '100%',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              fontSize: '0.95rem',
            }}
          >
            <div
              style={{
                padding: '0.75rem 1.25rem',
                marginBottom: '1.25rem',
                background: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                borderRadius: '8px',
                color: 'var(--color-info)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Navigation size={20} />
              <span>
                <strong>Spatial Geometry Inventory:</strong> Scenario coordinates for bounding box [12.90, 77.65] to [12.99, 77.76].
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700 }}>
                  Flood Hotspots ({hotspots.length})
                </h4>
                {hotspots.map((hs) => (
                  <div
                    key={hs.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{hs.name}</span>
                      <span className="font-mono" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                        Risk: {(hs.riskScore || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Lat: {hs.lat}, Lng: {hs.lng}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {hs.reasons?.join(' &bull; ')}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-info)', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700 }}>
                  Critical Facilities ({facilities.length})
                </h4>
                {facilities.map((fac) => (
                  <div
                    key={fac.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fac.name}</span>
                      <Badge variant={fac.type === 'hospital' ? 'info' : 'success'}>
                        {fac.type}
                      </Badge>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      ID: {fac.id} &bull; Node {fac.nodeId} &bull; ({fac.lat}, {fac.lng})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        {viewMode === 'map' && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              zIndex: 500,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }} />
              <span style={{ color: 'var(--text-primary)' }}>Hotspot</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#0ea5e9' }} />
              <span style={{ color: 'var(--text-primary)' }}>Hospital</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#22c55e' }} />
              <span style={{ color: 'var(--text-primary)' }}>Shelter</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7' }} />
              <span style={{ color: 'var(--text-primary)' }}>Dispatch Hub</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
