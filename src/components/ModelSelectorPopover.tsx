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
  const orderedModels = orderModelsForPicker(models);

  return (
    <div
      className="model-popover-container"
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setHoveredModel(null)}
    >
      {/* Left Card: 3 Models */}
      <div className="model-menu-card">
        <div className="model-menu-header">
          <span>Local Models ({orderedModels.length})</span>
          <span className="model-menu-sub">Saved on D:\</span>
        </div>

        <div className="model-menu-list">
          {orderedModels.map((model) => {
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
