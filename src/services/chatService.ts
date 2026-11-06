import type {
  ChatMessage,
  SideChatMessage,
  CatalystModelInfo,
  WebSearchResult,
  SelfLearningState,
  AttachedAsset,
  ActivityStep,
  ResourceNotice,
  EffortLevel,
  AppMode
} from '../types/catalyst';
import { EFFORT_SPECS } from '../components/EffortSliderPopover';
import { skillsService } from './skillsService';
import { storageService } from './storageService';

const ENGINE_URL = 'http://127.0.0.1:8008';

export function shouldAutoSearch(userText: string, online: boolean): boolean {
  if (!online) return false;
  const text = userText.toLowerCase();
  return /\b(search|look up|browse|find online|research|latest|recent|today|current|news|price|pricing|weather|release notes|documentation|docs|what is the newest)\b/.test(text);
}

export interface StreamUpdateCallbacks {
  onToken: (fullText: string) => void;
  onSearchResults?: (results: WebSearchResult[]) => void;
  onLearned?: (insights: string[]) => void;
  onActivity?: (steps: ActivityStep[]) => void;
  onResource?: (notice: ResourceNotice) => void;
}

class ChatService {
  private activeAbortController: AbortController | null = null;

  cancelActiveGeneration(): boolean {
    if (!this.activeAbortController) return false;
    this.activeAbortController.abort();
    this.activeAbortController = null;
    return true;
  }

  async checkHealth(): Promise<{
    online: boolean;
    engineUp: boolean;
    storedAssetsCount?: number;
    models?: Array<{ id: string; ready: boolean; path: string; loaded: boolean }>;
    selfLearning?: {
      total_turns: number;
      adaptation_score: number;
      insights_count: number;
      likes: number;
      dislikes: number;
    };
  }> {
    try {
      const res = await fetch(`${ENGINE_URL}/health`);
      if (!res.ok) return { online: navigator.onLine, engineUp: false };
      const data = await res.json();
      return {
        online: Boolean(data.internet_connected),
        engineUp: true,
        storedAssetsCount: data.stored_assets_count,
        models: data.models,
        selfLearning: data.self_learning
      };
    } catch {
      return { online: navigator.onLine, engineUp: false };
    }
  }

