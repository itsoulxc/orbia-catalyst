import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Database,
  Globe,
  Cpu,
  Wrench,
  ShieldAlert
} from 'lucide-react';
import type { ActivityStep } from '../types/catalyst';

interface ThinkingPanelProps {
  steps: ActivityStep[];
  isStreaming: boolean;
  startedAt?: number;
  elapsedSec?: number;
  modelLabel: string;
  tokensPerSec?: number;
}

const KIND_ICON = {
  context: Database,
  search: Globe,
  model: Cpu,
  tool: Wrench,
  resource: ShieldAlert
} as const;

const formatSeconds = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

export const ThinkingPanel: React.FC<ThinkingPanelProps> = ({
  steps,
  isStreaming,
  startedAt,
  elapsedSec,
  modelLabel,
  tokensPerSec
}) => {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isStreaming) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [isStreaming]);

  const liveSec = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const doneSec = Math.max(1, Math.round(elapsedSec ?? liveSec));

  return (
    <div className={`thinking-panel ${open ? 'open' : ''}`}>
      <button type="button" className="thinking-toggle" onClick={() => setOpen(!open)}>
        {isStreaming ? <Loader2 size={13} className="spin text-amber" /> : null}
        <span className={isStreaming ? 'thinking-shimmer' : ''}>
          {isStreaming ? `Thinking for ${formatSeconds(liveSec)}` : `Worked for ${formatSeconds(doneSec)}`}
        </span>
        {!isStreaming && (
          <span className="thinking-meta">
            {modelLabel}
            {tokensPerSec ? ` · ${tokensPerSec} tok/s` : ''}
          </span>
        )}
        <ChevronRight size={13} className="thinking-chevron" />
      </button>

      <div className="thinking-body">
        <div className="thinking-body-inner">
          {steps.length === 0 && <div className="thinking-empty">No activity recorded.</div>}
          {steps.map((st) => {
            const Icon = KIND_ICON[st.kind];
            return (
              <div key={st.id} className={`thinking-step ${st.status}`}>
                <span className="thinking-step-status">
                  {st.status === 'running' && <Loader2 size={13} className="spin text-amber" />}
                  {st.status === 'done' && <CheckCircle2 size={13} className="text-emerald" />}
                  {st.status === 'warning' && <AlertTriangle size={13} className="text-amber" />}
                  {st.status === 'error' && <XCircle size={13} className="text-danger" />}
                </span>
                <div className="thinking-step-text">
                  <div className="thinking-step-label">
                    <Icon size={12} />
                    <span>{st.label}</span>
                    <span className="thinking-step-time">+{(st.at / 1000).toFixed(1)}s</span>
                  </div>
                  {st.detail && <div className="thinking-step-detail">{st.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
