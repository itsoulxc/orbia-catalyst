import React, { useState } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Tag,
  ShieldAlert,
  Sliders,
  Sparkles,
  BookOpen
} from 'lucide-react';
import type { ProjectMemoryItem } from '../types/catalyst';

interface MemoryPanelProps {
  memories: ProjectMemoryItem[];
  projectName: string;
  onAddMemory: (memory: Omit<ProjectMemoryItem, 'id' | 'updatedAt'>) => void;
  onDeleteMemory: (id: string) => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  memories,
  projectName,
  onAddMemory,
  onDeleteMemory
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<ProjectMemoryItem['category']>('architecture');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;

    onAddMemory({
      projectId: 'active',
      key: key.trim(),
      value: value.trim(),
      category
    });

    setKey('');
    setValue('');
    setIsAdding(false);
  };

  const getCategoryIcon = (cat: ProjectMemoryItem['category']) => {
    switch (cat) {
      case 'architecture':
        return <Sliders size={12} />;
      case 'rule':
        return <ShieldAlert size={12} />;
      case 'constraint':
        return <Tag size={12} />;
      case 'lore':
        return <BookOpen size={12} />;
      case 'asset':
        return <Sparkles size={12} />;
    }
  };

  return (
    <div className="memory-panel-container panel-enter memory-surface">
      <div className="memory-panel-header">
        <div className="memory-header-info">
          <div className="panel-kicker"><span className="status-dot" /> PROJECT CONTEXT</div>
          <div className="memory-title-line">
            <Brain size={16} className="text-amber" />
            <h3 className="memory-title">Project memory</h3>
          </div>
          <p className="memory-subtitle">
            Durable decisions and constraints for <strong>{projectName}</strong>. Keep entries concise so Studio context stays useful.
          </p>
        </div>

        <button
          className="btn-primary btn-sm"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus size={13} />
          <span>Add entry</span>
        </button>
      </div>

      {isAdding && (
        <form className="memory-add-card" onSubmit={handleAddSubmit}>
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Memory Key / Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Camera Collision Rule"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="form-input"
                autoFocus
                required
              />
            </div>
            <div className="form-group flex-1">
              <label>Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="architecture">Architecture</option>
                <option value="rule">Rule</option>
                <option value="constraint">Constraint</option>
                <option value="lore">Lore / Atmosphere</option>
                <option value="asset">Asset Pipeline</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Memory Value & Guideline</label>
            <textarea
              rows={2}
              placeholder="e.g. Never spawn enemies inside the player's camera view..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="form-input textarea"
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm">
              Save entry
            </button>
          </div>
        </form>
      )}

      <div className="memory-list">
        {memories.map((mem) => (
          <div key={mem.id} className="memory-item-card">
            <div className="memory-item-header">
              <div className="memory-item-title-group">
                <span className={`memory-category-tag ${mem.category}`}>
                  {getCategoryIcon(mem.category)}
                  <span>{mem.category.toUpperCase()}</span>
                </span>
                <span className="memory-key">{mem.key}</span>
              </div>
              <div className="memory-item-meta">
                <span className="memory-time">{mem.updatedAt}</span>
                <button
                  className="icon-btn-danger"
                  onClick={() => onDeleteMemory(mem.id)}
                  title="Delete memory"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <p className="memory-value">{mem.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
