import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  Gauge,
  Sparkles,
  HardDrive
} from 'lucide-react';
import type { CatalystModelInfo } from '../types/catalyst';
import { orderModelsForPicker } from '../services/storageService';

interface ModelSelectorPopoverProps {
  models: CatalystModelInfo[];
  selectedModel: CatalystModelInfo;
  onSelectModel: (model: CatalystModelInfo) => void;
  onClose: () => void;
  vramCapGb: number;
}

export const ModelSelectorPopover: React.FC<ModelSelectorPopoverProps> = ({
  models,
  selectedModel,
  onSelectModel,
  onClose,
  vramCapGb
}) => {
  const [hoveredModel, setHoveredModel] = useState<CatalystModelInfo | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const orderedModels = orderModelsForPicker(models);
  const legacyIds = new Set(['spark-2.0', 'prism-2.0', 'apex-1.1']);
  const primaryModels = orderedModels.filter((model) => !legacyIds.has(model.id));
  const legacyModels = orderedModels.filter((model) => legacyIds.has(model.id));

  return (
    <div
      className="model-popover-container"
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setHoveredModel(null)}
    >
      {/* Left Card: 3 Models */}
      <div className="model-menu-card">
        <div className="model-menu-header">
          <span>Local Models ({primaryModels.length} + Other)</span>
          <span className="model-menu-sub">Saved on D:\</span>
        </div>

        <div className="model-menu-list">
          {primaryModels.map((model) => {
            const isSelected = model.id === selectedModel.id;
            return (
              <button
                key={model.id}
                className={`model-menu-item ${isSelected ? 'selected' : ''}`}
                onMouseEnter={() => { setOtherOpen(false); setHoveredModel(model); }}
                disabled={model.downloadStatus !== 'ready'}
                onClick={() => {
                  onSelectModel(model);
                  onClose();
                }}
              >
                <div className="model-item-main">
                  <div className="model-item-title-line">
                    <span className="model-item-name">{model.name}</span>
                    <span className={`model-badge ${model.badgeType} ${model.badge.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{model.badge}</span>
                  </div>
                  <div className="model-item-meta">
                    <span className="text-amber">{model.vramFootprint}</span>
                    <span className="dot">•</span>
                    <span>{model.speedRating}</span>
                    <span className="dot">•</span>
                    <span className={model.downloadStatus === 'ready' ? 'text-emerald' : 'text-muted'}>
                      {model.downloadStatus === 'ready' ? 'Ready on D:\\' : 'Model file required'}
                    </span>
                  </div>
                </div>

                <div className="model-item-check">
                  {isSelected ? (
                    <Check size={15} className="text-amber" />
                  ) : (
                    <ChevronRight size={14} className="text-muted" />
                  )}
                </div>
              </button>
            );
          })}

          <div
            className={`model-other-wrap ${otherOpen ? 'open' : ''}`}
            onMouseEnter={() => { setOtherOpen(true); setHoveredModel(null); }}
          >
            <button
              type="button"
              className="model-menu-item model-other-trigger"
              onClick={() => setOtherOpen((open) => !open)}
            >
              <div className="model-item-main">
                <div className="model-item-title-line">
                  <span className="model-item-name">Other</span>
                  <span className="model-badge experimental">Legacy</span>
                </div>
                <div className="model-item-meta">
                  <span>{legacyModels.length} included models</span>
                  <span className="dot">•</span>
                  <span>Fallback options</span>
                </div>
              </div>
              <div className="model-item-check">
                <ChevronRight size={14} className="text-muted" />
              </div>
            </button>

            {otherOpen && (
              <div className="model-other-submenu" onMouseEnter={() => setOtherOpen(true)}>
                <div className="model-menu-header">
                  <span>Other Models</span>
                  <span className="model-menu-sub">Legacy / fallback</span>
                </div>
                <button type="button" className="model-other-back" onClick={() => { setOtherOpen(false); setHoveredModel(null); }}>← Primary models</button>
                {legacyModels.map((model) => {
                  const isSelected = model.id === selectedModel.id;
                  return (
                    <button
                      key={model.id}
                      className={`model-menu-item ${isSelected ? 'selected' : ''}`}
                      onMouseEnter={() => setHoveredModel(model)}
                      disabled={model.downloadStatus !== 'ready'}
                      onClick={() => {
                        onSelectModel(model);
                        onClose();
                      }}
                    >
                      <div className="model-item-main">
                        <div className="model-item-title-line">
                          <span className="model-item-name">{model.name}</span>
                          <span className="model-badge experimental">Legacy</span>
                        </div>
                        <div className="model-item-meta">
                          <span className="text-amber">{model.vramFootprint}</span>
                          <span className="dot">•</span>
                          <span className={model.downloadStatus === 'ready' ? 'text-emerald' : 'text-muted'}>
                            {model.downloadStatus === 'ready' ? 'Ready on D:\\' : 'Model file required'}
                          </span>
                        </div>
                      </div>
                      <div className="model-item-check">
                        {isSelected ? <Check size={15} className="text-amber" /> : <ChevronRight size={14} className="text-muted" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="model-menu-divider" />

        <div className="model-menu-hint">
          <Gauge size={13} className="text-amber" />
          <span>Hover a model for hardware & memory details</span>
        </div>
      </div>

      {/* Right Side: Hover-Only Hardware Details Card */}
      {hoveredModel && (
        <div className="telemetry-side-card" key={hoveredModel.id}>
          <div className="telemetry-header">
            <span>Model Profile & Hardware Fit</span>
            <span className="telemetry-live-pill">
              <HardDrive size={10} /> D:\ Verified
            </span>
          </div>

          <div className="telemetry-section">
            <div className="telemetry-section-title">{hoveredModel.name}</div>
            <p className="model-plain-desc">{hoveredModel.plainDescription}</p>

            <div className="telemetry-row">
              <div className="telemetry-label">
                <span>Hardware Requirement</span>
                <span className="telemetry-sub">{hoveredModel.memoryRequirement}</span>
              </div>
              <div className="telemetry-metric">
                <div className="telemetry-val">
                  <span>{hoveredModel.vramFootprint}</span>
                  <span className="ring-indicator emerald" />
                </div>
                <span className="telemetry-reset">Cap: {vramCapGb.toFixed(1)} GB</span>
              </div>
            </div>

            <div className="telemetry-row">
              <div className="telemetry-label">
                <span>Storage Size on D:\</span>
                <span className="telemetry-sub">GGUF Quantized Format</span>
              </div>
              <div className="telemetry-metric">
                <div className="telemetry-val">
                  <span>{hoveredModel.sizeMb} MB</span>
                  <span className="ring-indicator green" />
                </div>
                <span className="telemetry-reset">Ready to load</span>
              </div>
            </div>

            <div className="telemetry-row">
              <div className="telemetry-label">
                <span>Expected Speed</span>
                <span className="telemetry-sub">Optimized for any standard PC</span>
              </div>
              <div className="telemetry-metric">
                <div className="telemetry-val">
                  <span>{hoveredModel.speedRating}</span>
                  <span className="ring-indicator amber" />
                </div>
                <span className="telemetry-reset">Fast responses</span>
              </div>
            </div>
          </div>

          <div className="telemetry-divider" />

          <div className="telemetry-specialties">
            {hoveredModel.specialties.map((spec, idx) => (
              <span key={idx} className="specialty-chip">
                <Sparkles size={11} />
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
