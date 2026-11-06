import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  RefreshCw,
  Cpu,
  Activity,
  Brain,
  Code2,
  Play,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import type { SelfLearningState } from '../types/catalyst';
import { chatService } from '../services/chatService';

export const SelfLearningPanel: React.FC = () => {
  const [state, setState] = useState<SelfLearningState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState<string | null>(null);

  const fetchState = async () => {
    setLoading(true);
    const data = await chatService.getSelfLearningState();
    setState(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleDeleteInsight = async (id: string) => {
    await chatService.deleteLearnedInsight(id);
    fetchState();
  };

  const handleRunTraining = async () => {
    setIsTraining(true);
    setTrainingResult(null);
    const res = await chatService.triggerSelfTrainingPass();
    if (res.ok) {
      setTrainingResult(`Training Pass Complete! Synced ${res.manifest?.positive_pairs || 0} positive reinforcement rules into D:\\Catalyst\\training\\`);
      fetchState();
    }
    setIsTraining(false);
  };

  const profile = state?.profile;
  const insights = profile?.learned_insights || [];
  const langs = profile?.preferred_languages || [];

  return (
    <div className="memory-panel-container panel-enter training-surface">
      <div className="memory-panel-header">
        <div className="memory-header-info">
          <div className="panel-kicker"><span className="status-dot" /> LOCAL FEEDBACK LOOP</div>
          <div className="memory-title-line">
            <Sparkles size={16} className="text-amber" />
            <h3 className="memory-title">Training & feedback</h3>
          </div>
          <p className="memory-subtitle">
            Review local feedback, inspect learned preferences, and run an adapter pass when you have enough signal. Feedback changes guidance; it does not retrain the base model automatically.
          </p>
        </div>

        <div className="memory-header-actions">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleRunTraining}
            disabled={isTraining}
          >
            <Play size={13} />
            <span>{isTraining ? 'Running local pass...' : 'Run training pass'}</span>
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={fetchState}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {trainingResult && (
        <div className="training-success-banner">
          <CheckCircle2 size={15} className="text-emerald" />
          <span>{trainingResult}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="self-learn-metrics-grid">
        <div className="self-learn-stat-card">
          <div className="stat-card-top">
            <Activity size={14} className="text-amber" />
            <span>Adaptation Index</span>
          </div>
          <div className="stat-card-val">{profile?.adaptation_score ?? 100} pts</div>
          <div className="stat-card-sub">
            {profile?.total_turns_observed ?? 0} real interactions analyzed
          </div>
        </div>

        <div className="self-learn-stat-card">
          <div className="stat-card-top">
            <ThumbsUp size={14} className="text-emerald" />
            <span>Positive feedback</span>
          </div>
          <div className="stat-card-val">{state?.likes ?? 0} Recorded</div>
          <div className="stat-card-sub">Stored in self_training_dpo.jsonl</div>
        </div>

        <div className="self-learn-stat-card">
          <div className="stat-card-top">
            <ThumbsDown size={14} className="text-amber" />
            <span>Negative feedback</span>
          </div>
          <div className="stat-card-val">{state?.dislikes ?? 0} Blocked</div>
          <div className="stat-card-sub">Filtered from model inference</div>
        </div>

        <div className="self-learn-stat-card">
          <div className="stat-card-top">
            <Code2 size={14} className="text-amber" />
            <span>Detected Coding Affinity</span>
          </div>
          <div className="stat-card-val">{langs.length || 0} Stacks</div>
          <div className="stat-card-sub">
            {langs.length > 0 ? langs.slice(0, 3).join(', ') : 'Observing code sessions'}
          </div>
        </div>
      </div>

      {/* Training Manifest Status */}
      {state?.training_manifest && (
        <div className="training-manifest-card">
          <div className="manifest-card-header">
            <ShieldCheck size={14} className="text-emerald" />
            <span>Model Weights & Fine-Tuning State (D:\Catalyst\training\)</span>
          </div>
          <div className="manifest-grid">
            <div><strong>Status:</strong> Upgraded & Active</div>
            <div><strong>Reinforced Pairs:</strong> {state.training_manifest.positive_pairs || 0}</div>
            <div><strong>Penalized Pairs:</strong> {state.training_manifest.negative_pairs || 0}</div>
            <div><strong>Last Training Pass:</strong> {state.training_manifest.timestamp || 'Ready'}</div>
          </div>
        </div>
      )}

      {/* Insights List */}
      <div className="self-learn-section">
        <h4 className="self-learn-section-title">
          <Brain size={14} className="text-amber" />
          <span>Learned User Directives & Constraints ({insights.length})</span>
        </h4>

        {insights.length === 0 ? (
          <div className="self-learn-empty">
            <Cpu size={22} className="text-muted" />
            <p>
              Rate responses with Thumbs Up / Down or chat naturally. Catalyst automatically learns your favorite languages, coding styles, and rules without cloud data.
            </p>
          </div>
        ) : (
          <div className="memory-list">
            {insights.map((item) => (
              <div key={item.id} className="memory-item-card">
                <div className="memory-item-header">
                  <div className="memory-item-title-group">
                    <span
                      className={`memory-category-tag ${
                        item.kind.includes('Like')
                          ? 'asset'
                          : item.kind.includes('Correction')
                          ? 'rule'
                          : 'architecture'
                      }`}
                    >
                      <span>{item.kind.toUpperCase()}</span>
                    </span>
                    <span className="memory-key">{item.text}</span>
                  </div>
                  <div className="memory-item-meta">
                    <span className="memory-time">{item.timestamp}</span>
                    <button
                      type="button"
                      className="icon-btn-danger"
                      onClick={() => handleDeleteInsight(item.id)}
                      title="Forget this insight"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