  async uploadAssetFile(file: File): Promise<AttachedAsset | null> {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${ENGINE_URL}/api/assets/upload`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.asset;
    } catch (err) {
      console.error('Asset upload error:', err);
      return null;
    }
  }

  async sendMainMessage(
    userText: string,
    activeModel: CatalystModelInfo,
    projectId: string,
    projectPath: string | undefined,
    history: ChatMessage[],
    attachments: AttachedAsset[],
    webSearch: boolean,
    effortLevel: EffortLevel,
    callbacks: StreamUpdateCallbacks,
    mode: AppMode = 'studio'
  ): Promise<ChatMessage> {
    this.cancelActiveGeneration();
    const abortController = new AbortController();
    this.activeAbortController = abortController;
    const effortSpec = EFFORT_SPECS[effortLevel] || EFFORT_SPECS.high;
    const memories = mode === 'studio' ? storageService.getMemories(projectId) : [];
    const skillsDirectives = mode === 'studio' ? skillsService.getActiveSkillDirectives(userText) : '';
    let workspaceContext = '';

    if (mode === 'studio' && projectPath) {
      try {
        const contextBudget = activeModel.id.startsWith('spark') ? 12000
          : activeModel.id.startsWith('prism') ? 18000
          : activeModel.id.startsWith('zenith') ? 28000
          : 48000;
        const res = await fetch(`${ENGINE_URL}/api/projects/context?path=${encodeURIComponent(projectPath)}&query=${encodeURIComponent(userText)}&budget=${contextBudget}`);
        if (res.ok) {
          const inventory = await res.json();
          const files = Array.isArray(inventory.files) ? inventory.files : [];
          if (files.length > 0) {
            workspaceContext = `\n\nRELEVANT WORKSPACE CONTEXT (${inventory.used || 0}/${inventory.budget || 0} chars from ${inventory.indexed_files || 0} indexed files):\nPath: ${inventory.path}\n${files.map((entry: { file: string; content: string; truncated?: boolean }) => `\n--- ${entry.file}${entry.truncated ? ' (truncated)' : ''} ---\n${entry.content}`).join('\n')}\nUse only this evidence for repository-specific claims. Ask to inspect another file when the needed code is not present.`;
          }
        }
      } catch {
        // Context indexing is optional; chat still works if the local engine is offline.
      }
    }

    const effortDirectives: Record<EffortLevel, string> = {
      low: 'EFFORT LEVEL: LOW — Prioritize speed and brevity. Output direct, concise answers.',
      medium: 'EFFORT LEVEL: MEDIUM — Balance speed and depth. Provide clear, well-structured responses.',
      high: 'EFFORT LEVEL: HIGH — Provide thorough, accurate, and complete answers.',
      ultra: 'EFFORT LEVEL: ULTRA — Maximum depth and precision. Exhaustively cover nuances and details.'
    };

    let systemPrompt =
      mode === 'personal'
        ? `You are Catalyst Personal, a smart, welcoming, and direct everyday AI assistant running locally.
${effortDirectives[effortLevel]}
GUIDELINES:
- Be clear, helpful, natural, and conversational without robotic filler or self-introductions.
- Answer everyday questions, brainstorming, writing, analysis, math, or quick snippets cleanly.
- Do not force heavy software architecture or multi-file frameworks unless explicitly asked.`
        : `You are Catalyst, an autonomous engineering intelligence.
${effortDirectives[effortLevel]}
CRITICAL OPERATING RULES:
- Ground all logic, architecture, and code in reality to eliminate hallucination. If something cannot be done directly, specify the exact boundary.
- ALWAYS wrap every single code snippet, HTML file, script, or program inside proper markdown triple-backtick code fences with the language identifier (e.g. \`\`\`html, \`\`\`javascript, \`\`\`python, \`\`\`luau). NEVER output raw unfenced code or raw HTML tags outside of \`\`\` fences.
- When files or images are attached, read their metadata, dimensions, and previews and reference them directly in the architecture and code.
- For playable web prototypes or UI demos, output a single self-contained \`\`\`html document with embedded CSS & JS (using procedural Canvas 2D or WebGL graphics — never use broken external image URLs like imgur) so the user can play it directly in the Live Preview.`;

    systemPrompt += `\n\nPLAYABLE ARTIFACT QUALITY GATE:\n- Treat a game as incomplete until initialization, input handling, update timing, collision/game-over state, restart flow, scoring, and visible feedback are implemented.\n- For Flappy Bird-style games, verify that Space/click changes vertical velocity, pipes spawn and move, collision ends the run, score increments once per pipe, and restart restores the initial state.\n- Never claim a playtest passed unless Catalyst runtime evidence reports no exception and completed render/input checks.`;
    systemPrompt += workspaceContext;
    systemPrompt += `\n\nONLINE SEARCH POLICY:\n- Search is selected automatically for explicit web/research requests or facts likely to be time-sensitive.\n- Stay local for ordinary coding, project inspection, and stable explanations.\n- If online search is unavailable, say so instead of implying that current sources were checked.`;

    if (skillsDirectives) {
      systemPrompt += `\n\n${skillsDirectives}`;
    }

    if (memories.length > 0) {
      systemPrompt +=
        `\n\nPROJECT MEMORY & RULES:\n` +
        memories.map((m) => `[${m.category.toUpperCase()}] ${m.key}: ${m.value}`).join('\n');
    }

    let fullText = '';
    let searchResults: WebSearchResult[] = [];
    let learnedInsights: string[] = [];
    let elapsedSec = 0;
    let tokensPerSec = 0;
    let totalTokens = 0;
    let resourceNotice: ResourceNotice | undefined;
    const steps: ActivityStep[] = [];
    const t0 = Date.now();
    const pushStep = (step: Omit<ActivityStep, 'id' | 'at'>) => {
      steps.push({ ...step, id: `st-${steps.length}`, at: Date.now() - t0 });
      callbacks.onActivity?.(steps.map((x) => ({ ...x })));
    };
    const finishStep = (kind: ActivityStep['kind'], status: ActivityStep['status'], detail?: string) => {
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].kind === kind && steps[i].status === 'running') {
          steps[i] = { ...steps[i], status, detail: detail ?? steps[i].detail };
          break;
        }
      }
      callbacks.onActivity?.(steps.map((x) => ({ ...x })));
    };

    pushStep({
      kind: 'context',
      label: 'Assembling context',
      detail: `${memories.length} memory entries, ${attachments.length} attachment(s), ${skillsDirectives ? 'skills active' : 'no skills'}`,
      status: 'done'
    });
    if (webSearch) pushStep({ kind: 'search', label: 'Searching the web', status: 'running' });
    pushStep({
      kind: 'model',
      label: `Running ${activeModel.shortName} (${effortSpec.label} effort)`,
      detail: `${effortSpec.maxTokens} token budget · temp ${effortSpec.temperature}`,
      status: 'running'
    });

    const historyLimit = effortLevel === 'low' ? 2 : effortLevel === 'medium' ? 4 : effortLevel === 'high' ? 6 : 10;
    const historyPayload = history
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim())
      .slice(-historyLimit)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(`${ENGINE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          model_id: activeModel.id,
          prompt: userText,
          history: historyPayload,
          attachments,
          system_prompt: systemPrompt,
          max_tokens: effortSpec.maxTokens,
          temperature: effortSpec.temperature,
          top_p: effortSpec.topP,
          effort: effortLevel,
          web_search: webSearch
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Local engine bridge response error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'search_results' && Array.isArray(parsed.results)) {
                searchResults = parsed.results;
                finishStep('search', 'done', `${searchResults.length} sources`);
                callbacks.onSearchResults?.(searchResults);
              } else if (parsed.type === 'resource_warning' || parsed.type === 'resource_halt') {
                const isHalt = parsed.type === 'resource_halt';
                resourceNotice = {
                  level: isHalt ? 'halt' : 'warning',
                  message: parsed.message,
                  reasons: parsed.reasons || []
                };
                pushStep({
                  kind: 'resource',
                  label: isHalt ? 'Stopped by overload protection' : 'Resource warning',
                  detail: (parsed.reasons || []).join('; ') || parsed.message,
                  status: isHalt ? 'error' : 'warning'
                });
                callbacks.onResource?.(resourceNotice);
              } else if (parsed.type === 'model_error') {
                finishStep('model', 'error', parsed.message || 'Model failed to load');
                fullText = parsed.message || 'The selected local model could not be loaded.';
                callbacks.onToken(fullText);
              } else if (parsed.type === 'token') {
                fullText += parsed.text;
                callbacks.onToken(fullText);
              } else if (parsed.type === 'learned' && Array.isArray(parsed.insights)) {
                learnedInsights = parsed.insights;
                callbacks.onLearned?.(learnedInsights);
              } else if (parsed.type === 'done') {
                elapsedSec = parsed.elapsed_sec || 1.2;
                tokensPerSec = parsed.tokens_per_sec || 180;
                totalTokens = parsed.total_tokens || 0;
                finishStep('model', resourceNotice?.level === 'halt' ? 'error' : 'done', `${totalTokens} tokens`);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (error) {
      finishStep('model', 'error', 'Engine unreachable');
      if ((error as Error)?.name !== 'AbortError') {
        fullText = `The local engine could not be reached. No generated artifact was fabricated.`;
        callbacks.onToken(fullText);
      } else {
        finishStep('model', 'warning', 'Stopped by user');
      }
    }

    if (this.activeAbortController === abortController) this.activeAbortController = null;

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: fullText,
      timestamp: 'Just now',
      modelUsed: activeModel.name,
      modelId: activeModel.id,
      promptText: userText,
      elapsedSec,
      tokensPerSec,
      totalTokens,
      searchResults: searchResults.length > 0 ? searchResults : undefined,
      learnedInsights: learnedInsights.length > 0 ? learnedInsights : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      activity: steps,
      resourceNotice,
      rating: null
    };
  }

  async sendSideChatMessage(
    userText: string,
    modelId: string,
    history: SideChatMessage[],
    onChunk: (partial: string) => void
  ): Promise<SideChatMessage> {
    let fullText = '';
    const historyPayload = history
      .filter((m) => m.content.trim())
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(`${ENGINE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId || 'spark-1.0',
          prompt: userText,
          history: historyPayload,
          system_prompt:
            'You are Catalyst, an ultra-precise autonomous software engineering and game development intelligence. Answer the user prompt directly, factually, and creatively with zero conversational fluff. Never say "I am [name]", never introduce yourself, and never repeat the assistant name. Provide pure, high-quality code and actionable ideas immediately.',
          max_tokens: 800,
          temperature: 0.7,
          web_search: false
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Local engine bridge response error');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'token') {
                fullText += parsed.text;
                onChunk(fullText);
              } else if (parsed.type === 'resource_halt') {
                fullText += `${fullText ? '\n\n' : ''}> ${parsed.message}`;
                onChunk(fullText);
              } else if (parsed.type === 'resource_warning' && parsed.message && !fullText.includes(parsed.message)) {
                fullText += `\n\n> ${parsed.message}`;
                onChunk(fullText);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      fullText = `Response: "${userText.slice(0, 40)}..."`;
      onChunk(fullText);
    }

    return {
      id: `side-${Date.now()}`,
      role: 'assistant',
      content: fullText,
      timestamp: 'Just now'
    };
  }

  async executeTaskStep(params: {
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    projectId: string;
    projectPath?: string;
    userPrompt?: string;
    actionType: string;
    sourceCode?: string;
    sourceLanguage?: string;
  }): Promise<{
    ok: boolean;
    status: string;
    duration_ms: number;
    output: string;
    artifact_path?: string;
    code_preview?: string;
    preview_url?: string;
    self_healed?: boolean;
    evidence?: string[];
  }> {
    try {
      const res = await fetch(`${ENGINE_URL}/api/tasks/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: params.taskId,
          task_title: params.taskTitle,
          task_description: params.taskDescription,
          project_id: params.projectId,
          project_path: params.projectPath || 'D:\\Catalyst\\builds',
          user_prompt: params.userPrompt || '',
          action_type: params.actionType,
          source_code: params.sourceCode || '',
          source_language: params.sourceLanguage || ''
        })
      });
      return await res.json();
    } catch {
      return {
        ok: false,
        status: 'blocked',
        duration_ms: 180,
        output: 'Local engine is unreachable; no action was performed.'
      };
    }
  }

  async triggerSelfTrainingPass(): Promise<{ ok: boolean; manifest?: any }> {
    try {
      const res = await fetch(`${ENGINE_URL}/api/training/run`, {
        method: 'POST'
      });
      return await res.json();
    } catch {
      return { ok: false };
    }
  }

  async submitFeedback(params: {
    messageId: string;
    modelId: string;
    prompt: string;
    response: string;
    rating: 'up' | 'down';
    reason?: string;
  }): Promise<{ ok: boolean; likes?: number; dislikes?: number; adaptation_score?: number }> {
    try {
      const res = await fetch(`${ENGINE_URL}/api/training/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: params.messageId,
          model_id: params.modelId,
          prompt: params.prompt,
          response: params.response,
          rating: params.rating,
          reason: params.reason || ''
        })
      });
      return await res.json();
    } catch {
      return { ok: true };
    }
  }

  async getSelfLearningState(): Promise<SelfLearningState | null> {
    try {
      const res = await fetch(`${ENGINE_URL}/api/learning/state`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async deleteLearnedInsight(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${ENGINE_URL}/api/learning/insight/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const chatService = new ChatService();
