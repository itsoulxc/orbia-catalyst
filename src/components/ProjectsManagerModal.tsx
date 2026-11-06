import React, { useState } from 'react';
import {
  X,
  FolderGit2,
  Plus,
  HardDrive,
  Cpu,
  Clock,
  ArrowRight,
  Gamepad2,
  Box,
  Wrench,
  FileText,
  ChevronDown
} from 'lucide-react';
import type { Project } from '../types/catalyst';

interface ProjectsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (proj: Omit<Project, 'id' | 'createdAt' | 'lastActiveAt' | 'activeCycle'>) => void;
  onDeleteProject: (id: string) => void;
}

const TEMPLATES = [
  { id: 'web-game', label: 'Web Game', stack: 'HTML5 Canvas / JavaScript', hint: 'Playable browser game with a game loop', icon: Gamepad2 },
  { id: '3d-game', label: '3D Game', stack: 'Three.js / WebGL', hint: 'Real-time 3D scene and controls', icon: Box },
  { id: 'tool', label: 'Tool / Script', stack: 'Python', hint: 'Automation or command-line utility', icon: Wrench },
  { id: 'blank', label: 'Blank', stack: 'General', hint: 'Empty workspace, define everything yourself', icon: FileText }
] as const;

const PROJECTS_ROOT = 'D:\\Catalyst\\projects\\';

export const ProjectsManagerModal: React.FC<ProjectsManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]['id']>('web-game');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPath, setCustomPath] = useState('');

  if (!isOpen) return null;

  const tpl = TEMPLATES.find((t) => t.id === template)!;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const path = customPath.trim() || `${PROJECTS_ROOT}${slug || 'new-project'}`;

  const reset = () => {
    setIsCreating(false);
    setName('');
    setDescription('');
    setCustomPath('');
    setShowAdvanced(false);
    setTemplate('web-game');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await fetch('http://127.0.0.1:8008/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, template, name: name.trim() })
      });
    } catch {
      /* engine offline: the project is still registered locally */
    }

    onCreateProject({
      name: name.trim(),
      slug: slug || 'new-project',
      description: description.trim() || `${tpl.label} project`,
      path,
      techStack: tpl.stack
    });
    reset();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="projects-modal" onClick={(e) => e.stopPropagation()}>
        <div className="projects-modal-header">
          <div className="projects-modal-title-group">
            <FolderGit2 size={18} className="text-amber" />
            <div>
              <h2 className="projects-modal-title">{isCreating ? 'New Project' : 'Projects'}</h2>
              <p className="projects-modal-subtitle">
                {isCreating
                  ? 'Pick a template and name it. Everything else is set up for you.'
                  : 'Each project keeps its own files, memory and build history.'}
              </p>
            </div>
          </div>
          <div className="projects-modal-header-actions">
            {!isCreating && (
              <button type="button" className="btn-primary btn-sm" onClick={() => setIsCreating(true)}>
                <Plus size={14} />
                <span>New Project</span>
              </button>
            )}
            <button type="button" className="icon-btn" onClick={isCreating ? reset : onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {isCreating ? (
          <form className="create-project-form" onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label>Template</label>
              <div className="template-grid">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`template-card ${template === t.id ? 'selected' : ''}`}
                      onClick={() => setTemplate(t.id)}
                    >
                      <Icon size={18} />
                      <span className="template-card-title">{t.label}</span>
                      <span className="template-card-hint">{t.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Project name</label>
              <input
                type="text"
                placeholder="e.g. Space Defender"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input"
                autoFocus
              />
              <span className="form-help mono">{path}</span>
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                rows={2}
                placeholder="What are you building?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input textarea"
              />
            </div>

            <button type="button" className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
              <ChevronDown size={13} className={showAdvanced ? 'rot' : ''} />
              <span>Advanced</span>
            </button>
            {showAdvanced && (
              <div className="form-group">
                <label>Custom location</label>
                <input
                  type="text"
                  value={customPath}
                  placeholder={`${PROJECTS_ROOT}${slug || 'new-project'}`}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="form-input mono"
                />
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={reset}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!name.trim()}>
                Create Project
              </button>
            </div>
          </form>
        ) : (
          <div className="projects-grid">
            {projects.length === 0 && (
              <div className="projects-empty">
                <FolderGit2 size={26} className="text-muted" />
                <p>No projects yet. Create one to get started.</p>
              </div>
            )}
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              return (
                <div
                  key={proj.id}
                  className={`project-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSelectProject(proj.id);
                    onClose();
                  }}
                >
                  <div className="project-card-top">
                    <div className="project-card-badge-row">
                      <span className="project-tech-badge">
                        <Cpu size={11} /> {proj.techStack}
                      </span>
                      {isActive && <span className="project-active-pill">Active</span>}
                    </div>
                    <span className="project-cycle">
                      <Clock size={11} /> {proj.activeCycle}
                    </span>
                  </div>

                  <h3 className="project-name">{proj.name}</h3>
                  <p className="project-desc">{proj.description}</p>

                  <div className="project-card-footer">
                    <div className="project-path">
                      <HardDrive size={12} />
                      <span>{proj.path}</span>
                    </div>
                    <div className="project-select-indicator">
                      <span>{isActive ? 'Current' : 'Open'}</span>
                      <ArrowRight size={12} />
                    </div>
                    <button
                      type="button"
                      className="project-delete-btn"
                      title={`Delete ${proj.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (window.confirm(`Delete project "${proj.name}"? Its local project record, chats, and memory will be removed.`)) {
                          onDeleteProject(proj.id);
                        }
                      }}
                    >
                      <X size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
