import type {
  Project,
  ProjectMemoryItem,
  TaskPlan,
  McpServerConfig,
  AppSettings,
  CatalystModelInfo,
  ChatConversation
} from '../types/catalyst';

export const INITIAL_MODELS: CatalystModelInfo[] = [
  {
    id: 'apex-1.2',
    name: 'Apex 1.2 (14B)',
    shortName: 'Apex 1.2',
    family: '14B Dense · Q4_K_M',
    tier: 'deep-reasoning',
    badge: 'Master',
    badgeType: 'ultra',
    plainDescription: 'The highest-capability local coding model. Best for architecture, multi-file reasoning, debugging, and difficult implementation tasks when the machine has enough RAM.',
    quantization: 'Q4_K_M (8.57 GB)',
    memoryRequirement: '10+ GB RAM / 10 GB VRAM recommended',
    vramFootprint: '8.6 GB VRAM',
    speedRating: 'Model-dependent',
    localFile: 'catalyst-apex-1.2-q4_k_m.gguf',
    localPath: 'D:\\Catalyst\\models\\catalyst-apex-1.2-q4_k_m.gguf',
    sizeMb: 8572,
    downloadStatus: 'ready',
    specialties: ['Complex coding and debugging', 'Architecture and multi-file changes', 'Long-form local reasoning']
  },
  {
    id: 'spark-2.1',
    name: 'Spark 2.1 (1.5B)',
    shortName: 'Spark 2.1',
    family: '1.5B Dense • Q4_K_M',
    tier: 'ultra-light',
    badge: 'New',
    badgeType: 'new',
    plainDescription: 'Upgraded fast local coding model for everyday fixes, short scripts, syntax repair, and lightweight repository tasks.',
    quantization: 'Q4_K_M (940 MB)',
    memoryRequirement: '1.1 GB RAM / iGPU',
    vramFootprint: '1.05 GB VRAM',
    speedRating: 'Fast',
    localFile: 'catalyst-spark-2.1-q4_k_m.gguf',
    localPath: 'D:\\Catalyst\\models\\catalyst-spark-2.1-q4_k_m.gguf',
    sizeMb: 940,
    downloadStatus: 'ready',
    specialties: ['Fast coding fixes', 'Syntax repair', 'Short scripts and explanations']
  },
  {
    id: 'spark-2.0',
    name: 'Spark 2.0 (0.5B)',
    shortName: 'Spark 2.0',
    family: '0.5B Dense • Q4_K_M',
    tier: 'ultra-light',
    badge: 'Low',
    badgeType: 'ultra',
    plainDescription:
      'Small, fast local model for Side Chat, short summaries, and low-risk micro-tasks. Best when a quick response matters more than deep repository reasoning.',
    quantization: 'Q4_K_M (398 MB)',
    memoryRequirement: '350 MB RAM / Any CPU',
    vramFootprint: '0.40 GB VRAM',
    speedRating: '280+ tok/s',
    localFile: 'catalyst-spark-2.0-q4_k_m.gguf',
    localPath: 'D:\\Catalyst\\models\\catalyst-spark-2.0-q4_k_m.gguf',
    sizeMb: 491,
    downloadStatus: 'ready',
    specialties: [
      'Low-Latency Side Chat & Scratchpad',
      'Rapid Syntax Lookups & Snippets',
      'Instant Micro-Task Execution'
    ]
  },
  {
    id: 'prism-2.1',
    name: 'Prism 2.1 (3B)',
    shortName: 'Prism 2.1',
    family: '3B Dense • Q4_K_M',
    tier: 'balanced',
    badge: 'New',
    badgeType: 'new',
    plainDescription: 'Upgraded daily coding model for debugging, multi-file implementation, and reliable feature work.',
    quantization: 'Q4_K_M (1.80 GB)',
    memoryRequirement: '2.2 GB RAM / iGPU',
    vramFootprint: '1.93 GB VRAM',
    speedRating: 'Fast',
    localFile: 'catalyst-prism-2.1-q4_k_m.gguf',
    localPath: 'D:\\Catalyst\\models\\catalyst-prism-2.1-q4_k_m.gguf',
    sizeMb: 1840,
    downloadStatus: 'ready',
    specialties: ['Debugging', 'Multi-file implementation', 'Daily coding']
  },
  {
    id: 'prism-2.0',
    name: 'Prism 2.0 (1.5B)',
    shortName: 'Prism 2.0',
    family: '1.5B Dense • Q4_K_M',
    tier: 'balanced',
    badge: 'Medium',
    badgeType: 'new',
    plainDescription:
      'Balanced daily workhorse. Handles full-stack code synthesis, playable canvas apps, graphics shaders, and modular systems inside 1.1 GB of RAM.',
    quantization: 'Q4_K_M (1.05 GB)',
    memoryRequirement: '1.1 GB RAM / iGPU',
    vramFootprint: '1.15 GB VRAM',
    speedRating: '190 tok/s',
    localFile: 'catalyst-prism-2.0-q4_k_m.gguf',
    localPath: 'D:\\Catalyst\\models\\catalyst-prism-2.0-q4_k_m.gguf',
    sizeMb: 1065,
    downloadStatus: 'ready',
    specialties: [
      'Full-Stack Architecture & Shaders',
      'Live Playable Canvas Prototypes',
      'Clean Algorithmic Code Synthesis'
    ]
  },
  {
    id: 'zenith-2.1',
    name: 'Zenith 2.1 (7B)',
    shortName: 'Zenith 2.1',
    family: '7.0B Dense • Q4_K_M',
    tier: 'deep-reasoning',
    badge: 'Ultra-Fine',
    badgeType: 'new',
    plainDescription:
      'Deep local coding model with an 8K context window. Use it for architecture, multi-file implementation, games, and difficult reasoning tasks.',
    quantization: 'Q4_K_M (4.47 GB)',
    memoryRequirement: '5.6 GB RAM / 6 GB VRAM recommended',
    vramFootprint: '4.47 GB VRAM',
    speedRating: '70 tok/s',
    localFile: 'catalyst-zenith-2.1-q4_k_m.gguf',
    localPath: 'D:\\Catalyst\\models\\catalyst-zenith-2.1-q4_k_m.gguf',
    sizeMb: 4466,
    downloadStatus: 'ready',
    specialties: [
      'Trained Qwen2.5-Coder BF16 QLoRA Weights',
      'Autonomous Architecture & Multi-Stage Planning',
      'Multi-step coding and implementation planning'
    ]
  }
];

