import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CloudRain } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function RainfallTimelineScrubber({ rainfall, onHourChange = () => {} }) {
  const hourly = rainfall?.hourlyMm || [5, 10, 20, 35, 35, 20];
  const totalMm = rainfall?.totalMm || 125;
  const durationHours = rainfall?.durationHours || 6;

  const [currentHour, setCurrentHour] = useState(durationHours);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour((prev) => {
          if (prev >= durationHours) {
            setIsPlaying(false);
            return durationHours;
          }
          const next = prev + 1;
          onHourChange(next);
          return next;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, durationHours, onHourChange]);

  const activeMm = hourly[currentHour - 1] || 0;
  const cumulativeMm = hourly.slice(0, currentHour).reduce((sum, v) => sum + v, 0);
  const maxHourMm = Math.max(...hourly, 1);

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setCurrentHour(val);
    onHourChange(val);
  };

  const togglePlay = () => {
    if (currentHour >= durationHours) {
      setCurrentHour(1);
      onHourChange(1);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      className="ops-card"
      style={{
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'var(--color-info-bg)',
              color: 'var(--color-info)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CloudRain size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Storm Intensity Scrubber
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Hour-by-hour precipitation surge &bull; KSNDMC Historical Radar
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Badge variant={activeMm >= 30 ? 'danger' : activeMm >= 15 ? 'warning' : 'info'}>
            {activeMm >= 30 ? 'Peak Surge' : activeMm >= 15 ? 'Heavy Rain' : 'Moderate'}
          </Badge>
          <div className="font-mono" style={{ fontSize: '1.05rem', color: 'var(--color-info)', fontWeight: 700 }}>
            Hour {currentHour} of {durationHours}
          </div>
        </div>
      </div>

      {/* Hourly Bars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${durationHours}, 1fr)`,
          gap: '0.75rem',
          alignItems: 'flex-end',
          height: '85px',
          padding: '0.75rem 1rem',
          background: 'var(--bg-surface-elevated)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {hourly.map((val, idx) => {
          const hourNum = idx + 1;
          const isCurrent = hourNum === currentHour;
          const isPast = hourNum <= currentHour;
          const heightPercent = Math.max((val / maxHourMm) * 100, 18);

          return (
            <div
              key={idx}
              onClick={() => {
                setCurrentHour(hourNum);
                onHourChange(hourNum);
              }}
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: '0.85rem',
                  color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: isCurrent ? 700 : 500,
                  marginBottom: '4px',
                }}
              >
                {val}mm
              </div>
              <div
                style={{
                  width: '100%',
                  height: `${heightPercent}%`,
                  background: isCurrent
                    ? 'var(--color-info)'
                    : isPast
                    ? 'rgba(14, 165, 233, 0.4)'
                    : 'var(--border-subtle)',
                  borderRadius: '4px',
                  transition: 'all 0.15s ease',
                }}
              />
              <div
                style={{
                  fontSize: '0.8rem',
                  color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                H{hourNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Button
          variant={isPlaying ? 'danger' : 'primary'}
          onClick={togglePlay}
          icon={isPlaying ? Pause : Play}
        >
          {isPlaying ? 'Pause' : 'Play Timeline'}
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setCurrentHour(1);
            onHourChange(1);
          }}
          icon={RotateCcw}
        >
          Reset
        </Button>

        <input
          type="range"
          min={1}
          max={durationHours}
          value={currentHour}
          onChange={handleSliderChange}
          style={{
            flex: 1,
            cursor: 'pointer',
            accentColor: 'var(--color-info)',
            height: '6px',
          }}
        />

        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          Cumulative: <strong className="font-mono" style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{cumulativeMm} mm</strong> / {totalMm} mm
        </div>
      </div>
    </div>
  );
}
