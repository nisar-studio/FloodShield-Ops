import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CloudRain, Droplets, Waves } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function RainfallTimelineScrubber({ rainfall, onHourChange = () => {} }) {
  const hourly = rainfall?.hourlyMm || [5, 10, 20, 35, 35, 20];
  const totalMm = rainfall?.totalMm || 125;
  const durationHours = rainfall?.durationHours || 6;

  const [currentHour, setCurrentHour] = useState(durationHours);
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback timer
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
      style={{
        background: 'linear-gradient(135deg, rgba(14, 25, 48, 0.75) 0%, rgba(8, 14, 28, 0.85) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CloudRain size={18} color="#38bdf8" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
              Meteorological Precipitation Scrubber
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Historical KSNDMC Doppler Radar Replay &bull; Mahadevapura Drainage Basin
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Badge variant={activeMm >= 30 ? 'danger' : activeMm >= 15 ? 'warning' : 'info'}>
            {activeMm >= 30 ? 'PEAK CLOUDBURST' : activeMm >= 15 ? 'HEAVY RAINFALL' : 'MODERATE'}
          </Badge>
          <div className="font-mono" style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
            T + {currentHour}:00h
          </div>
        </div>
      </div>

      {/* Visual Hourly Precipitation Bars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${durationHours}, 1fr)`,
          gap: '0.5rem',
          alignItems: 'flex-end',
          height: '65px',
          padding: '0.4rem 0.6rem',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {hourly.map((val, idx) => {
          const hourNum = idx + 1;
          const isCurrent = hourNum === currentHour;
          const isPast = hourNum <= currentHour;
          const heightPercent = Math.max((val / maxHourMm) * 100, 16);

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
                  fontSize: '0.62rem',
                  color: isCurrent ? '#38bdf8' : '#64748b',
                  fontWeight: isCurrent ? 700 : 500,
                  marginBottom: '2px',
                }}
              >
                {val}m
              </div>
              <div
                style={{
                  width: '100%',
                  height: `${heightPercent}%`,
                  background: isCurrent
                    ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'
                    : isPast
                    ? 'rgba(56, 189, 248, 0.4)'
                    : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  boxShadow: isCurrent ? '0 0 12px rgba(56, 189, 248, 0.8)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              <div
                style={{
                  fontSize: '0.6rem',
                  color: isCurrent ? '#f8fafc' : '#64748b',
                  fontWeight: 600,
                  marginTop: '2px',
                }}
              >
                H{hourNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slider & Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            accentColor: '#38bdf8',
          }}
        />

        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
          Cumulative: <strong className="font-mono" style={{ color: '#38bdf8' }}>{cumulativeMm} mm</strong> / {totalMm} mm
        </div>
      </div>
    </div>
  );
}
