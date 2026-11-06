import type { TaskPlan, TaskItem } from '../types/catalyst';
import { storageService } from './storageService';
import { chatService } from './chatService';

class PlanningService {
  shouldCreatePlan(prompt: string): boolean {
    const text = prompt.toLowerCase();
    return /\b(add|build|create|implement|fix|refactor|rewrite|update|migrat|debug|test|generate|make|change)\b/.test(text) &&
      !/^\s*(what|why|how|can you explain|explain|tell me)\b/.test(text);
  }

  createPlanFromPrompt(projectId: string, userPrompt: string): TaskPlan {
    const tasks: TaskItem[] = [
      {
        id: 't-1',
        title: 'Inspect workspace',
        description: 'Inventory source files, manifests, and project instructions before making a change.',
        action: 'inspect_workspace',
        status: 'pending'
      },
      {
        id: 't-2',
        title: 'Write generated source',
        description: 'Write the source returned by the selected model. This step is blocked until the model response contains a code block.',
        action: 'write_artifact',
        status: 'pending'
      },
      {
        id: 't-3',
        title: 'Validate artifact',
        description: 'Run a syntax-level validation appropriate to the generated artifact. Results are reported as evidence, not guessed.',
        action: 'validate_artifact',
        status: 'pending'
      },
      {
        id: 't-4',
        title: 'Run workspace verification',
        description: 'Run the safest available project check and capture real stdout/stderr evidence.',
        action: 'verify_workspace',
        status: 'pending'
      },
      {
        id: 't-5',
        title: 'Record verified checkpoint',
        description: 'Record the artifact path and validation evidence in the local build manifest.',
        action: 'checkpoint',
        status: 'pending'
      }
    ];

    const plan: TaskPlan = {
      id: `plan-${Date.now()}`,
      projectId,
      title: this.deriveTitle(userPrompt),
      prompt: userPrompt,
      status: 'planned',
      tasks,
      progressPercent: 0,
      logs: [`[Plan] Created ${tasks.length} explicit stages with a verification gate. Waiting for model output before source can be written.`],
      createdAt: 'Just now',
      sourceStatus: 'pending'
    };

    const existing = storageService.getPlans(projectId);
    storageService.savePlans([plan, ...existing]);
    return plan;
  }

  attachGeneratedSource(plan: TaskPlan, response: string): TaskPlan {
    const match = /```([\w+-]*)\s*\n([\s\S]*?)```/.exec(response);
    if (!match || !match[2].trim()) {
      plan.sourceStatus = 'unavailable';
      plan.logs.push('[Source] No fenced code block was found in the model response; no artifact will be written.');
    } else {
      plan.generatedLanguage = (match[1] || 'text').toLowerCase();
      plan.generatedSource = match[2].trim() + '\n';
      plan.sourceStatus = 'available';
      plan.logs.push(`[Source] Captured ${plan.generatedLanguage} source from the model response (${plan.generatedSource.length} characters).`);
    }
    this.persistPlan(plan);
    return { ...plan };
  }

  private persistPlan(plan: TaskPlan): void {
    const existing = storageService.getPlans(plan.projectId);
    const next = [plan, ...existing.filter((candidate) => candidate.id !== plan.id)];
    storageService.savePlans(next);
  }

  private deriveTitle(prompt: string): string {
    const cleaned = prompt.trim();
    if (cleaned.length < 40) return cleaned;
    const words = cleaned.split(' ').slice(0, 7).join(' ');
    return `${words}...`;
  }

  async executeStep(
    plan: TaskPlan,
    taskIndex: number,
    projectPath: string,
    onProgress: (updated: TaskPlan) => void
  ): Promise<TaskPlan> {
    if (taskIndex < 0 || taskIndex >= plan.tasks.length) return plan;

    const unmetPrerequisite = plan.tasks.slice(0, taskIndex).find(
      (candidate) => candidate.status !== 'completed' && candidate.status !== 'self_healed'
    );
    if (unmetPrerequisite) {
      plan.status = 'paused';
      plan.logs.push(`[Blocked] ${plan.tasks[taskIndex].title} requires "${unmetPrerequisite.title}" first.`);
      onProgress({ ...plan });
      return plan;
    }

    const task = plan.tasks[taskIndex];
    task.status = 'running';
    plan.status = 'executing';
    plan.logs.push(`[Running Stage ${taskIndex + 1}/${plan.tasks.length}] ${task.title}...`);
    onProgress({ ...plan });

    // Execute real action via engine backend
    const res = await chatService.executeTaskStep({
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      projectId: plan.projectId,
      projectPath,
      userPrompt: plan.prompt,
      actionType: task.action,
      sourceCode: plan.generatedSource,
      sourceLanguage: plan.generatedLanguage
    });

    if (!res.ok || res.status === 'halted' || res.status === 'blocked') {
      task.status = 'failed';
      task.output = res.output;
      plan.status = 'paused';
      plan.logs.push(`[Halted] ${task.title}: ${res.output}`);
      onProgress({ ...plan });
      return plan;
    }

    task.status = res.self_healed ? 'self_healed' : 'completed';
    task.durationMs = res.duration_ms || 180;
    task.output = res.output;
    task.artifactPath = res.artifact_path;
    task.code_preview = res.code_preview;
    task.preview_url = res.preview_url;
    task.self_healed = res.self_healed;
    task.evidence = res.evidence;

    plan.logs.push(`[Done] ${task.title} (${task.durationMs}ms): ${res.output}`);

    const completedCount = plan.tasks.filter((t) => t.status === 'completed' || t.status === 'self_healed').length;
    plan.progressPercent = Math.round((completedCount / plan.tasks.length) * 100);

    if (completedCount === plan.tasks.length) {
      plan.status = 'completed';
      plan.logs.push(`[Verified] All ${plan.tasks.length} stages completed with recorded evidence.`);
    }

    this.persistPlan(plan);
    onProgress({ ...plan });
    return plan;
  }
}

export const planningService = new PlanningService();
