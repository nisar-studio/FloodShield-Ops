import React, { useState, useEffect } from 'react';
import { ShieldAlert, Compass } from 'lucide-react';

const INITIALIZATION_STAGES = [
  { label: 'INITIALIZING FLOOD INTELLIGENCE', progress: 32 },
  { label: 'ESTABLISHING MAP SYSTEM', progress: 68 },
  { label: 'PREPARING RESPONSE DASHBOARD', progress: 100 },
];

export function CinematicIntro({ onComplete }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 1. Honor prefers-reduced-motion immediately
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    // 2. Progression sequence (total ~2.4s)
    const t1 = setTimeout(() => {
      setStageIndex(1);
      setProgress(68);
    }, 750);

    const t2 = setTimeout(() => {
      setStageIndex(2);
      setProgress(100);
    }, 1500);

    const t3 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2200);

    const t4 = setTimeout(() => {
      onComplete?.();
    }, 2600);

    // Initial kick to 32%
    const t0 = setTimeout(() => {
      setProgress(32);
    }, 100);

    // ESC key listener to skip
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ') {
        onComplete?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  const currentStage = INITIALIZATION_STAGES[stageIndex] || INITIALIZATION_STAGES[0];

  return (
    <div
      className={`cinematic-intro-overlay ${isFadingOut ? 'fade-out' : ''}`}
      role="status"
      aria-live="polite"
    >
      {/* Ambient background tactical grid & vignette */}
      <div className="cinematic-ambient-grid" />
      <div className="cinematic-vignette" />

      {/* Skip button for operational efficiency */}
      <button
        type="button"
        onClick={() => onComplete?.()}
        className="cinematic-skip-btn"
        title="Skip intro animation (Esc)"
      >
        <span>SKIP</span>
        <kbd>ESC</kbd>
      </button>

      {/* Central Command Sequence */}
      <div className="cinematic-center-content">
        {/* Emblem with Tactical Radar Sweep & Scanline */}
        <div className="cinematic-emblem-wrap">
          <div className="cinematic-radar-cone" />
          <div className="cinematic-scanline" />

          {/* Tactical Concentric SVG Emblem */}
          <svg
            className="cinematic-emblem-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer dotted calibration ring */}
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="#3C7F82"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              strokeOpacity="0.5"
            />
            {/* Middle tactical ring with crosshairs */}
            <circle
              cx="50"
              cy="50"
              r="38"
              stroke="#6FA9B8"
              strokeWidth="1.5"
              strokeOpacity="0.75"
            />
            <line x1="50" y1="6" x2="50" y2="14" stroke="#6FA9B8" strokeWidth="1.5" />
            <line x1="50" y1="86" x2="50" y2="94" stroke="#6FA9B8" strokeWidth="1.5" />
            <line x1="6" y1="50" x2="14" y2="50" stroke="#6FA9B8" strokeWidth="1.5" />
            <line x1="86" y1="50" x2="94" y2="50" stroke="#6FA9B8" strokeWidth="1.5" />

            {/* Inner Shield / Wave Geometry */}
            <path
              d="M50 24 L72 34 V52 C72 65 62 76 50 80 C38 76 28 65 28 52 V34 L50 24 Z"
              fill="rgba(28, 43, 54, 0.7)"
              stroke="#6FA9B8"
              strokeWidth="2"
            />
            {/* Flood Hydro Wave Curves */}
            <path
              d="M38 52 Q44 46 50 52 T62 52"
              stroke="#3C7F82"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M35 59 Q42.5 53 50 59 T65 59"
              stroke="#6FA9B8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Central telemetry core */}
            <circle cx="50" cy="42" r="3.5" fill="#E4AA55" />
          </svg>
        </div>

        {/* Title with expanding letter-spacing */}
        <h1 className="cinematic-title font-heading">
          FLOODSHIELD OPS
        </h1>

        {/* Subtitle */}
        <div className="cinematic-subtitle font-mono">
          FLOOD INTELLIGENCE &bull; PRE-FLOOD DISPATCH COMMAND
        </div>

        {/* Thin Progress Track & Value */}
        <div className="cinematic-progress-container">
          <div className="cinematic-progress-track">
            <div
              className="cinematic-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="cinematic-progress-meta font-mono">
            <span>SYS//READY</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Sequential System Initialization Labels */}
        <div className="cinematic-label-wrap font-mono">
          <span className="cinematic-beacon" />
          <span className="cinematic-stage-label">
            {currentStage.label}
          </span>
          <span className="cinematic-step-counter">
            [0{stageIndex + 1}/03]
          </span>
        </div>
      </div>

      {/* Footer System Telemetry Coordinates */}
      <div className="cinematic-footer font-mono">
        <span>BANGALORE URBAN // MAHADEVAPURA CORRIDOR [12.90N, 77.65E - 12.99N, 77.76E]</span>
        <span>SECURITY VERIFICATION: DETERMINISTIC ENGINE ACTIVE</span>
      </div>
    </div>
  );
}
