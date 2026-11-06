export type ModelTier = 'ultra-light' | 'balanced' | 'deep-reasoning';
export type EffortLevel = 'low' | 'medium' | 'high' | 'ultra';
export type AppMode = 'studio' | 'personal';
export type ThemeId = 'studio-default' | 'studio-ember' | 'studio-graphite' | 'personal-default' | 'personal-paper' | 'personal-mint';
export type DownloadStatus = 'ready' | 'downloading' | 'pending' | 'error';

export interface CatalystModelInfo {
  id: string;
  name: string;
  shortName: string;
  family: string;
  tier: ModelTier;
  badge: string;
  badgeType: 'new' | 'ultra' | 'experimental';
  plainDescription: string;
  quantization: string;
  memoryRequirement: string;
  vramFootprint: string;
  speedRating: string;
  localFile: string;
  localPath: string;
  sizeMb: number;
  downloadStatus: DownloadStatus;
  specialties: string[];
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  path: string;
  createdAt: string;
  lastActiveAt: string;
  techStack: string;
  activeCycle: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AttachedAsset {
  id: string;
  name: string;
  type: 'image' | 'file' | 'code';
  path: string;
  size_kb: number;
  summary?: string;
  content_preview?: string;
  thumbnail_base64?: string;
  ocr_text?: string;
  url?: string;
}

export interface ScheduledMessage {
  id: string;
  text: string;
  attachments: AttachedAsset[];
  createdAt: number;
}

export interface ActivityStep {
  id: string;
  kind: 'context' | 'search' | 'model' | 'tool' | 'resource';
  label: string;
  detail?: string;
  status: 'running' | 'done' | 'warning' | 'error';
  at: number;
}

export interface ResourceNotice {
  level: 'warning' | 'halt';
  message: string;
  reasons: string[];
}

export interface ChatMessage {
  startedAt?: number;
  activity?: ActivityStep[];
  resourceNotice?: ResourceNotice;
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  modelId?: string;
  promptText?: string;
  isStreaming?: boolean;
  planId?: string;
  elapsedSec?: number;
  tokensPerSec?: number;
  totalTokens?: number;
  rating?: 'up' | 'down' | null;
  ratingReason?: string;
  searchResults?: WebSearchResult[];
  learnedInsights?: string[];
  attachments?: AttachedAsset[];
}

export interface ChatConversation {
  id: string;
  projectId: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SideChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'self_healed';
export type TaskAction = 'inspect_workspace' | 'write_artifact' | 'validate_artifact' | 'verify_workspace' | 'checkpoint';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  action: TaskAction;
  status: TaskStatus;
  durationMs?: number;
  output?: string;
  artifactPath?: string;
  code_preview?: string;
  preview_url?: string;
  self_healed?: boolean;
  evidence?: string[];
}

export interface TaskPlan {
  id: string;
  projectId: string;
  title: string;
  prompt: string;
  status: 'planned' | 'executing' | 'completed' | 'paused' | 'failed';
  tasks: TaskItem[];
  progressPercent: number;
  logs: string[];
  createdAt: string;
  generatedSource?: string;
  generatedLanguage?: string;
  sourceStatus?: 'pending' | 'available' | 'unavailable';
}

export interface ProjectMemoryItem {
  id: string;
  projectId: string;
  key: string;
  value: string;
  category: 'architecture' | 'rule' | 'constraint' | 'lore' | 'asset';
  updatedAt: string;
}

export interface CatalystSkill {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  rules: string[];
  tags: string[];
  enabled: boolean;
  isCustom?: boolean;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse';
  commandOrUrl: string;
  args?: string[];
  status: 'connected' | 'disconnected' | 'connecting';
  toolsCount: number;
  enabled: boolean;
}

export interface LearnedInsight {
  id: string;
  kind: string;
  text: string;
  timestamp: string;
}

export interface SelfLearningState {
  profile: {
    total_turns_observed: number;
    adaptation_score: number;
    learned_insights: LearnedInsight[];
    preferred_languages: string[];
    last_training_pass?: string;
  };
  dpo_count: number;
  likes: number;
  dislikes: number;
  training_manifest?: {
    status?: string;
    version?: string;
    positive_pairs?: number;
    negative_pairs?: number;
    adaptation_score?: number;
    timestamp?: string;
  };
}

export interface AppSettings {
  vramCapGb: number;
  executionPreset: string;
  storageConduit: string;
  autoCompileCheck: boolean;
  activeModelId: string;
  sideChatModelId: string;
  telemetryOverlay: boolean;
  temperature: number;
  selfLearningEnabled: boolean;
  effortLevel: EffortLevel;
  appMode?: AppMode;
  studioTheme: ThemeId;
  personalTheme: ThemeId;
  contextCompactThreshold?: number;
  updateMode?: 'automatic' | 'notify' | 'disabled';
}
