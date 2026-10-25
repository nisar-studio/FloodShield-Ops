import React, { useRef, useState } from 'react';
import { 
  X, 
  MapPin, 
  Flame, 
  Building2, 
  Cross, 
  Home, 
  BrainCircuit, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Link2, 
  Navigation,
  Droplet,
  Compass,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  Radio,
  SlidersHorizontal,
  Crosshair,
  CheckCircle2,
  BookmarkCheck,
  ExternalLink,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import intelFeedData from '../data/floodIntelligenceFeed.json';

function isValidSourceUrl(sourceUrl) {
  if (!sourceUrl) return false;
  try {
    const url = new URL(sourceUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ContextualInspector({
  selectedItem = null,
  onClose = () => {},
  onFocusMap = () => {},
  plan = null,
  simulation = null,
  hotspots = [],
  facilities = [],
  onSelectItem = () => {},
}) {
  const [panelMode, setPanelMode] = useState('inspector'); // 'inspector' | 'feed'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'evidence' | 'actions'
  const [reviewedReports, setReviewedReports] = useState({});
  const reviewedReportIdsRef = useRef(new Set());
  const [pinnedNotification, setPinnedNotification] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const perFacMap = (simulation?.perFacility || []).reduce((acc, pf) => {
    acc[pf.facilityId] = pf;
    return acc;
  }, {});

  const feedReports = intelFeedData.reports || [];
  const counts = {
    total: feedReports.length,
    verified: feedReports.filter((r) => r.verificationStatus === 'Verified').length,
    citizen: feedReports.filter((r) => r.verificationStatus === 'Citizen Report').length,
    investigating: feedReports.filter((r) => r.verificationStatus === 'Investigating').length,
  };

  const filteredReports = statusFilter === 'ALL'
    ? feedReports
    : feedReports.filter((r) => r.verificationStatus === statusFilter);

  // Review as Potential Hotspot handler
  const handleReviewReport = (report) => {
    if (reviewedReportIdsRef.current.has(report.id)) {
      return; // Prevent duplicate review
    }
    reviewedReportIdsRef.current.add(report.id);

    // 1. Smoothly focus map on report coordinates
    if (typeof report.lat === 'number' && typeof report.lng === 'number') {
      onFocusMap(report.lat, report.lng, 15.5);
    }

    // 2. Correlate with existing hotspot if hotspotId exists
    if (report.hotspotId) {
      const matchingHotspot = hotspots.find((h) => h.id === report.hotspotId);
      if (matchingHotspot) {
        onSelectItem({ type: 'hotspot', data: matchingHotspot });
        setPanelMode('inspector');
        setReviewedReports((prev) => ({
          ...prev,
          [report.id]: {
            status: 'CORRELATED',
            hotspotId: report.hotspotId,
            hotspotName: matchingHotspot.name,
            timestamp: new Date().toLocaleTimeString(),
          },
        }));
        setPinnedNotification({
          type: 'success',
          message: `Report ${report.id} linked to existing Hotspot ${report.hotspotId} (${matchingHotspot.name}). Camera centered on map.`,
        });
        return;
      }
    }

    // 3. For reports without existing hotspots: Pin for operator hazard review
    setReviewedReports((prev) => ({
      ...prev,
      [report.id]: {
        status: 'PINNED',
        landmark: report.landmark,
        timestamp: new Date().toLocaleTimeString(),
      },
    }));
    setPinnedNotification({
      type: 'pinned',
      message: `Report ${report.id} [${report.landmark}] PINNED FOR REVIEW. Queued for Sentinel assessment.`,
    });
  };

  // Reusable compact Inspector | Intel Feed switcher
  const renderModeSwitch = () => (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(10, 13, 18, 0.75)',
        borderRadius: '4px',
        padding: '2px',
        border: '1px solid var(--border-medium)',
        gap: '2px',
        marginRight: '6px',
      }}
    >
      <button
        type="button"
        onClick={() => setPanelMode('inspector')}
        aria-pressed={panelMode === 'inspector'}
        title="Switch to Tactical Asset Inspector"
        style={{
          background: panelMode === 'inspector' ? 'var(--color-teal)' : 'transparent',
          color: panelMode === 'inspector' ? '#ffffff' : 'var(--text-muted)',
          border: 'none',
          borderRadius: '3px',
          padding: '3px 8px',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all var(--transition-fast)',
        }}
      >
        <SlidersHorizontal size={11} />
        <span>Inspector</span>
      </button>
      <button
        type="button"
        onClick={() => setPanelMode('feed')}
        aria-pressed={panelMode === 'feed'}
        title="Switch to Mahadevapura Flood Intelligence Feed"
        style={{
          background: panelMode === 'feed' ? 'var(--color-teal)' : 'transparent',
          color: panelMode === 'feed' ? '#ffffff' : 'var(--text-muted)',
          border: 'none',
          borderRadius: '3px',
          padding: '3px 8px',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all var(--transition-fast)',
        }}
      >
        <Radio size={11} />
        <span>Intel Feed</span>
      </button>
    </div>
  );

  // =========================================================================
  // MODE: FLOOD INTELLIGENCE FEED
  // =========================================================================
  if (panelMode === 'feed') {
    return (
      <aside className="contextual-inspector">
        {/* Panel Header */}
        <div className="ops-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="ops-card-title">
            <Radio size={18} color="var(--color-water)" />
            <h2 style={{ fontSize: 'inherit', fontWeight: 'inherit' }}>FLOOD INTELLIGENCE</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {renderModeSwitch()}
            {selectedItem && (
              <button
                type="button"
                onClick={onClose}
                title="Deselect active asset"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Feed Body */}
        <div className="intel-feed-body" style={{ flex: 1, overflowY: 'auto', padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Header Metadata: Scope & Replay Provenance Tag */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
                MAHADEVAPURA &middot; BENGALURU
              </span>
              <Badge variant="warning">
                SAMPLE DATA
              </Badge>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {intelFeedData.feedMetadata?.disclaimer}
            </div>

            {selectedItem && (
              <div
                style={{
                  marginTop: '4px',
                  background: 'var(--color-steel-blue)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  Active Inspector Item: <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.data?.name || selectedItem.data?.id}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPanelMode('inspector')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-water)', cursor: 'pointer', fontWeight: 700 }}
                >
                  View Details &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Status Filter Summary Bar */}
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
              Reports by Verification Status
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: `ALL (${counts.total})` },
                { key: 'Verified', label: `VERIFIED (${counts.verified})` },
                { key: 'Citizen Report', label: `CITIZEN (${counts.citizen})` },
                { key: 'Investigating', label: `INVESTIGATING (${counts.investigating})` },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusFilter(chip.key)}
                  style={{
                    background: statusFilter === chip.key ? 'var(--color-teal)' : 'var(--color-steel-blue)',
                    border: '1px solid',
                    borderColor: statusFilter === chip.key ? 'var(--color-water)' : 'var(--border-subtle)',
                    color: statusFilter === chip.key ? '#ffffff' : 'var(--text-muted)',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Banner for Operator Action */}
          {pinnedNotification && (
            <div
              role="status"
              aria-live="polite"
              style={{
                background: pinnedNotification.type === 'success' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(228, 170, 85, 0.12)',
                border: `1px solid ${pinnedNotification.type === 'success' ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
                borderRadius: '6px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ color: pinnedNotification.type === 'success' ? 'var(--color-success)' : 'var(--color-amber)', lineHeight: '1.4' }}>
                {pinnedNotification.message}
              </div>
              <button
                type="button"
                onClick={() => setPinnedNotification(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Feed Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredReports.map((report) => {
              const reviewState = reviewedReports[report.id];
              const isReviewed = Boolean(reviewState);

              const severityVariant =
                report.severity === 'Critical'
                  ? 'danger'
                  : report.severity === 'Warning'
                  ? 'warning'
                  : 'info';

              const statusVariant =
                report.verificationStatus === 'Verified'
                  ? 'success'
                  : report.verificationStatus === 'Citizen Report'
                  ? 'teal'
                  : 'neutral';

              return (
                <div
                  key={report.id}
                  style={{
                    background: 'var(--color-steel-blue)',
                    border: isReviewed ? '1px solid var(--color-teal)' : '1px solid var(--border-medium)',
                    borderRadius: '6px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {/* Top line: Report ID & Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexWrap: 'wrap' }}>
                    <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--color-water)', fontWeight: 700 }}>
                      {report.id}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Badge variant={severityVariant}>
                        {report.severity?.toUpperCase()}
                      </Badge>
                      <Badge variant={statusVariant}>
                        {report.verificationStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Headline */}
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.35' }}>
                    {report.headline}
                  </h4>

                  {/* Summary */}
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                    {report.summary}
                  </p>

                  {/* Location Landmark & Map Focus Button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(10, 13, 18, 0.45)',
                      padding: '0.4rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                      <MapPin size={12} color="var(--color-water)" />
                      <span>{report.landmark}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFocusMap(report.lat, report.lng, 15.5)}
                      title={`Center camera on (${report.lat}, ${report.lng})`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-water)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      <Crosshair size={11} />
                      <span className="font-mono">({report.lat}, {report.lng})</span>
                    </button>
                  </div>

                  {/* Source and Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>
                      {isValidSourceUrl(report.sourceUrl) ? (
                        <a
                          href={report.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--color-water)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        >
                          {report.sourceName} <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span>Source: {report.sourceName}</span>
                      )}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={11} />
                      <span className="font-mono">{report.timestampFormatted}</span>
                    </div>
                  </div>

                  {/* Linked Hotspot Tag */}
                  {report.hotspotId && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={12} />
                      <span>Associated Hotspot: <strong className="font-mono">{report.hotspotId}</strong></span>
                    </div>
                  )}

                  {/* Action Button: Review as Potential Hotspot */}
                  <div style={{ marginTop: '2px' }}>
                    {!isReviewed ? (
                      <Button
                        variant="outline"
                        onClick={() => handleReviewReport(report)}
                        icon={Crosshair}
                        className="intel-feed-review-button"
                      >
                        Review as Potential Hotspot
                      </Button>
                    ) : reviewState.status === 'CORRELATED' ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(52, 211, 153, 0.1)',
                          border: '1px solid var(--color-success-border)',
                          borderRadius: '4px',
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.74rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-success)', fontWeight: 600 }}>
                          <CheckCircle2 size={13} />
                          <span>Linked to {reviewState.hotspotId}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPanelMode('inspector')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-water)',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <span>Inspect Hotspot</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(228, 170, 85, 0.1)',
                          border: '1px solid var(--color-warning-border)',
                          borderRadius: '4px',
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.74rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-amber)', fontWeight: 600 }}>
                          <BookmarkCheck size={13} />
                          <span>PINNED FOR REVIEW</span>
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Sentinel Hazard Queue
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // MODE: ASSET INSPECTOR (Preserved Exactly)
  // =========================================================================

  // Case 1: Route Corridor Selected
  if (selectedItem?.type === 'route' && selectedItem.data) {
    const route = selectedItem.data;
    return (
      <aside className="contextual-inspector">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <Navigation size={18} color="var(--color-success)" />
            <span>Emergency Access Corridor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {renderModeSwitch()}
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <Badge variant="success">Active Response Route</Badge>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
              Dispatch Hub &rarr; {route.targetFacility}
            </h3>
            <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Asset ID: {route.facilityId} &bull; Type: {route.type?.toUpperCase()}
            </div>
          </div>

          <div style={{ background: 'var(--color-steel-blue)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.65rem' }}>
              Transit Travel Time
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Verified Transit Time:</span>
              <span className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {route.transitMinutes} minutes
              </span>
            </div>
            {route.baselineMinutes !== null && route.baselineMinutes !== route.transitMinutes && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Baseline:</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{route.baselineMinutes} minutes</span>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            This route avoids all 4 active inundated road segments by utilizing dedicated flyover diversions and perimeter service roads.
          </div>
        </div>
      </aside>
    );
  }

  // Case 2: Hotspot Selected
  if (selectedItem?.type === 'hotspot' && selectedItem.data) {
    const hs = selectedItem.data;
    const score = hs.riskScore || 0;
    const scorePercent = Math.round(score * 100);

    const relatedActions = (plan?.actions || []).filter((act) =>
      act.target?.edgeIds?.some((edgeId) => hs.floodedEdgeIds?.includes(edgeId)) ||
      act.evidence?.some((ev) => ev.includes(hs.id))
    );

    return (
      <aside className="contextual-inspector">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <Flame size={18} color="var(--color-vermilion)" />
            <span>Hotspot Inspector</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {renderModeSwitch()}
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Inspector Sub-Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--color-steel-blue)' }}>
          {['overview', 'evidence', 'actions'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '0.55rem 0',
                background: activeTab === tab ? 'var(--color-deep-slate)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--color-teal)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Badge variant="danger">
                RISK {scorePercent}%
              </Badge>
              <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {hs.id}
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
              {hs.name}
            </h3>
            <div className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--color-water)', marginTop: '2px' }}>
              LAT: {hs.lat?.toFixed(5)} &bull; LNG: {hs.lng?.toFixed(5)}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => onFocusMap(hs.lat, hs.lng, 15.5)}
            icon={MapPin}
            style={{ width: '100%', fontSize: '0.8rem' }}
          >
            Focus Hotspot in 3D Viewport
          </Button>

          {activeTab === 'overview' && (
            <>
              {/* Contributing Factors */}
              <div style={{ background: 'var(--color-steel-blue)', padding: '0.85rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Contributing Vulnerability Drivers
                </div>
                <ul style={{ paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(hs.reasons || []).map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>

              {/* Flooded Road Edges */}
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Inundated Network Edges ({hs.floodedEdgeIds?.length || 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(hs.floodedEdgeIds || []).map((edge, idx) => (
                    <span
                      key={idx}
                      className="font-mono"
                      style={{
                        fontSize: '0.75rem',
                        background: 'rgba(214, 91, 76, 0.15)',
                        border: '1px solid var(--color-danger-border)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: 'var(--color-vermilion)',
                      }}
                    >
                      {edge}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ background: 'var(--color-steel-blue)', padding: '0.85rem', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Hydrological Sensor Scope:</strong>
                <div style={{ color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Doppler radar gauge readings indicate runoff accumulation exceeding local culvert discharge capacity.
                </div>
              </div>

              <div style={{ background: 'var(--color-steel-blue)', padding: '0.85rem', borderRadius: '6px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Historical Correlation:</strong>
                <div style={{ color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                  Corresponds to the critical inundation points observed during the September 2022 Bengaluru cloudburst.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
                Proposed Mitigations ({relatedActions.length})
              </div>
              {relatedActions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {relatedActions.map((act) => (
                    <div
                      key={act.actionId}
                      style={{
                        background: 'var(--color-steel-blue)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{act.type.toUpperCase()}</span>
                        <span className="font-mono" style={{ color: 'var(--color-teal)' }}>{(act.confidence * 100).toFixed(0)}% conf</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>{act.rationale}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
                  No candidate actions directly assigned to this segment.
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Case 3: Facility Selected
  if (selectedItem?.type === 'facility' && selectedItem.data) {
    const fac = selectedItem.data;
    const sim = perFacMap[fac.id];
    const isHospital = fac.type === 'hospital';

    return (
      <aside className="contextual-inspector">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <Building2 size={18} color={isHospital ? 'var(--color-water)' : 'var(--color-success)'} />
            <span>Facility Asset Inspector</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {renderModeSwitch()}
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Badge variant={isHospital ? 'info' : 'success'}>
                {fac.type?.toUpperCase()}
              </Badge>
              <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {fac.id}
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
              {fac.name}
            </h3>
            <div className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Node ID: {fac.nodeId} &bull; ({fac.lat?.toFixed(5)}, {fac.lng?.toFixed(5)})
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => onFocusMap(fac.lat, fac.lng, 15.5)}
            icon={MapPin}
            style={{ width: '100%', fontSize: '0.8rem' }}
          >
            Focus Facility in Viewport
          </Button>

          {/* Reachability Simulation Metrics */}
          <div style={{ background: 'var(--color-steel-blue)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.65rem' }}>
              Reachability Matrix (T = 30m Threshold)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Baseline Transit:</span>
                <strong style={{ color: sim?.reachableBefore ? 'var(--color-success)' : 'var(--color-vermilion)' }}>
                  {sim?.reachableBefore ? `Reachable (${sim.minutesBefore}m)` : 'CUT OFF / INUNDATED'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>With Proposed Plan:</span>
                <strong style={{ color: sim?.reachableAfter ? 'var(--color-success)' : 'var(--color-vermilion)' }}>
                  {sim?.reachableAfter ? `Reachable (${sim.minutesAfter}m)` : 'UNREACHABLE'}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Origin Hub:</strong> Central Emergency Dispatch Unit (Mahadevapura). Connected via arterial diversion corridors and protected drainage culverts.
          </div>
        </div>
      </aside>
    );
  }

  // Case 4: Action Selected
  if (selectedItem?.type === 'action' && selectedItem.data) {
    const act = selectedItem.data;
    return (
      <aside className="contextual-inspector">
        <div className="ops-card-header">
          <div className="ops-card-title">
            <BrainCircuit size={18} color="var(--color-ai)" />
            <span>Action Inspector</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {renderModeSwitch()}
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Badge variant="teal">{act.type?.toUpperCase()}</Badge>
              <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{act.actionId}</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
              {act.target?.label || 'Target Location'}
            </h3>
          </div>

          <div style={{ background: 'var(--color-steel-blue)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.4rem' }}>
              Mitigation Rationale
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
              {act.rationale}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.4rem' }}>
              Evidence Citations
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(act.evidence || []).map((ev, i) => (
                <span
                  key={i}
                  className="font-mono"
                  style={{
                    fontSize: '0.75rem',
                    background: 'var(--color-steel-blue)',
                    border: '1px solid var(--border-medium)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    color: 'var(--color-water)',
                  }}
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>

          {typeof act.confidence === 'number' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Planner Confidence:</span>
              <strong className="font-mono" style={{ color: 'var(--color-teal)' }}>{(act.confidence * 100).toFixed(0)}%</strong>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Default Case: Operational Briefing Overview
  return (
    <aside className="contextual-inspector">
      <div className="ops-card-header">
        <div className="ops-card-title">
          <Compass size={18} color="var(--color-teal)" />
          <span>Operational Briefing</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderModeSwitch()}
        </div>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Select any <strong style={{ color: 'var(--text-primary)' }}>Hotspot</strong>, <strong style={{ color: 'var(--text-primary)' }}>Facility</strong>, or <strong style={{ color: 'var(--text-primary)' }}>Response Corridor</strong> on the map, or switch to <strong style={{ color: 'var(--color-water)' }}>Intel Feed</strong> to review field intelligence.
        </div>

        {/* Hotspots Quick List */}
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
            Vulnerable Hotspots ({hotspots.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {hotspots.map((h) => (
              <div
                key={h.id}
                onClick={() => {
                  onFocusMap(h.lat, h.lng, 15.5);
                  onSelectItem({ type: 'hotspot', data: h });
                }}
                style={{
                  background: 'var(--color-steel-blue)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{h.name}</div>
                  <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{h.id}</div>
                </div>
                <Badge variant={h.riskScore >= 0.8 ? 'danger' : 'warning'}>
                  {(h.riskScore * 100).toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Facilities Quick List */}
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
            Critical Facilities ({facilities.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {facilities.map((f) => {
              const pf = perFacMap[f.id];
              const isHosp = f.type === 'hospital';
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    onFocusMap(f.lat, f.lng, 15.5);
                    onSelectItem({ type: 'facility', data: f });
                  }}
                  style={{
                    background: 'var(--color-steel-blue)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isHosp ? <Cross size={14} color="var(--color-water)" /> : <Home size={14} color="var(--color-success)" />}
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{f.name}</div>
                  </div>
                  {pf && (
                    <Badge variant={pf.reachableAfter ? 'success' : 'danger'}>
                      {pf.reachableAfter ? `${pf.minutesAfter}m` : 'Cut Off'}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
