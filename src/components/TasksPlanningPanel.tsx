import React, { useEffect, useState } from 'react';
import {
  Play,
  CheckCircle2,
  Circle,
  Loader2,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  FileCode,
  HardDrive,
  ExternalLink,
  Wrench,
  Eye,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import type { TaskPlan, TaskItem } from '../types/catalyst';
import { planningService } from '../services/planningService';

interface TasksPlanningPanelProps {
  plan: TaskPlan | null;
  projectPath?: string;
  onUpdatePlan: (plan: TaskPlan) => void;
  onRequestNewPlan: () => void;
}

export const TasksPlanningPanel: React.FC<TasksPlanningPanelProps> = ({
  plan,
  projectPath = 'D:\\Catalyst\\builds',
  onUpdatePlan,
  onRequestNewPlan
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(plan?.tasks[0] || null);
  const [inspectorTab, setInspectorTab] = useState<'code' | 'preview' | 'logs'>('code');

  useEffect(() => {
    if (!plan) return;
    setSelectedTask((current) => plan.tasks.find((task) => task.id === current?.id) || plan.tasks[0] || null);
  }, [plan]);

  if (!plan) {
    return (
      <div className="planning-empty-state">
        <Layers size={32} className="text-muted" />
        <h3 className="empty-title">Evidence-driven task pipeline</h3>
        <p className="empty-sub">
          Each run makes its work visible: inspect the selected workspace, write only source returned by the model,
          validate the artifact, and record a local checkpoint. Catalyst does not claim unrun tests or invented builds.
        </p>
        <button className="btn-primary" onClick={onRequestNewPlan}>
          <Sparkles size={14} />
          <span>Create task plan</span>
        </button>
      </div>
    );
  }

  const executeTask = async (basePlan: TaskPlan, index: number) => {
    let current = { ...basePlan };
    current = await planningService.executeStep(current, index, projectPath, (updated) => {
      onUpdatePlan(updated);
    });
    return current;
  };

  const nextTaskIndex = plan.tasks.findIndex(
    (task) => task.status !== 'completed' && task.status !== 'self_healed'
  );

  const handleExecuteNext = async () => {
    if (isExecuting || nextTaskIndex < 0) return;
    setIsExecuting(true);
    await executeTask(plan, nextTaskIndex);
    setIsExecuting(false);
  };

  const handleExecuteAll = async () => {
    if (isExecuting) return;
    setIsExecuting(true);

    let current = { ...plan };
    for (let i = 0; i < current.tasks.length; i++) {
      if (current.tasks[i].status !== 'completed' && current.tasks[i].status !== 'self_healed') {
        current = await executeTask(current, i);
        if (current.status === 'paused') break;
      }
    }

    setIsExecuting(false);
  };

  const activeTask = selectedTask || plan.tasks[0];
  const hasBuildArtifact = Boolean(activeTask?.artifactPath || plan.tasks.find((t) => t.artifactPath));
  const activeArtifactUrl = activeTask?.preview_url || plan.tasks.find((t) => t.preview_url)?.preview_url;

  return (
    <div className="planning-panel">
      {/* Plan Header */}
      <div className="plan-header">
        <div className="plan-header-left">
          <div className="plan-badge">
            <Activity size={12} className="text-amber" />
            <span>Local Pipeline: {plan.status.toUpperCase()}</span>
          </div>
          <h3 className="plan-title">{plan.title}</h3>
          <span className="plan-target-path">Target Workspace: {projectPath}</span>
        </div>

        <div className="plan-header-actions">
          {plan.status !== 'completed' && (
            <div className="plan-action-group">
              <button type="button" className="btn-secondary btn-sm" onClick={handleExecuteNext} disabled={isExecuting || nextTaskIndex < 0}>
                {isExecuting ? <Loader2 size={13} className="spin" /> : <ArrowRight size={13} />}
                <span>Run next</span>
              </button>
              <button type="button" className="btn-primary btn-sm" onClick={handleExecuteAll} disabled={isExecuting}>
                {isExecuting ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
                <span>Run all</span>
              </button>
            </div>
          )}

          {hasBuildArtifact && activeArtifactUrl && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => window.open(activeArtifactUrl, '_blank')}
              title="Open build in browser window"
            >
              <ExternalLink size={13} />
              <span>Launch Build</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      <div className="plan-progress-wrap">
        <div className="plan-progress-label">
          <span>Completed: {plan.tasks.filter(t => t.status === 'completed' || t.status === 'self_healed').length} / {plan.tasks.length} stages</span>
          <span className="mono">{plan.progressPercent}% complete</span>
        </div>
        <div className="plan-progress-track">
          <div
            className="plan-progress-fill"
            style={{ width: `${plan.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="plan-body-split">
        {/* Left: Actionable Task Stages */}
        <div className="plan-tasks-list">
          {plan.tasks.map((task, idx) => {
            const isSelected = activeTask?.id === task.id;
            return (
              <div
                key={task.id}
                className={`task-row ${task.status} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedTask(task)}
              >
                <div className="task-row-status-icon">
                  {task.status === 'completed' && (
                    <CheckCircle2 size={16} className="text-emerald" />
                  )}
                  {task.status === 'self_healed' && (
                    <span title="Self-healed compiler pass">
                      <Wrench size={16} className="text-amber" />
                    </span>
                  )}
                  {task.status === 'running' && (
                    <Loader2 size={16} className="text-amber spin" />
                  )}
                  {task.status === 'pending' && (
                    <Circle size={16} className="text-muted" />
                  )}
                  {task.status === 'failed' && (
                    <ShieldAlert size={16} className="text-red" />
                  )}
                </div>

                <div className="task-row-content">
                  <div className="task-row-title-row">
                    <span className="task-step-number">0{idx + 1}</span>
                    <span className="task-title">{task.title}</span>
                    {task.self_healed && (
                      <span className="task-badge-pill amber">Self-Healed</span>
                    )}
                  </div>
                  <p className="task-desc">{task.description}</p>
                </div>

                {task.durationMs && (
                  <span className="task-duration mono">{task.durationMs}ms</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Actionable Inspector with Code, Preview & Logs */}
        <div className="plan-inspector">
          {/* Inspector Tabs */}
          <div className="inspector-tab-strip">
            <button
              type="button"
              className={`inspector-tab-btn ${inspectorTab === 'code' ? 'active' : ''}`}
              onClick={() => setInspectorTab('code')}
            >
              <FileCode size={13} />
              <span>Stage result</span>
            </button>

            {hasBuildArtifact && (
              <button
                type="button"
                className={`inspector-tab-btn ${inspectorTab === 'preview' ? 'active' : ''}`}
                onClick={() => setInspectorTab('preview')}
              >
                <Eye size={13} />
                <span>Artifact preview</span>
              </button>
            )}

            <button
              type="button"
              className={`inspector-tab-btn ${inspectorTab === 'logs' ? 'active' : ''}`}
              onClick={() => setInspectorTab('logs')}
            >
              <Terminal size={13} />
              <span>Run log ({plan.logs.length})</span>
            </button>
          </div>

          {/* Tab 1: Code and Task Output */}
          {inspectorTab === 'code' && (
            <div className="inspector-content-area">
              {activeTask ? (
                <div className="inspector-detail">
                  <div className="inspector-detail-header">
                    <span className="inspector-detail-title">{activeTask.title}</span>
                    <span className="mono status-tag">{activeTask.status.toUpperCase()}</span>
                  </div>
                  <p className="inspector-detail-desc">{activeTask.description}</p>

                  {activeTask.output ? (
                    <div className="inspector-output-box">
                      <div className="inspector-output-header">
                        {activeTask.self_healed ? (
                          <>
                            <Wrench size={12} className="text-amber" />
                            <span>Self-Healing Compiler Resolution</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} className="text-emerald" />
                            <span>Execution Result</span>
                          </>
                        )}
                      </div>
                      <pre className="inspector-output">{activeTask.output}</pre>

                      {activeTask.code_preview && (
                        <div className="code-preview-pane">
                          <div className="code-preview-label">Generated Source Preview:</div>
                          <pre className="code-preview-block">
                            <code>{activeTask.code_preview}</code>
                          </pre>
                        </div>
                      )}

                      {activeTask.artifactPath && (
                        <div className="artifact-path-row">
                          <div className="artifact-path-pill">
                            <FileCode size={12} className="text-amber" />
                            <span className="mono">{activeTask.artifactPath}</span>
                          </div>
                          {activeTask.preview_url && (
                            <button
                              type="button"
                              className="btn-secondary btn-xs"
                              onClick={() => setInspectorTab('preview')}
                            >
                              <Play size={11} /> Test in Sandbox
                            </button>
                          )}
                        </div>
                      )}

                      {activeTask.evidence && activeTask.evidence.length > 0 && (
                        <div className="task-evidence">
                          <div className="code-preview-label">Evidence</div>
                          <ul>
                            {activeTask.evidence.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inspector-pending-box">
                      <Activity size={18} className="text-muted" />
                      <span>Stage pending. Run the pipeline to collect evidence for this step.</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Tab 2: Live Sandbox Preview */}
          {inspectorTab === 'preview' && (
            <div className="inspector-preview-area">
              {activeArtifactUrl ? (
                <iframe
                  title="Catalyst Live Preview Sandbox"
                  src={activeArtifactUrl}
                  className="interactive-sandbox-frame"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="inspector-pending-box">
                  <span>No build artifact ready for interactive preview. Execute the synthesis stage first.</span>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Compiler Logs */}
          {inspectorTab === 'logs' && (
            <div className="inspector-logs-area">
              <div className="inspector-logs-label">
                <HardDrive size={11} className="text-muted" />
                <span>Local stage log (D:\Catalyst):</span>
              </div>
              <div className="inspector-logs">
                {plan.logs.map((log, i) => (
                  <div key={i} className="log-line">
                    <span className="log-ts">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
