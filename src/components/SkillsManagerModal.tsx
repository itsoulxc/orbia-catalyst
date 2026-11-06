import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Upload,
  Plus,
  Trash2,
  Check,
  Tag
} from 'lucide-react';
import type { CatalystSkill } from '../types/catalyst';

interface SkillsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: CatalystSkill[];
  onToggleSkill: (id: string) => void;
  onAddSkill: (skill: Omit<CatalystSkill, 'id'>) => void;
  onDeleteSkill: (id: string) => void;
  onImportSkills: (jsonText: string) => boolean;
}

export const SkillsManagerModal: React.FC<SkillsManagerModalProps> = ({
  isOpen,
  onClose,
  skills,
  onToggleSkill,
  onAddSkill,
  onDeleteSkill,
  onImportSkills
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Core Architecture');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [tags] = useState('engineering, modular');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(skills, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'orbia_catalyst_skills.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const ok = onImportSkills(text);
      if (ok) {
        setImportStatus('Skills imported successfully from JSON!');
      } else {
        setImportStatus('Failed to parse JSON file.');
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddSkill({
      name: name.trim(),
      version: '1.0.0',
      category,
      description: description.trim(),
      rules: rules
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      enabled: true
    });

    setIsAdding(false);
    setName('');
    setDescription('');
    setRules('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="skills-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="skills-modal-header">
          <div className="skills-modal-title-group">
            <Sparkles size={18} className="text-amber" />
            <div>
              <h2 className="skills-modal-title">Predefined & Custom Skills</h2>
              <p className="skills-modal-subtitle">
                Modular engineering and architecture capabilities saved to <code>D:\Catalyst\skills\</code>
              </p>
            </div>
          </div>

          <div className="skills-modal-header-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              style={{ display: 'none' }}
            />
            <button
              className="btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import Skills from JSON"
            >
              <Upload size={13} />
              <span>Import JSON</span>
            </button>

            <button
              className="btn-secondary btn-sm"
              onClick={handleExport}
              title="Export Skills as JSON"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>

            {!isAdding && (
              <button
                className="btn-primary btn-sm"
                onClick={() => setIsAdding(true)}
              >
                <Plus size={13} />
                <span>Add Skill</span>
              </button>
            )}

            <button className="icon-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="import-status-banner">
            <Check size={14} className="text-emerald" />
            <span>{importStatus}</span>
          </div>
        )}

        {isAdding ? (
          <form className="skills-add-form" onSubmit={handleAddSubmit}>
            <div className="form-section-title">
              <Plus size={14} className="text-amber" />
              <span>Create New Modular Skill</span>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Skill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dynamic Hallucination Injector"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group flex-1">
                <label>Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Skill Description</label>
              <textarea
                rows={2}
                placeholder="What this skill does and when the model should activate it..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input textarea"
                required
              />
            </div>

            <div className="form-group">
              <label>Strict Rules (One per line)</label>
              <textarea
                rows={3}
                placeholder="e.g. Always check camera transform&#10;Never exceed 16ms latency"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="form-input textarea mono"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Skill to JSON
              </button>
            </div>
          </form>
        ) : (
          <div className="skills-grid">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className={`skill-card ${skill.enabled ? 'active' : 'disabled'}`}
              >
                <div className="skill-card-top">
                  <span className="skill-category-badge">{skill.category}</span>
                  <div className="skill-card-controls">
                    {skill.isCustom && (
                      <button
                        className="icon-btn-danger"
                        onClick={() => onDeleteSkill(skill.id)}
                        title="Delete custom skill"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <button
                      className={`skill-toggle-btn ${skill.enabled ? 'on' : 'off'}`}
                      onClick={() => onToggleSkill(skill.id)}
                    >
                      {skill.enabled ? 'Enabled' : 'Bypassed'}
                    </button>
                  </div>
                </div>

                <h3 className="skill-name">{skill.name}</h3>
                <p className="skill-desc">{skill.description}</p>

                {skill.rules && skill.rules.length > 0 && (
                  <div className="skill-rules-list">
                    {skill.rules.map((rule, idx) => (
                      <div key={idx} className="skill-rule-item">
                        <span className="rule-bullet">•</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="skill-card-footer">
                  <div className="skill-tags">
                    {skill.tags.map((t, i) => (
                      <span key={i} className="skill-tag-pill">
                        <Tag size={10} /> {t}
                      </span>
                    ))}
                  </div>
                  <span className="skill-version">v{skill.version}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
