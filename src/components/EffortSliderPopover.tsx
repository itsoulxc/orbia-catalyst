import React, { useState, useRef, useEffect } from 'react';
import { Gauge, Zap, Cpu, Sparkles, Flame, ChevronDown } from 'lucide-react';
import type { EffortLevel } from '../types/catalyst';

export interface EffortSpec {
  id: EffortLevel;
  label: string;
  index: number;
  tagline: string;
  speedDesc: string;
  resourceDesc: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  color: string;
}

export const EFFORT_SPECS: Record<EffortLevel, EffortSpec> = {
  low: {
    id: 'low',
    label: 'Low',
    index: 0,
    tagline: 'Instant response, minimal system load',
    speedDesc: '3.2x Faster',
    resourceDesc: '~35% CPU / Minimal RAM',
    maxTokens: 512,
    temperature: 0.35,
    topP: 0.85,
    color: '#22c55e'
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    index: 1,
    tagline: 'Balanced reasoning speed and code accuracy',
    speedDesc: '1.5x Faster',
    resourceDesc: '~55% CPU / Balanced RAM',
    maxTokens: 1200,
    temperature: 0.55,
    topP: 0.9,
    color: '#3b82f6'
  },
  high: {
    id: 'high',
    label: 'High',
    index: 2,
    tagline: 'Deep structural verification & multi-step logic',
    speedDesc: 'Standard Speed',
    resourceDesc: '~75% CPU / Full Context',
    maxTokens: 2200,
    temperature: 0.65,
    topP: 0.92,
    color: '#f97316'
  },
  ultra: {
    id: 'ultra',
    label: 'Ultra',
    index: 3,
    tagline: 'Maximum compute budget, exhaustive edge-case synthesis',
    speedDesc: 'Deep Compute',
    resourceDesc: '100% Compute / Self-Verified',
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.95,
    color: '#a855f7'
  }
};

const LEVELS: EffortLevel[] = ['low', 'medium', 'high', 'ultra'];

interface EffortSliderPopoverProps {
  value: EffortLevel;
  onChange: (level: EffortLevel) => void;
}

export const EffortSliderPopover: React.FC<EffortSliderPopoverProps> = ({
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPct, setDragPct] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const currentSpec = EFFORT_SPECS[value] || EFFORT_SPECS.high;
  const activeIdx = currentSpec.index;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleOutside);
    }
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const resolveFromClientX = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const rawPct = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    setDragPct(rawPct * 100);
    const nearestIdx = Math.round(rawPct * 3);
    const nextLevel = LEVELS[nearestIdx];
    if (nextLevel && nextLevel !== value) {
      onChange(nextLevel);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => resolveFromClientX(e.clientX);
    const onUp = () => {
      setIsDragging(false);
      setDragPct(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, value]);

  const fillPercent = dragPct !== null ? dragPct : (activeIdx / 3) * 100;

  return (
    <div className="effort-Control-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`composer-effort-trigger effort-${value} ${isOpen ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={`Reasoning Effort: ${currentSpec.label} (${currentSpec.tagline})`}
      >
        <span className="effort-bars-mini" aria-hidden="true">
          {LEVELS.map((lvl, idx) => (
            <span
              key={lvl}
              className={`effort-bar-pip ${idx <= activeIdx ? 'lit' : ''}`}
              style={{ height: `${6 + idx * 2.5}px` }}
            />
          ))}
        </span>
        <span className="effort-trigger-label">{currentSpec.label}</span>
        <ChevronDown size={11} />
      </button>

      {isOpen && (
        <div className="effort-popover" onClick={(e) => e.stopPropagation()}>
          <div className="effort-popover-header">
            <div className="effort-title-row">
              <Gauge size={13} className="text-amber" />
              <span>Reasoning Effort</span>
            </div>
            <span className={`effort-badge-pill effort-${value}`}>
              {currentSpec.label}
            </span>
          </div>

          <p className="effort-tagline">{currentSpec.tagline}</p>

          {/* Interactive Drag Track (Claude Code style) */}
          <div className="effort-slider-zone">
            <div
              ref={trackRef}
              className={`effort-track ${isDragging ? 'dragging' : ''}`}
              onMouseDown={(e) => {
                setIsDragging(true);
                resolveFromClientX(e.clientX);
              }}
            >
              <div
                className={`effort-track-fill effort-${value}`}
                style={{ width: `${fillPercent}%` }}
              />

              {LEVELS.map((lvl, idx) => {
                const pos = (idx / 3) * 100;
                const isReached = idx <= activeIdx;
                const isCurrent = idx === activeIdx;
                return (
                  <button
                    key={lvl}
                    type="button"
                    className={`effort-node ${isReached ? 'reached' : ''} ${
                      isCurrent ? 'current' : ''
                    }`}
                    style={{ left: `${pos}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(lvl);
                    }}
                  >
                    <span className="effort-node-dot" />
                  </button>
                );
              })}

              <div
                className={`effort-thumb effort-${value} ${isDragging ? 'grabbing' : ''}`}
                style={{ left: `${fillPercent}%` }}
              />
            </div>

            <div className="effort-stops-labels">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`effort-stop-btn ${value === lvl ? 'active' : ''}`}
                  onClick={() => onChange(lvl)}
                >
                  {EFFORT_SPECS[lvl].label}
                </button>
              ))}
            </div>
          </div>

          {/* Telemetry Tradeoff Strip */}
          <div className="effort-tradeoff-grid">
            <div className="effort-metric-box">
              <span className="effort-metric-label">
                <Zap size={11} /> Latency / Speed
              </span>
              <span className="effort-metric-val">{currentSpec.speedDesc}</span>
            </div>
            <div className="effort-metric-box">
              <span className="effort-metric-label">
                <Cpu size={11} /> Resource Budget
              </span>
              <span className="effort-metric-val">{currentSpec.resourceDesc}</span>
            </div>
            <div className="effort-metric-box">
              <span className="effort-metric-label">
                <Sparkles size={11} /> Token Horizon
              </span>
              <span className="effort-metric-val">{currentSpec.maxTokens} max</span>
            </div>
            <div className="effort-metric-box">
              <span className="effort-metric-label">
                <Flame size={11} /> Sampling Temp
              </span>
              <span className="effort-metric-val">{currentSpec.temperature}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