export const orderModelsForPicker = (models: CatalystModelInfo[]): CatalystModelInfo[] =>
  [...models].sort((a, b) => Number(a.id === 'apex-1.2') - Number(b.id === 'apex-1.2'));

export const INITIAL_MCP_SERVERS: McpServerConfig[] = [
  {
    id: 'mcp-filesystem',
    name: 'D:\\ Catalyst DirectStorage MCP',
    transport: 'stdio',
    commandOrUrl: 'python -m mcp_server_filesystem D:\\Catalyst',
    status: 'connected',
    toolsCount: 14,
    enabled: true
  },
  {
    id: 'mcp-compiler',
    name: 'Self-Healing Build & Compiler MCP',
    transport: 'stdio',
    commandOrUrl: 'python ./mcp/compiler_bridge.py',
    status: 'connected',
    toolsCount: 6,
    enabled: true
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  vramCapGb: 2.5,
  executionPreset: 'Turbo Autonomous',
  storageConduit: 'D:\\Catalyst',
  autoCompileCheck: true,
  activeModelId: 'prism-2.0',
  sideChatModelId: 'spark-2.1',
  telemetryOverlay: true,
  temperature: 0.65,
  selfLearningEnabled: true,
  effortLevel: 'high',
  appMode: 'studio',
  studioTheme: 'studio-default',
  personalTheme: 'personal-default'
};

class StorageService {
  private get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(`orbia_catalyst_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`orbia_catalyst_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  getProjects(): Project[] {
    return this.get<Project[]>('projects', []);
  }

  saveProjects(projects: Project[]): void {
    this.set('projects', projects);
  }

  getConversations(projectId?: string): ChatConversation[] {
    const all = this.get<ChatConversation[]>('conversations', []);
    if (!projectId) return all;
    return all.filter((c) => c.projectId === projectId);
  }

  saveConversation(conv: ChatConversation): void {
    const all = this.get<ChatConversation[]>('conversations', []);
    const idx = all.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      all[idx] = conv;
    } else {
      all.unshift(conv);
    }
    this.set('conversations', all);
  }

  deleteConversation(id: string): void {
    const all = this.get<ChatConversation[]>('conversations', []).filter((c) => c.id !== id);
    this.set('conversations', all);
  }

  deleteConversationsForProject(projectId: string): void {
    const all = this.get<ChatConversation[]>('conversations', []).filter((c) => c.projectId !== projectId);
    this.set('conversations', all);
  }

  getMemories(projectId?: string): ProjectMemoryItem[] {
    const list = this.get<ProjectMemoryItem[]>('memories', []);
    if (!projectId) return list;
    return list.filter((m) => m.projectId === projectId);
  }

  saveMemories(memories: ProjectMemoryItem[]): void {
    this.set('memories', memories);
  }

  deleteMemoriesForProject(projectId: string): void {
    this.saveMemories(this.getMemories().filter((memory) => memory.projectId !== projectId));
  }

  addMemory(memory: Omit<ProjectMemoryItem, 'id' | 'updatedAt'>): ProjectMemoryItem {
    const memories = this.getMemories();
    const newItem: ProjectMemoryItem = {
      ...memory,
      id: `mem-${Date.now()}`,
      updatedAt: 'Just now'
    };
    memories.unshift(newItem);
    this.saveMemories(memories);
    return newItem;
  }

  deleteMemory(id: string): void {
    const memories = this.getMemories().filter((m) => m.id !== id);
    this.saveMemories(memories);
  }

  getMcpServers(): McpServerConfig[] {
    return this.get<McpServerConfig[]>('mcp_servers', INITIAL_MCP_SERVERS);
  }

  saveMcpServers(servers: McpServerConfig[]): void {
    this.set('mcp_servers', servers);
  }

  getSettings(): AppSettings {
    return { ...INITIAL_SETTINGS, ...this.get<Partial<AppSettings>>('settings', {}) };
  }

  saveSettings(settings: AppSettings): void {
    this.set('settings', settings);
  }

  getPlans(projectId?: string): TaskPlan[] {
    const plans = this.get<TaskPlan[]>('plans', []);
    if (!projectId) return plans;
    return plans.filter((p) => p.projectId === projectId);
  }

  savePlans(plans: TaskPlan[]): void {
    this.set('plans', plans);
  }
}

export const storageService = new StorageService();
