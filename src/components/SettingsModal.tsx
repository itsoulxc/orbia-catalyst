import React, { useState } from 'react';
import {
  X,
  Cpu,
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  Server
  , Palette
} from 'lucide-react';
import type { CatalystModelInfo, AppSettings, McpServerConfig, ThemeId } from '../types/catalyst';
import { orderModelsForPicker } from '../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: CatalystModelInfo[];
  selectedModel: CatalystModelInfo;
  onSelectModel: (model: CatalystModelInfo) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  mcpServers: McpServerConfig[];
  onOpenSkills: () => void;
  onOpenMcp: () => void;
}

type SettingsTab = 'general' | 'models' | 'themes' | 'hardware' | 'memory-mcp';

const THEMES: Record<'studio' | 'personal', Array<{ id: ThemeId; name: string; description: string; colors: string[] }>> = {
  studio: [
    { id: 'studio-default', name: 'Default', description: 'Warm obsidian, amber focus, and the standard Catalyst workspace.', colors: ['#0d0c0b', '#181614', '#f97316'] },
    { id: 'studio-ember', name: 'Ember Forge', description: 'Deep charcoal with brighter copper accents for long coding sessions.', colors: ['#120c09', '#251611', '#fb923c'] },
    { id: 'studio-graphite', name: 'Graphite', description: 'Cool graphite surfaces with a focused blue-violet accent.', colors: ['#0c1015', '#171d27', '#8b9cf6'] }
  ],
  personal: [
    { id: 'personal-default', name: 'Default', description: 'The Personal workspace: midnight navy surfaces, blue-violet focus, rounded chat controls, and a calm reading layout.', colors: ['#0f121a', '#181d28', '#6366f1'] },
    { id: 'personal-paper', name: 'Lavender Focus', description: 'A cool indigo workspace with soft violet focus states for writing and research.', colors: ['#171b29', '#202638', '#c084fc'] },
    { id: 'personal-mint', name: 'Mint Night', description: 'Calm midnight surfaces with a quiet mint signal color.', colors: ['#0b1517', '#142326', '#2dd4bf'] }
  ]
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  models,
  selectedModel,
  onSelectModel,
  settings,
  onUpdateSettings,
  mcpServers,
  onOpenSkills,
  onOpenMcp
}) => {
  const orderedModels = orderModelsForPicker(models);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [themeMode, setThemeMode] = useState<'studio' | 'personal'>('studio');

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Left Navigation */}
        <aside className="settings-sidebar">
          <div className="settings-sidebar-group">
            <div className="settings-group-label">Catalyst Core</div>
            <button
              className={`settings-nav-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Sliders size={15} />
              <span>General</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              <Cpu size={15} />
              <span>Models on D:\ (4)</span>
            </button>
            <button className={`settings-nav-item ${activeTab === 'themes' ? 'active' : ''}`} onClick={() => setActiveTab('themes')}>
              <Palette size={15} />
              <span>Themes</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'hardware' ? 'active' : ''}`}
              onClick={() => setActiveTab('hardware')}
            >
              <Zap size={15} />
              <span>Hardware & VRAM</span>
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'memory-mcp' ? 'active' : ''}`}
              onClick={() => setActiveTab('memory-mcp')}
            >
              <Server size={15} />
              <span>MCP & Skills</span>
            </button>
          </div>

          <div className="settings-sidebar-footer">
            <div className="settings-feedback-link">D:\Catalyst Core Engine</div>
            <div className="settings-user-card">
              <div className="settings-avatar">O</div>
              <div className="settings-user-info">
                <div className="settings-user-name">Local Architect</div>
                <div className="settings-user-sub">100% On-Device · Zero Cloud</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="settings-content">
          <button className="settings-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>

          {activeTab === 'general' && (
            <div className="settings-pane">
              <h2 className="settings-title">General Engine Settings</h2>
              <p className="settings-subtitle">
                Configure execution autonomy, compilation safety guards, and local storage bounds.
              </p>

              <section className="settings-section">
                <h3 className="settings-section-title">Autonomy Preset</h3>
                <div className="settings-card">
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <div className="settings-row-label">Execution Policy</div>
                      <div className="settings-row-help">
                        Control whether Catalyst runs unattended loops or asks for checkpoint confirmation.
                      </div>
                    </div>
                    <select
                      className="settings-select"
                      value={settings.executionPreset}
                      onChange={(e) => onUpdateSettings({ executionPreset: e.target.value })}
                    >
                      <option value="Continuous Execution">Continuous Execution (24/7)</option>
                      <option value="Turbo Autonomous">Turbo Autonomous</option>
                      <option value="Checkpoint Supervised">Checkpoint Supervised</option>
                    </select>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <div className="settings-row-label">Update delivery</div>
                      <div className="settings-row-help">Choose whether Catalyst downloads verified GitHub updates automatically or asks first.</div>
                    </div>
                    <select className="settings-select" value={settings.updateMode || 'notify'} onChange={(e) => onUpdateSettings({ updateMode: e.target.value as AppSettings['updateMode'] })}>
                      <option value="notify">Notify me</option>
                      <option value="automatic">Download automatically</option>
                      <option value="disabled">Do not check</option>
                    </select>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <div className="settings-row-label">Context compacting ({Math.round((settings.contextCompactThreshold || 42000) / 1000)}k characters)</div>
                      <div className="settings-row-help">Catalyst saves a concise context summary at a safe point before conversations become too large.</div>
                    </div>
                    <input className="settings-slider" type="range" min="16000" max="96000" step="8000" value={settings.contextCompactThreshold || 42000} onChange={(e) => onUpdateSettings({ contextCompactThreshold: Number(e.target.value) })} />
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <div className="settings-row-label">Self-Healing Compiler & AST Check</div>
                      <div className="settings-row-help">
                        Automatically catches syntax errors and memory spikes, applying fixes before code commits.
                      </div>
                    </div>
                    <button
                      className={`settings-pill-btn ${settings.autoCompileCheck ? 'active' : ''}`}
                      onClick={() =>
                        onUpdateSettings({ autoCompileCheck: !settings.autoCompileCheck })
                      }
                    >
                      {settings.autoCompileCheck ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <div className="settings-row-label">Airgap & Privacy Guard</div>
                      <div className="settings-row-help">
                        Strictly prohibits outbound telemetry. All weights, memory, and code stay local on D:\.
                      </div>
                    </div>
                    <span className="settings-badge-locked">
                      <ShieldCheck size={13} /> Airgapped Local
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="settings-pane">
              <h2 className="settings-title">Downloaded Models on D:\ Drive</h2>
              <p className="settings-subtitle">
                All 4 models are stored directly in <code>D:\Catalyst\models\</code> in compressed GGUF format.
              </p>

              <div className="settings-models-list">
                {orderedModels.map((model) => {
                  const isSelected = model.id === selectedModel.id;
                  return (
                    <div
                      key={model.id}
                      className={`settings-model-card ${isSelected ? 'selected' : ''} ${model.downloadStatus !== 'ready' ? 'unavailable' : ''}`}
                      aria-disabled={model.downloadStatus !== 'ready'}
                      onClick={() => model.downloadStatus === 'ready' && onSelectModel(model)}
                    >
                      <div className="settings-model-header">
                        <div>
                          <div className="settings-model-title-row">
                            <span className="settings-model-name">{model.name}</span>
                            <span className={`model-badge ${model.badgeType} ${model.badge.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{model.badge}</span>
                            <span className="settings-verified-pill">
                              {model.downloadStatus === 'ready' ? 'Ready on D:\\' : 'Awaiting GGUF'}
                            </span>
                          </div>
                          <div className="settings-model-family">{model.localPath}</div>
                        </div>
                        <div className="settings-model-speed">
                          <Activity size={14} className="text-amber" />
                          <span>{model.speedRating}</span>
                        </div>
                      </div>

                      <p className="settings-model-desc">{model.plainDescription}</p>

                      <div className="settings-model-specs">
                        <span className="spec-pill">Format: {model.quantization}</span>
                        <span className="spec-pill">Memory: {model.memoryRequirement}</span>
                        <span className="spec-pill">Size: {model.sizeMb} MB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="settings-pane themes-pane">
              <h2 className="settings-title">Themes</h2>
              <p className="settings-subtitle">Choose an independent visual language for each Catalyst mode. Theme changes apply immediately and are saved locally.</p>
              <div className="theme-mode-switcher">
                <button type="button" className={`theme-mode-btn ${themeMode === 'studio' ? 'active' : ''}`} onClick={() => setThemeMode('studio')}>Studio themes</button>
                <button type="button" className={`theme-mode-btn ${themeMode === 'personal' ? 'active' : ''}`} onClick={() => setThemeMode('personal')}>Personal themes</button>
              </div>
              <div className={`theme-grid ${themeMode === 'studio' ? '' : 'theme-hidden'}`}>
                {THEMES.studio.map((theme) => {
                  const selected = settings.studioTheme === theme.id;
                  return (
                    <button type="button" key={theme.id} className={`theme-card ${selected ? 'selected' : ''}`} onClick={() => onUpdateSettings({ studioTheme: theme.id })}>
                      <div className="theme-preview" style={{ background: theme.colors[0] }}>
                        <div className="theme-preview-sidebar" style={{ background: theme.colors[1] }} />
                        <div className="theme-preview-content"><span style={{ background: theme.colors[2] }} /><i /><i /></div>
                      </div>
                      <div className="theme-card-copy"><span className="theme-card-name">{theme.name}</span>{selected && <span className="theme-selected">Selected</span>}<small>{theme.description}</small></div>
                    </button>
                  );
                })}
              </div>
              <div className={`theme-grid ${themeMode === 'personal' ? '' : 'theme-hidden'}`}>
                {THEMES.personal.map((theme) => {
                  const selected = settings.personalTheme === theme.id;
                  return (
                    <button type="button" key={theme.id} className={`theme-card ${selected ? 'selected' : ''}`} onClick={() => onUpdateSettings({ personalTheme: theme.id })}>
                      <div className="theme-preview" style={{ background: theme.colors[0] }}><div className="theme-preview-sidebar" style={{ background: theme.colors[1] }} /><div className="theme-preview-content"><span style={{ background: theme.colors[2] }} /><i /><i /></div></div>
                      <div className="theme-card-copy"><span className="theme-card-name">{theme.name}</span>{selected && <span className="theme-selected">Selected</span>}<small>{theme.description}</small></div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="settings-pane">
              <h2 className="settings-title">Hardware & Memory Allocation</h2>
              <p className="settings-subtitle">
                Keep Catalyst running smooth on any PC by enforcing strict VRAM and RAM ceilings.
              </p>

              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-label">
                      VRAM Allocation Ceiling ({settings.vramCapGb.toFixed(1)} GB)
                    </div>
                    <div className="settings-row-help">
                      Limits model GPU memory usage to leave room for game engine viewports.
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="6.0"
                    step="0.5"
                    value={settings.vramCapGb}
                    onChange={(e) => onUpdateSettings({ vramCapGb: parseFloat(e.target.value) })}
                    className="settings-slider"
                  />
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-label">Primary D:\ Workspace Root</div>
                    <div className="settings-row-help">
                      Where project folders, long-term memory, and model weights reside.
                    </div>
                  </div>
                  <code className="settings-code-badge">{settings.storageConduit}</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'memory-mcp' && (
            <div className="settings-pane">
              <h2 className="settings-title">MCP Tools & Modular Skills</h2>
              <p className="settings-subtitle">
                Manage external Model Context Protocol connections and JSON-based skill rules.
              </p>

              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-label">Model Context Protocol (MCP)</div>
                    <div className="settings-row-help">
                      {mcpServers.length} servers configured (Roblox Studio, DirectStorage, Compilers).
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={onOpenMcp}>
                    Open MCP Manager
                  </button>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-label">Modular Engineering Skills (.json)</div>
                    <div className="settings-row-help">
                      Import, export, and configure code architecture, 3D modelling, and automation skills.
                    </div>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={onOpenSkills}>
                    Open Skills Manager
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
