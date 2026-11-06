import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Settings,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Activity,
  Shield,
  Layers,
  Minus,
  Square,
  X,
  Brain,
  MessageSquare,
  FolderGit2,
  Server,
  Sparkles,
  Globe,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  FileCode2,
  Trash2,
  Paperclip,
  Folder,
  AtSign,
  Compass,
  Image as ImageIcon,
  Play,
  ShieldAlert
  , StopCircle
} from 'lucide-react';
import type {
  Project,
  CatalystModelInfo,
  ProjectMemoryItem,
  CatalystSkill,
  McpServerConfig,
  AppSettings,
  ChatMessage,
  ChatConversation,
  AttachedAsset
} from './types/catalyst';
import {
  INITIAL_MODELS,
  storageService
} from './services/storageService';
import { skillsService } from './services/skillsService';
import { chatService, shouldAutoSearch } from './services/chatService';

import { ThinkingPanel } from './components/ThinkingPanel';
import { EffortSliderPopover } from './components/EffortSliderPopover';
import { OrbiaLogo } from './components/OrbiaLogo';
import { ModelSelectorPopover } from './components/ModelSelectorPopover';
import { SettingsModal } from './components/SettingsModal';
import { SideChat } from './components/SideChat';
import { ProjectsManagerModal } from './components/ProjectsManagerModal';
import { WorkspacePanel } from './components/WorkspacePanel';
import { BrowserPanel } from './components/BrowserPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { SelfLearningPanel } from './components/SelfLearningPanel';
import { SkillsManagerModal } from './components/SkillsManagerModal';
import { McpServersModal } from './components/McpServersModal';
import { MarkdownCodeRenderer } from './components/MarkdownCodeRenderer';
import './App.css';

type MainView = 'canvas' | 'workspace' | 'memory' | 'self-learning';

