import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Layers, AlertTriangle, Eye, ListFilter, Navigation } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

// Dispatch origin point in Mahadevapura / Bellandur corridor
const DISPATCH_ORIGIN = {
  name: 'Central Emergency Dispatch Unit (Mahadevapura)',
  lat: 12.9370,
  lng: 77.6920,
};

// Create custom SVG markers for clean, dependency-free command center rendering
function createMarkerIcon(type, label = '', extra = '') {
  let color = '#38bdf8';
  let innerSvg = '';

  if (type === 'hotspot') {
    color = '#ef4444';
    innerSvg = `<circle cx="16" cy="16" r="10" fill="${color}" fill-opacity="0.9"/>
                <circle cx="16" cy="16" r="14" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.6"/>
                <text x="16" y="20" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text>`;
  } else if (type === 'hospital') {
    color = '#0284c7';
    innerSvg = `<rect x="6" y="6" width="20" height="20" rx="4" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
                <path d="M16 10 v12 M10 16 h12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (type === 'shelter') {
    color = '#10b981';
    innerSvg = `<rect x="6" y="6" width="20" height="20" rx="4" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
                <path d="M10 20 L16 10 L22 20 Z" fill="#ffffff"/>`;
  } else if (type === 'dispatch') {
    color = '#8b5cf6';
    innerSvg = `<circle cx="16" cy="16" r="11" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                <circle cx="16" cy="16" r="4" fill="#ffffff"/>`;
  }

  const html = `
    <div style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
      <svg width="32" height="32" viewBox="0 0 32 32">${innerSvg}</svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
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

  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [mapError, setMapError] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        // Center around Mahadevapura (approx 12.945, 77.70)
        const defaultCenter = [12.945, 77.70];
        const defaultZoom = 13;

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          zoomControl: false,
          attributionControl: false,
        });

        // Add zoom control top right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Attribution in bottom right with OSM credit
        L.control.attribution({ position: 'bottomright', prefix: false })
          .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style="color:#64748b">OpenStreetMap</a> contributors &bull; CartoDB DarkMatter')
          .addTo(map);

        // Dark Matter basemap tiles (ideal for command center) with offline fallback detection
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        });

        tileLayer.on('tileerror', () => {
          // If network is offline or Carto tiles fail, log notice and retain map
          console.warn('Map tiles offline or network restricted. Coordinates and markers remain plotted.');
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

    return () => {
      // Don't necessarily destroy on every render, cleanup handled on unmount
    };
  }, [viewMode]);

  // Update markers when data changes
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
      <div style="font-family: var(--font-sans); font-size: 12px;">
        <div style="font-weight: 800; color: #a78bfa; margin-bottom: 4px;">DISPATCH ORIGIN (T=30m Hub)</div>
        <div style="color: #cbd5e1;">${DISPATCH_ORIGIN.name}</div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8; margin-top: 4px;">
          LAT: ${DISPATCH_ORIGIN.lat.toFixed(4)}, LNG: ${DISPATCH_ORIGIN.lng.toFixed(4)}
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
          <div style="font-family: var(--font-sans); font-size: 12px; max-width: 260px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
              <span style="font-weight: 800; color: #ef4444;">FLOOD HOTSPOT</span>
              <span style="background: rgba(239,68,68,0.2); color:#fca5a5; padding: 2px 5px; border-radius:3px; font-weight:700; font-size:10px;">
                RISK: ${(hs.riskScore || 0).toFixed(2)}
              </span>
            </div>
            <div style="font-weight: 700; color: #f8fafc; font-size: 13px;">${hs.name}</div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">
              <strong>Risk Factors:</strong>
              <ul style="padding-left: 14px; margin-top: 2px;">
                ${(hs.reasons || []).map((r) => `<li>${r}</li>`).join('')}
              </ul>
            </div>
            ${
              hs.floodedEdgeIds?.length
                ? `<div style="margin-top: 6px; font-family: var(--font-mono); font-size: 10px; color: #94a3b8;">
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

    // 3. Facilities Markers (Hospitals & Shelters)
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
          <div style="font-family: var(--font-sans); font-size: 12px; max-width: 250px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
              <span style="font-weight: 800; color: ${isHospital ? '#38bdf8' : '#34d399'};">
                ${(fac.type || 'FACILITY').toUpperCase()}
              </span>
              <span style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8;">
                ${fac.id}
              </span>
            </div>
            <div style="font-weight: 700; color: #f8fafc; font-size: 13px;">${fac.name}</div>
            
            ${
              simFac
                ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                      <span style="color:#94a3b8;">Baseline:</span>
                      <strong style="color: ${simFac.reachableBefore ? '#34d399' : '#ef4444'};">
                        ${simFac.reachableBefore ? `Reachable (${simFac.minutesBefore}m)` : 'SEVERED / UNREACHABLE'}
                      </strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                      <span style="color:#94a3b8;">With Proposed Plan:</span>
                      <strong style="color: ${simFac.reachableAfter ? '#34d399' : '#ef4444'};">
                        ${simFac.reachableAfter ? `Reachable (${simFac.minutesAfter}m)` : 'SEVERED / UNREACHABLE'}
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

    // Fit bounds if valid coordinates exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [facilities, hotspots, simulation, viewMode, onSelectHotspot]);

  return (
    <div className="ops-card" style={{ height: '480px', position: 'relative' }}>
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Layers size={16} color="#38bdf8" />
          <span>Spatial Operations & Risk Geometry</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button
            variant={viewMode === 'map' ? 'primary' : 'outline'}
            onClick={() => setViewMode('map')}
            icon={MapPin}
          >
            Map
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            onClick={() => setViewMode('list')}
            icon={ListFilter}
          >
            Data List
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {viewMode === 'map' ? (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#090d16' }} />
        ) : (
          /* Honest List Fallback if Map Tiles or Network restricted */
          <div
            style={{
              padding: '1rem',
              height: '100%',
              overflowY: 'auto',
              background: '#090d16',
              fontSize: '0.8rem',
            }}
          >
            <div
              style={{
                padding: '0.5rem 0.75rem',
                marginBottom: '0.75rem',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '4px',
                color: '#7dd3fc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Navigation size={16} />
              <span>
                <strong>Spatial Geometry Inventory:</strong> Authentic scenario coordinates for pilot area bounding box [12.90, 77.65] to [12.99, 77.76].
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Flood Hotspots ({hotspots.length})
                </h4>
                {hotspots.map((hs) => (
                  <div
                    key={hs.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '4px',
                      padding: '0.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>{hs.name}</span>
                      <span className="font-mono" style={{ color: '#ef4444' }}>
                        Risk: {(hs.riskScore || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      LAT: {hs.lat}, LNG: {hs.lng}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '2px' }}>
                      {hs.reasons?.join(' &bull; ')}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h4 style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Critical Facilities ({facilities.length})
                </h4>
                {facilities.map((fac) => (
                  <div
                    key={fac.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '4px',
                      padding: '0.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>{fac.name}</span>
                      <Badge variant={fac.type === 'hospital' ? 'info' : 'success'}>
                        {fac.type}
                      </Badge>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      ID: {fac.id} | Node: {fac.nodeId} | ({fac.lat}, {fac.lng})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Map Legend */}
        {viewMode === 'map' && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              zIndex: 500,
              background: 'rgba(11, 15, 25, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '6px 10px',
              backdropFilter: 'blur(6px)',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ color: '#cbd5e1' }}>Hotspot</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#0284c7' }} />
              <span style={{ color: '#cbd5e1' }}>Hospital</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
              <span style={{ color: '#cbd5e1' }}>Shelter</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
              <span style={{ color: '#cbd5e1' }}>Dispatch Hub</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
