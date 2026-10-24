import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Compass, 
  Layers, 
  BrainCircuit, 
  ShieldCheck, 
  History, 
  MapPin, 
  FileDown, 
  RefreshCw, 
  Command, 
  X,
  Keyboard
} from 'lucide-react';

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onFocusMap,
  onTriggerRun,
  onExportReport,
  hotspots = [],
  facilities = [],
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const ACTIONS = [
    { id: 'nav_command', label: 'Go to Command View', category: 'Navigation', icon: Compass, run: () => { onNavigate('command'); onClose(); } },
    { id: 'nav_terrain', label: 'Go to Terrain & Watershed', category: 'Navigation', icon: Layers, run: () => { onNavigate('terrain'); onClose(); } },
    { id: 'nav_plan', label: 'Go to Response Plan', category: 'Navigation', icon: BrainCircuit, run: () => { onNavigate('plan'); onClose(); } },
    { id: 'nav_verification', label: 'Go to Reachability Verification', category: 'Navigation', icon: ShieldCheck, run: () => { onNavigate('verification'); onClose(); } },
    { id: 'nav_audit', label: 'Go to Audit Trail', category: 'Navigation', icon: History, run: () => { onNavigate('audit'); onClose(); } },
    { id: 'act_run', label: 'Trigger Operations Run (POST /api/run)', category: 'System Action', icon: RefreshCw, run: () => { onTriggerRun(); onClose(); } },
    { id: 'act_export', label: 'Export Incident Dossier (.md)', category: 'System Action', icon: FileDown, run: () => { onExportReport(); onClose(); } },
  ];

  const HOTSPOT_ACTIONS = hotspots.map((h) => ({
    id: `hs_${h.id}`,
    label: `Focus Hotspot: ${h.name}`,
    category: 'Hotspots',
    icon: MapPin,
    run: () => { onFocusMap(h.lat, h.lng, 15.5); onClose(); },
  }));

  const FACILITY_ACTIONS = facilities.map((f) => ({
    id: `fac_${f.id}`,
    label: `Focus Facility: ${f.name} (${f.type})`,
    category: 'Critical Assets',
    icon: MapPin,
    run: () => { onFocusMap(f.lat, f.lng, 15.5); onClose(); },
  }));

  const ALL_ITEMS = [...ACTIONS, ...HOTSPOT_ACTIONS, ...FACILITY_ACTIONS];

  const filteredItems = ALL_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
        return;
      }
      if (!isOpen || filteredItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].run();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 13, 18, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'var(--color-deep-slate)',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--color-steel-blue)',
          }}
        >
          <Search size={18} color="var(--color-water)" />
          <input
            autoFocus
            type="text"
            placeholder="Search commands, navigate views, or focus hotspots..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <kbd
            style={{
              background: 'rgba(10, 13, 18, 0.6)',
              border: '1px solid var(--border-medium)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Action Results */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No commands found matching "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.run}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-steel-blue)' : 'transparent',
                    border: isSelected ? '1px solid var(--color-teal)' : '1px solid transparent',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={16} color={isSelected ? 'var(--color-water)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.875rem', color: isSelected ? '#ffffff' : 'var(--text-primary)', fontWeight: isSelected ? 600 : 500 }}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: isSelected ? 'var(--color-water)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div
          style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(10, 13, 18, 0.4)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>&uarr; &darr;</strong> to navigate</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>Enter</strong> to select</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Keyboard size={13} />
            <span>FloodShield Command Bar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