export function App() {
  const [models, setModels] = useState<CatalystModelInfo[]>(INITIAL_MODELS);
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [selectedModel, setSelectedModel] = useState<CatalystModelInfo>(
    INITIAL_MODELS.find((m) => m.id === settings.activeModelId) || INITIAL_MODELS[1]
  );
  const [projects, setProjects] = useState<Project[]>(storageService.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0]?.id || 'default');
  const [activeNavView, setActiveNavView] = useState<MainView>('canvas');
  const [browserRequestUrl, setBrowserRequestUrl] = useState('');
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const appMode = settings.appMode || 'studio';
  const effectiveProjectId = appMode === 'personal' ? '__personal__' : activeProjectId;

  // Conversations & Messages
  const [conversations, setConversations] = useState<ChatConversation[]>(
    storageService.getConversations(effectiveProjectId)
  );
  const [activeConvId, setActiveConvId] = useState<string>(
    storageService.getConversations(effectiveProjectId)[0]?.id || ''
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    storageService.getConversations(effectiveProjectId)[0]?.messages || []
  );

  // File Attachments for current composer turn
  const [attachments, setAttachments] = useState<AttachedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Domain states
  const [memories, setMemories] = useState<ProjectMemoryItem[]>([]);
  const [skills, setSkills] = useState<CatalystSkill[]>(skillsService.getAllSkills());
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>(storageService.getMcpServers());

  // Online & Self-learning live telemetry
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [adaptationScore, setAdaptationScore] = useState<number>(100);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [dislikesCount, setDislikesCount] = useState<number>(0);
  const [showOverviewCard, setShowOverviewCard] = useState<boolean>(true);

  // Modals & UI panels
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [isSideChatOpen, setIsSideChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<'project' | 'preset' | null>(null);

  // Chat interaction state
  const [promptInput, setPromptInput] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [dislikePromptMsgId, setDislikePromptMsgId] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const [resourceState, setResourceState] = useState<{ level: string; ram_percent: number; ram_free_mb: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch('http://127.0.0.1:8008/api/system/resources');
        if (r.ok && alive) setResourceState(await r.json());
      } catch {
        if (alive) setResourceState(null);
      }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const turnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Poll engine health & online status
  useEffect(() => {
    const syncHealth = async () => {
      const h = await chatService.checkHealth();
      setIsOnline(h.online);
      if (h.models) {
        setModels((current) => current.map((model) => {
          const runtime = h.models?.find((item) => item.id === model.id);
          if (!runtime) return model;
          return {
            ...model,
            localPath: runtime.path,
            downloadStatus: runtime.ready ? 'ready' : 'pending'
          };
        }));
      }
      if (h.selfLearning) {
        setAdaptationScore(h.selfLearning.adaptation_score);
        setLikesCount(h.selfLearning.likes);
        setDislikesCount(h.selfLearning.dislikes);
      }
    };
    syncHealth();
    const timer = setInterval(syncHealth, 12000);
    return () => clearInterval(timer);
  }, []);

  // Sync project / mode state
  useEffect(() => {
    const projConvs = storageService.getConversations(effectiveProjectId);
    setConversations(projConvs);
    if (projConvs.length > 0) {
      setActiveConvId(projConvs[0].id);
      setMessages(projConvs[0].messages);
    } else {
      setActiveConvId('');
      setMessages([]);
    }
    setMemories(storageService.getMemories(activeProjectId));
  }, [effectiveProjectId, activeProjectId]);

  const scrollToBottom = (smooth = true) => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottomBtn(distanceFromBottom > 160);
  };

  const persistMessages = (
    updatedMessages: ChatMessage[],
    titleHint?: string,
    forcedConvId?: string
  ): string => {
    setMessages(updatedMessages);
    let convId = forcedConvId || activeConvId;
    let currentConvs = storageService.getConversations(effectiveProjectId);

    if (!convId) {
      convId = `conv-${Date.now()}`;
      setActiveConvId(convId);
    }

    const existing = currentConvs.find((c) => c.id === convId);
    const derivedTitle =
      existing?.title || (titleHint ? titleHint.slice(0, 42) : 'New Chat');

    const convObj: ChatConversation = {
      id: convId,
      projectId: effectiveProjectId,
      title: derivedTitle,
      updatedAt: 'Just now',
      messages: updatedMessages
    };

    storageService.saveConversation(convObj);
    setConversations(storageService.getConversations(effectiveProjectId));
    return convId;
  };

  const handleStartNewConversation = () => {
    setActiveNavView('canvas');
    setActiveConvId('');
    setMessages([]);
    setAttachments([]);
  };

  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveNavView('canvas');
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setTimeout(() => scrollToBottom(false), 40);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const conversation = conversations.find((conv) => conv.id === id);
    if (!window.confirm(`Delete chat "${conversation?.title || 'Untitled chat'}"? This cannot be undone.`)) return;
    storageService.deleteConversation(id);
    const remaining = storageService.getConversations(effectiveProjectId);
    setConversations(remaining);
    if (activeConvId === id) {
      setActiveConvId(remaining[0]?.id || '');
      setMessages(remaining[0]?.messages || []);
    }
  };

  // Upload Asset Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setShowAttachMenu(false);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploaded = await chatService.uploadAssetFile(file);
      if (uploaded) {
        setAttachments((prev) => [...prev, uploaded]);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Project handlers
  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setOpenMenu(null);
  };

  const handleCreateProject = (
    projData: Omit<Project, 'id' | 'createdAt' | 'lastActiveAt' | 'activeCycle'>
  ) => {
    const newProj: Project = {
      ...projData,
      id: `proj-${Date.now()}`,
      createdAt: 'Just now',
      lastActiveAt: 'Just now',
      activeCycle: 'Checkpoint #001'
    };
    const updated = [newProj, ...projects];
    setProjects(updated);
    storageService.saveProjects(updated);
    setActiveProjectId(newProj.id);
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter((project) => project.id !== id);
    storageService.saveProjects(updated);
    setProjects(updated);
    storageService.deleteConversationsForProject(id);
    storageService.deleteMemoriesForProject(id);
    if (activeProjectId === id) {
      setActiveProjectId(updated[0]?.id || 'default');
    }
  };

  // Memory handlers
  const handleAddMemory = (mem: Omit<ProjectMemoryItem, 'id' | 'updatedAt'>) => {
    const added = storageService.addMemory({ ...mem, projectId: activeProjectId });
    setMemories((prev) => [added, ...prev]);
  };

  const handleDeleteMemory = (id: string) => {
    storageService.deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Skills handlers
  const handleToggleSkill = (id: string) => {
    skillsService.toggleSkill(id);
    setSkills([...skillsService.getAllSkills()]);
  };

  const handleAddSkill = (skill: Omit<CatalystSkill, 'id'>) => {
    skillsService.addSkill(skill);
    setSkills([...skillsService.getAllSkills()]);
  };

  const handleDeleteSkill = (id: string) => {
    skillsService.deleteSkill(id);
    setSkills([...skillsService.getAllSkills()]);
  };

  const handleImportSkills = (jsonText: string) => {
    const success = skillsService.importSkillsFromJson(jsonText);
    if (success) {
      setSkills([...skillsService.getAllSkills()]);
    }
    return success;
  };

  // MCP handlers
  const handleToggleMcpServer = (id: string) => {
    const updated = mcpServers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setMcpServers(updated);
    storageService.saveMcpServers(updated);
  };

  const handleAddMcpServer = (
    server: Omit<McpServerConfig, 'id' | 'status' | 'toolsCount'>
  ) => {
    const newServer: McpServerConfig = {
      ...server,
      id: `mcp-${Date.now()}`,
      status: 'connected',
      toolsCount: 8
    };
    const updated = [...mcpServers, newServer];
    setMcpServers(updated);
    storageService.saveMcpServers(updated);
  };

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    storageService.saveSettings(updated);
  };

  // Send Main Message
  const handleSendMessage = async (overridePrompt?: string) => {
    const input = (overridePrompt ?? promptInput).trim();
    if (isSynthesizing) {
      chatService.cancelActiveGeneration();
      return;
    }
    if (!input && attachments.length === 0) return;

    setActiveNavView('canvas');
    setIsSynthesizing(true);
    if (!overridePrompt) setPromptInput('');

    const currentAttachments = [...attachments];
    setAttachments([]);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input || (currentAttachments.length > 0 ? `Inspect attached files (${currentAttachments.length})` : ''),
      timestamp: 'Just now',
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    const tempAssistantId = `asst-${Date.now() + 1}`;
    const placeholderAssistant: ChatMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      timestamp: 'Streaming...',
      modelUsed: selectedModel.name,
      modelId: selectedModel.id,
      promptText: input,
      isStreaming: true,
      startedAt: Date.now(),
      activity: []
    };

    const initialThread = [...messages, userMsg, placeholderAssistant];
    const assignedConvId = persistMessages(initialThread, input);
    setTimeout(() => scrollToBottom(true), 30);

    const completedMsg = await chatService.sendMainMessage(
      input,
      selectedModel,
      effectiveProjectId,
      activeProject?.path,
      messages,
      currentAttachments,
      shouldAutoSearch(input, isOnline),
      settings.effortLevel || 'high',
      {
        onSearchResults: (results) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, searchResults: results } : m
            )
          );
        },
        onToken: (partialText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, content: partialText } : m
            )
          );
        },
        onActivity: (steps) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempAssistantId ? { ...m, activity: steps } : m))
          );
        },
        onResource: (notice) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempAssistantId ? { ...m, resourceNotice: notice } : m))
          );
        },
        onLearned: (insights) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? { ...m, learnedInsights: insights } : m
            )
          );
          setAdaptationScore((s) => s + insights.length * 7);
        }
      },
      appMode
    );

    const finalThread = initialThread.map((m) =>
      m.id === tempAssistantId ? { ...completedMsg, id: tempAssistantId, isStreaming: false, startedAt: m.startedAt } : m
    );
    persistMessages(finalThread, input, assignedConvId);
    setIsSynthesizing(false);
  };

  const handleRateMessage = async (
    msg: ChatMessage,
    rating: 'up' | 'down',
    reason?: string
  ) => {
    const updated = messages.map((m) =>
      m.id === msg.id ? { ...m, rating, ratingReason: reason } : m
    );
    persistMessages(updated);
    setDislikePromptMsgId(null);

    const res = await chatService.submitFeedback({
      messageId: msg.id,
      modelId: msg.modelId || selectedModel.id,
      prompt: msg.promptText || '',
      response: msg.content,
      rating,
      reason
    });

    if (res.likes !== undefined) setLikesCount(res.likes);
    if (res.dislikes !== undefined) setDislikesCount(res.dislikes);
    if (res.adaptation_score !== undefined) setAdaptationScore(res.adaptation_score);
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 1800);
  };

  const activeSkillsCount = skills.filter((s) => s.enabled).length;

  return (
    <div
      className={`catalyst-window ${appMode === 'personal' ? 'personal-mode' : 'studio-mode'} theme-${appMode === 'personal' ? settings.personalTheme : settings.studioTheme} ${isBrowserOpen ? 'browser-open' : ''}`}
      onClick={() => {
        if (isModelPopoverOpen) setIsModelPopoverOpen(false);
        if (openMenu) setOpenMenu(null);
        if (showAttachMenu) setShowAttachMenu(false);
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        style={{ display: 'none' }}
      />

      {/* Top Desktop Titlebar */}
      <header className="titlebar">
        <div className="titlebar-left">
          <div className="titlebar-brand">
            <OrbiaLogo size={16} />
            <span className="titlebar-app-name">Catalyst</span>
          </div>

          {/* Claude-style Top-Left Mode Switcher */}
          <div className="mode-switcher-tabs">
            <button
              type="button"
              className={`mode-tab-btn ${appMode === 'studio' ? 'active' : ''}`}
              onClick={() => {
                handleUpdateSettings({ appMode: 'studio' });
                setActiveNavView('canvas');
              }}
              title="Catalyst Studio — Autonomous Engineering, Code & Game Systems"
            >
              <Terminal size={12} />
              <span>Studio</span>
            </button>
            <button
              type="button"
              className={`mode-tab-btn personal ${appMode === 'personal' ? 'active' : ''}`}
              onClick={() => {
                handleUpdateSettings({ appMode: 'personal' });
                setActiveNavView('canvas');
              }}
              title="Catalyst Personal — Everyday Assistant, Writing & Quick Answers"
            >
              <Sparkles size={12} />
              <span>Personal</span>
            </button>
          </div>

          {appMode === 'studio' && (
            <nav className="titlebar-menu">
              <span onClick={() => setIsProjectsModalOpen(true)}>Workspaces</span>
              <span onClick={() => setIsSkillsModalOpen(true)}>Skills</span>
              <span onClick={() => setIsMcpModalOpen(true)}>MCP Tools</span>
              <span onClick={() => setActiveNavView('self-learning')}>Self-Learning</span>
            </nav>
          )}
        </div>

        <div className="titlebar-center">
          <div className="titlebar-telemetry-pill">
            <span className={`pulse-dot ${isSynthesizing ? 'active' : ''}`} />
            <span>
              {appMode === 'personal'
                ? 'Catalyst Personal'
                : activeProject
                  ? activeProject.name
                  : 'Studio Workspace'}
            </span>
            <span className="sep">•</span>
            <span className="text-amber">{selectedModel.shortName}</span>
            <span className="sep">•</span>
            <span>{selectedModel.speedRating}</span>
            {appMode === 'studio' && (
              <>
                <span className="sep">•</span>
                <span className="text-emerald">IQ {adaptationScore}</span>
              </>
            )}
          </div>
        </div>

        <div className="titlebar-controls">
          {appMode === 'studio' && (
            <>
              <button
                type="button"
                className={`titlebar-side-btn ${showOverviewCard ? 'active' : ''}`}
                onClick={() => setShowOverviewCard(!showOverviewCard)}
                title="Toggle Overview Panel"
              >
                <Activity size={12} />
                <span>Overview</span>
              </button>
              <button
                type="button"
                className={`titlebar-side-btn ${isSideChatOpen ? 'active' : ''}`}
                onClick={() => { setIsBrowserOpen(false); setIsSideChatOpen(!isSideChatOpen); }}
                title="Toggle Side Chat (Spark 1.0)"
              >
                <MessageSquare size={12} />
                <span>Side Chat</span>
              </button>
              <div className="titlebar-divider" />
            </>
          )}
          <button type="button" className="win-btn" title="Minimize">
            <Minus size={13} />
          </button>
          <button type="button" className="win-btn" title="Maximize">
            <Square size={11} />
          </button>
          <button type="button" className="win-btn close" title="Close">
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="workspace-body">
        {/* Left Sidebar */}
        {!sidebarCollapsed && (
          <aside className="sidebar">
            <div className="sidebar-toolbar">
              <div className="sidebar-toolbar-left">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse Sidebar"
                >
                  <PanelLeft size={15} />
                </button>
                {appMode === 'studio' && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setIsProjectsModalOpen(true)}
                    title="Workspaces"
                  >
                    <FolderGit2 size={15} />
                  </button>
                )}
              </div>
              {appMode === 'studio' && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setIsSkillsModalOpen(true)}
                  title="Skills & Rules"
                >
                  <Sparkles size={15} />
                </button>
              )}
            </div>

            {/* Primary Navigation */}
            <div className="sidebar-nav-section">
              <button
                type="button"
                className="new-synthesis-btn"
                onClick={handleStartNewConversation}
              >
                <Plus size={15} />
                <span>{appMode === 'personal' ? 'New Chat' : 'New Conversation'}</span>
              </button>

              {appMode === 'studio' && (
                <>
                  <button
                    type="button"
                    className={`sidebar-nav-link ${activeNavView === 'canvas' ? 'active' : ''}`}
                    onClick={() => setActiveNavView('canvas')}
                  >
                    <MessageSquare size={15} />
                    <span>Chat & Code Preview</span>
                    {messages.length > 0 && (
                      <span className="nav-count">{messages.length}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`sidebar-nav-link ${activeNavView === 'workspace' ? 'active' : ''}`}
                    onClick={() => setActiveNavView('workspace')}
                  >
                    <FolderGit2 size={15} />
                    <span>Workspace</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-nav-link"
                    onClick={() => { setIsSideChatOpen(false); setIsBrowserOpen(true); }}
                  >
                    <Globe size={15} />
                    <span>Browser</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-nav-link ${activeNavView === 'self-learning' ? 'active' : ''}`}
                    onClick={() => setActiveNavView('self-learning')}
                  >
                    <Sparkles size={15} />
                    <span>Model Training & RLHF</span>
                    <span className="nav-count">{adaptationScore}</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-nav-link ${activeNavView === 'memory' ? 'active' : ''}`}
                    onClick={() => setActiveNavView('memory')}
                  >
                    <Brain size={15} />
                    <span>Project Memory</span>
                    <span className="nav-count">{memories.length}</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-nav-link"
                    onClick={() => setIsSkillsModalOpen(true)}
                  >
                    <Layers size={15} />
                    <span>Skills & Rules</span>
                    <span className="nav-count">{activeSkillsCount}</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-nav-link"
                    onClick={() => setIsMcpModalOpen(true)}
                  >
                    <Server size={15} />
                    <span>MCP Protocol</span>
                    <span className="nav-count">{mcpServers.length}</span>
                  </button>
                </>
              )}
            </div>

            {/* Conversations Grouped Under Active Project */}
            <div className="sidebar-history-header">
              <span>
                {appMode === 'personal'
                  ? 'Recent Chats'
                  : activeProject
                    ? `${activeProject.name} Chats`
                    : 'Conversations'}
              </span>
              <span className="nav-count">{conversations.length}</span>
            </div>

            <div className="sidebar-history-list">
              {conversations.length === 0 ? (
                <div className="sidebar-empty-hint">
                  No chats in this workspace yet. Send a message below to begin.
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    type="button"
                    key={conv.id}
                    className={`history-item ${conv.id === activeConvId ? 'selected' : ''}`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <span className="history-title">{conv.title}</span>
                    <span
                      className="history-delete-btn"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      title="Delete conversation"
                    >
                      <Trash2 size={11} />
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="sidebar-footer">
              <button
                type="button"
                className="sidebar-settings-trigger"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings size={15} />
                <span>Settings</span>
              </button>
              <span className="orbia-version-tag">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {resourceState && (
                <span
                  className={`resource-chip ${resourceState.level}`}
                  title={`Memory ${resourceState.ram_percent.toFixed(0)}% used, ${resourceState.ram_free_mb} MB free`}
                >
                  <span className="dot" />
                  {resourceState.level === 'ok'
                    ? 'Resources OK'
                    : resourceState.level === 'warning'
                      ? 'Resources low'
                      : 'Resources critical'}
                </span>
              )}
            </div>
          </aside>
        )}

        {/* Center Main Stage */}
        <main className="main-stage">
          {sidebarCollapsed && (
            <button
              type="button"
              className="floating-expand-btn"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand Sidebar"
            >
              <PanelLeft size={16} />
            </button>
          )}

          {/* Minimap Dots */}
          {activeNavView === 'canvas' && messages.length > 0 && (
            <div className="ag-turn-minimap">
              {messages.map((m, idx) => (
                <button
                  type="button"
                  key={m.id}
                  className={`ag-minimap-dot ${m.role}`}
                  title={`${m.role === 'user' ? 'You' : m.modelUsed || 'Catalyst'}: ${m.content.slice(0, 50)}`}
                  onClick={() =>
                    turnRefs.current[m.id]?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    })
                  }
                >
                  <span className="sr-only">Turn {idx + 1}</span>
                </button>
              ))}
            </div>
          )}

          {/* Right Overview Card */}
          {appMode === 'studio' && activeNavView === 'canvas' && showOverviewCard && (
            <aside className="ag-overview-card">
              <div className="ag-overview-header">
                <span>Overview</span>
                <button
                  type="button"
                  className="ag-overview-close"
                  onClick={() => setShowOverviewCard(false)}
                  title="Hide Overview"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="ag-overview-nav">
                <button
                  type="button"
                  className="ag-overview-item"
                  onClick={() => setActiveNavView('self-learning')}
                >
                  <Sparkles size={13} className="text-amber" />
                  <span>Model Training (IQ {adaptationScore})</span>
                  <ChevronRight size={12} className="ml-auto text-muted" />
                </button>
                <button
                  type="button"
                  className="ag-overview-item"
                  onClick={() => setActiveNavView('workspace')}
                >
                  <Terminal size={13} />
                  <span>Open Workspace</span>
                  <ChevronRight size={12} className="ml-auto text-muted" />
                </button>
                <button
                  type="button"
                  className="ag-overview-item"
                  onClick={() => setIsSkillsModalOpen(true)}
                >
                  <Layers size={13} />
                  <span>Skills ({activeSkillsCount} active)</span>
                  <ChevronRight size={12} className="ml-auto text-muted" />
                </button>
              </div>

              <div className="ag-overview-section">
                <div className="ag-overview-subhead">
                  <span>Active Engine & Storage</span>
                  <span className="ag-count-badge">{likesCount + dislikesCount}</span>
                </div>
                <div className="ag-overview-task">
                  <ChevronRight size={11} className="text-amber" />
                  <span className="truncate">{selectedModel.name}</span>
                </div>
                <div className="ag-overview-task">
                  <ChevronRight size={11} className="text-emerald" />
                  <span className="truncate">
                    Assets Stored: D:\Catalyst\storage\
                  </span>
                </div>
              </div>
            </aside>
          )}

          {activeNavView === 'canvas' && (
            <div className="ag-chat-layout">
              {/* Chat Stream */}
              <div
                ref={chatScrollRef}
                onScroll={handleChatScroll}
                className="ag-chat-scroll-area"
              >
                {messages.length === 0 ? (
                  <div className="ag-empty-hero">
                    <div className="hero-watermark-wrap">
                      <OrbiaLogo size={76} watermark />
                    </div>
                    <h1 className="hero-title">
                      {appMode === 'personal'
                        ? 'Where should we start?'
                        : 'What shall Catalyst build today?'}
                    </h1>
                    <p className="hero-subtitle">
                      {appMode === 'personal' ? (
                        <>
                          Personal AI powered locally by <strong>{selectedModel.shortName}</strong> &middot; Private, offline &amp; fast
                        </>
                      ) : (
                        <>
                          Running <strong>{selectedModel.name}</strong> locally on D:\ &middot;{' '}
                          {selectedModel.vramFootprint} &middot; {selectedModel.speedRating}
                        </>
                      )}
                    </p>

                    {appMode === 'personal' && (
                      <div className="personal-starters-list">
                        {[
                          { icon: 'book', text: 'Help me draft an email or message' },
                          { icon: 'lightbulb', text: 'Brainstorm ideas for a new personal project' },
                          { icon: 'check', text: 'Build a daily routine or checklist' },
                          { icon: 'compass', text: 'Explain a complex topic in simple terms' }
                        ].map((starter, i) => (
                          <button
                            key={i}
                            type="button"
                            className="personal-starter-chip"
                            onClick={() => handleSendMessage(starter.text)}
                          >
                            <Sparkles size={14} className="starter-sparkle" />
                            <span>{starter.text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ag-thread-container">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        ref={(el) => {
                          turnRefs.current[msg.id] = el;
                        }}
                        className={`ag-turn ${msg.role}`}
                      >
                        {msg.role === 'user' ? (
                          <div className="ag-user-bubble">
                            {msg.content}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="ag-user-attachments">
                                {msg.attachments.map((a) => (
                                  <div key={a.id} className="ag-attached-pill" title={a.summary || a.name}>
                                    {a.thumbnail_base64 ? (
                                      <img src={a.thumbnail_base64} alt={a.name} className="ag-pill-thumb" />
                                    ) : a.type === 'image' ? (
                                      <ImageIcon size={12} className="text-amber" />
                                    ) : (
                                      <FileCode2 size={12} className="text-amber" />
                                    )}
                                    <span>{a.name} ({a.size_kb} KB{a.ocr_text ? ' • OCR' : ''})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="ag-assistant-block">
                            <ThinkingPanel
                              steps={msg.activity || []}
                              isStreaming={Boolean(msg.isStreaming)}
                              startedAt={msg.startedAt}
                              elapsedSec={msg.elapsedSec}
                              modelLabel={msg.modelUsed || selectedModel.shortName}
                              tokensPerSec={msg.tokensPerSec}
                            />
                            {msg.resourceNotice && (
                              <div className={`ag-resource-notice ${msg.resourceNotice.level}`}>
                                <ShieldAlert size={14} />
                                <div>
                                  <strong>
                                    {msg.resourceNotice.level === 'halt'
                                      ? 'Execution stopped'
                                      : 'Resources running low'}
                                  </strong>
                                  <p>{msg.resourceNotice.message}</p>
                                </div>
                              </div>
                            )}

                            {/* Search Citations */}
                            {msg.searchResults && msg.searchResults.length > 0 && (
                              <div className="ag-search-citations">
                                <div className="ag-search-citations-label">
                                  <Globe size={12} className="text-amber" />
                                  <span>Live Online Sources ({msg.searchResults.length})</span>
                                </div>
                                <div className="ag-search-cards-row">
                                  {msg.searchResults.map((sr, i) => (
                                    <a
                                      key={i}
                                      href={sr.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ag-search-source-chip"
                                      title={sr.snippet}
                                      onClick={(event) => {
                                        if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
                                          event.preventDefault();
                                          setBrowserRequestUrl(sr.url);
                                          setIsSideChatOpen(false);
                                          setIsBrowserOpen(true);
                                        }
                                      }}
                                    >
                                      <span className="ag-source-title">{sr.title}</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Formatted Markdown & Interactive Code Preview */}
                            <MarkdownCodeRenderer
                              content={msg.content || (msg.isStreaming ? '...' : '')}
                              isStreaming={msg.isStreaming}
                              onOpenLink={(url) => {
                                setBrowserRequestUrl(url);
                                setIsSideChatOpen(false);
                                setIsBrowserOpen(true);
                              }}
                            />

                            {/* Learned Banner */}
                            {msg.learnedInsights && msg.learnedInsights.length > 0 && (
                              <div className="ag-learned-banner">
                                <Sparkles size={12} className="text-amber" />
                                <span>
                                  Self-learned: {msg.learnedInsights.join(' · ')}
                                </span>
                              </div>
                            )}

                            {/* Turn Footer */}
                            {!msg.isStreaming && (
                              <div className="ag-turn-footer">
                                <span className="ag-turn-time">{msg.timestamp}</span>

                                <button
                                  type="button"
                                  className="ag-footer-icon-btn"
                                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                                  title="Copy response"
                                >
                                  {copiedMsgId === msg.id ? (
                                    <Check size={13} className="text-emerald" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  className={`ag-footer-icon-btn ${
                                    msg.rating === 'up' ? 'liked' : ''
                                  }`}
                                  onClick={() => handleRateMessage(msg, 'up')}
                                  title="Like response (Reinforce in local training)"
                                >
                                  <ThumbsUp size={13} />
                                </button>

                                <button
                                  type="button"
                                  className={`ag-footer-icon-btn ${
                                    msg.rating === 'down' ? 'disliked' : ''
                                  }`}
                                  onClick={() =>
                                    setDislikePromptMsgId(
                                      dislikePromptMsgId === msg.id ? null : msg.id
                                    )
                                  }
                                  title="Dislike response (Eliminate hallucination)"
                                >
                                  <ThumbsDown size={13} />
                                </button>
                              </div>
                            )}

                            {/* Dislike Reasons */}
                            {dislikePromptMsgId === msg.id && (
                              <div className="ag-dislike-reasons">
                                <span>Flag issue to train out of model:</span>
                                {[
                                  'Hallucinated facts',
                                  'Incomplete code',
                                  'Syntax error',
                                  'Ignored context'
                                ].map((reason) => (
                                  <button
                                    key={reason}
                                    type="button"
                                    className="ag-reason-chip"
                                    onClick={() => handleRateMessage(msg, 'down', reason)}
                                  >
                                    {reason}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scroll Bottom Button */}
              {showScrollBottomBtn && (
                <button
                  type="button"
                  className="ag-scroll-bottom-btn"
                  onClick={() => scrollToBottom(true)}
                  title="Scroll to bottom"
                >
                  <ArrowDown size={15} />
                </button>
              )}

              {/* Bottom Docked Composer */}
              <div className="ag-composer-dock">
                <div className="composer-wrapper">
                  {isModelPopoverOpen && (
                    <ModelSelectorPopover
                      models={models}
                      selectedModel={selectedModel}
                      onSelectModel={(m) => {
                        setSelectedModel(m);
                        handleUpdateSettings({ activeModelId: m.id });
                      }}
                      onClose={() => setIsModelPopoverOpen(false)}
                      vramCapGb={settings.vramCapGb}
                    />
                  )}

                  <div className="composer-box">
                    {/* Top Row: Workspace context */}
                    <div className="composer-top-row">
                      {appMode === 'studio' ? (
                        <div className="menu-anchor">
                          <button
                            type="button"
                            className="project-selector-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsModelPopoverOpen(false);
                              setOpenMenu(openMenu === 'project' ? null : 'project');
                            }}
                          >
                            <FolderGit2 size={13} className="text-amber" />
                            <span>
                              {activeProject
                                ? `Project: ${activeProject.name}`
                                : 'General Workspace (D:\\)'}
                            </span>
                            <ChevronDown size={13} />
                          </button>

                          {openMenu === 'project' && (
                            <div
                              className="dropdown-menu down"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {projects.map((p) => (
                                <button
                                  type="button"
                                  key={p.id}
                                  className={`dropdown-item ${
                                    p.id === activeProjectId ? 'selected' : ''
                                  }`}
                                  onClick={() => handleSelectProject(p.id)}
                                >
                                  <span>{p.name}</span>
                                  {p.id === activeProjectId && (
                                    <span className="text-amber">&#10003;</span>
                                  )}
                                </button>
                              ))}
                              {projects.length > 0 && <div className="dropdown-sep" />}
                              <button
                                type="button"
                                className="dropdown-item muted"
                                onClick={() => {
                                  setOpenMenu(null);
                                  setIsProjectsModalOpen(true);
                                }}
                              >
                                <Plus size={13} />
                                <span>Manage Workspaces...</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="personal-composer-tag">
                          <Sparkles size={12} />
                          <span>Personal Assistant</span>
                        </div>
                      )}

                    </div>

                    {/* Pending Attachments Strip */}
                    {attachments.length > 0 && (
                      <div className="composer-attachments-strip">
                        {attachments.map((a) => (
                          <div key={a.id} className="composer-attachment-pill" title={a.summary || a.name}>
                            {a.thumbnail_base64 ? (
                              <img src={a.thumbnail_base64} alt={a.name} className="attach-thumb" />
                            ) : a.type === 'image' ? (
                              <ImageIcon size={14} className="text-amber" />
                            ) : (
                              <FileCode2 size={14} className="text-amber" />
                            )}
                            <div className="attach-pill-info">
                              <span className="attach-pill-name">{a.name}</span>
                              <span className="attach-pill-meta">
                                {a.size_kb} KB{a.ocr_text ? ' • OCR Text' : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="remove-attach-btn"
                              onClick={() => handleRemoveAttachment(a.id)}
                              title="Remove attachment"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Textarea */}
                    <textarea
                      rows={2}
                      className="composer-textarea"
                      placeholder={
                        appMode === 'personal'
                          ? 'Ask anything, brainstorm ideas, draft text, or attach images and files...'
                          : 'Ask Catalyst to build a playable game, inspect attached files/images, or write systems...'
                      }
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      spellCheck={false}
                    />

                    {/* Bottom Toolbar */}
                    <div className="composer-bottom-row">
                      <div className="composer-bottom-left">
                        {/* Composer context menu */}
                        <div className="menu-anchor">
                          <button
                            type="button"
                            className="composer-plus-btn"
                            title="Add Context: Files, Folder, Mentions, Actions, Browser"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAttachMenu(!showAttachMenu);
                            }}
                          >
                            <Plus size={15} />
                          </button>

                          {showAttachMenu && (
                            <div
                              className="ag-context-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="ag-context-header">Add Context</div>

                              <button
                                type="button"
                                className="ag-context-item"
                                onClick={() => {
                                  setShowAttachMenu(false);
                                  fileInputRef.current?.click();
                                }}
                              >
                                <Paperclip size={14} className="text-amber" />
                                <span>Files</span>
                              </button>

                              <button
                                type="button"
                                className="ag-context-item"
                                onClick={() => {
                                  setShowAttachMenu(false);
                                  setIsProjectsModalOpen(true);
                                }}
                              >
                                <Folder size={14} className="text-secondary" />
                                <span>Folder</span>
                              </button>

                              <button
                                type="button"
                                className="ag-context-item"
                                onClick={() => {
                                  setShowAttachMenu(false);
                                  setPromptInput((prev) => prev + ' @memory:architecture ');
                                }}
                              >
                                <AtSign size={14} className="text-secondary" />
                                <span>Mentions</span>
                              </button>

                              <button
                                type="button"
                                className="ag-context-item"
                                onClick={() => {
                                  setShowAttachMenu(false);
                                  setActiveNavView('workspace');
                                }}
                              >
                                <Play size={14} className="text-secondary" />
                                <span>Open Workspace</span>
                              </button>

                              <button
                                type="button"
                                className="ag-context-item"
                                onClick={() => {
                                  setShowAttachMenu(false);
                                  setIsSideChatOpen(false);
                                  setIsBrowserOpen(true);
                                }}
                              >
                                <Compass size={14} className="text-secondary" />
                                <span>Open Browser</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className={`composer-model-trigger ${
                            isModelPopoverOpen ? 'active' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(null);
                            setShowAttachMenu(false);
                            setIsModelPopoverOpen(!isModelPopoverOpen);
                          }}
                        >
                          <span className="model-trigger-name">{selectedModel.name}</span>
                          <span className="model-trigger-tier">{selectedModel.shortName}</span>
                          <ChevronDown size={13} />
                        </button>

                        {/* Claude-Code Style Draggable Effort Level Selector */}
                        <EffortSliderPopover
                          value={settings.effortLevel || 'high'}
                          onChange={(lvl) => handleUpdateSettings({ effortLevel: lvl })}
                        />
                      </div>

                      <div className="composer-bottom-right">
                        {appMode === 'studio' && (
                          <div className="menu-anchor">
                            <button
                              type="button"
                              className="composer-preset-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsModelPopoverOpen(false);
                                setShowAttachMenu(false);
                                setOpenMenu(openMenu === 'preset' ? null : 'preset');
                              }}
                            >
                              <Shield size={13} className="text-amber" />
                              <span>{settings.executionPreset}</span>
                              <ChevronDown size={12} />
                            </button>

                            {openMenu === 'preset' && (
                              <div
                                className="dropdown-menu up right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[
                                  ['Turbo Autonomous', 'Fast loops, auto-correcting errors'],
                                  ['Continuous Execution', 'Continuous background synthesis'],
                                  ['Checkpoint Supervised', 'Asks before each execution']
                                ].map(([n, d]) => (
                                  <button
                                    type="button"
                                    key={n}
                                    className={`dropdown-item two-line ${
                                      n === settings.executionPreset ? 'selected' : ''
                                    }`}
                                    onClick={() => {
                                      handleUpdateSettings({ executionPreset: n });
                                      setOpenMenu(null);
                                    }}
                                  >
                                    <span className="di-text">
                                      <span>{n}</span>
                                      <small>{d}</small>
                                    </span>
                                    {n === settings.executionPreset && (
                                      <span className="text-amber">&#10003;</span>
                                    )}
                                  </button>
                                ))}
                                <div className="dropdown-sep" />
                                <button
                                  type="button"
                                  className="dropdown-item muted"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    setIsSettingsOpen(true);
                                  }}
                                >
                                  <Settings size={13} />
                                  <span>Settings</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          className="composer-send-btn"
                          onClick={() => handleSendMessage()}
                          disabled={isSynthesizing ? false : ((!promptInput.trim() && attachments.length === 0) || isUploading)}
                          title={isSynthesizing ? 'Stop generation' : 'Send Message'}
                        >
                          {isSynthesizing ? <StopCircle size={16} /> : <ArrowUp size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNavView === 'workspace' && (
            <div className="content-pane-wrap">
              <WorkspacePanel projectPath={activeProject ? activeProject.path : 'D:\\Catalyst\\builds'} />
            </div>
          )}

          {activeNavView === 'self-learning' && (
            <div className="content-pane-wrap">
              <SelfLearningPanel />
            </div>
          )}

          {activeNavView === 'memory' && (
            <div className="content-pane-wrap">
              <MemoryPanel
                memories={memories}
                projectName={activeProject ? activeProject.name : 'General Workspace'}
                onAddMemory={handleAddMemory}
                onDeleteMemory={handleDeleteMemory}
              />
            </div>
          )}
        </main>

        {/* Floating Side Chat */}
        <SideChat
          isOpen={isSideChatOpen}
          onClose={() => setIsSideChatOpen(false)}
          projectName={activeProject ? activeProject.name : 'Global Scratchpad'}
          models={models}
        onOpenLink={(url) => {
          setBrowserRequestUrl(url);
          setIsSideChatOpen(false);
          setIsBrowserOpen(true);
        }}
        />
        <BrowserPanel
          requestedUrl={browserRequestUrl}
          isOpen={isBrowserOpen}
          onClose={() => setIsBrowserOpen(false)}
        />
      </div>

      {/* Modals */}
      <ProjectsManagerModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
      />

      <SkillsManagerModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        skills={skills}
        onToggleSkill={handleToggleSkill}
        onAddSkill={handleAddSkill}
        onDeleteSkill={handleDeleteSkill}
        onImportSkills={handleImportSkills}
      />

      <McpServersModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
        servers={mcpServers}
        onToggleServer={handleToggleMcpServer}
        onAddServer={handleAddMcpServer}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={(m) => {
          setSelectedModel(m);
          handleUpdateSettings({ activeModelId: m.id });
        }}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        mcpServers={mcpServers}
        onOpenSkills={() => {
          setIsSettingsOpen(false);
          setIsSkillsModalOpen(true);
        }}
        onOpenMcp={() => {
          setIsSettingsOpen(false);
          setIsMcpModalOpen(true);
        }}
      />
    </div>
  );
}

export default App;
