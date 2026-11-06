import type { CatalystSkill } from '../types/catalyst';

export const DEFAULT_SKILLS: CatalystSkill[] = [
  {
    id: 'full-stack-coding',
    name: 'Full-Stack Software Architecture',
    version: '1.0.0',
    category: 'General Coding',
    description:
      'Design patterns, modular architecture, typed contracts, and testing across Python, TypeScript, Rust, C++, and Go.',
    rules: [
      'Follow strict separation of concerns between business logic, data models, and UI presentation.',
      'Prefer typed data contracts, deterministic error handling, and guard clauses over nested conditionals.',
      'Write clean, self-documenting code with clear variable and function names.'
    ],
    tags: ['coding', 'architecture', 'typescript', 'python', 'rust', 'clean-code'],
    enabled: true
  },
  {
    id: '3d-modelling-cad',
    name: '3D Modelling & Mesh Topology',
    version: '1.0.0',
    category: 'Modelling',
    description:
      'Poly-modeling, non-destructive modifiers, manifold geometry, quad topology, UV unwrapping, and LOD generation.',
    rules: [
      'Ensure all meshes are manifold with consistent face normals and zero non-manifold edges.',
      'Maintain clean edge flow along deformation joints for smooth skeletal deformation.',
      'Optimize UV islands with uniform texel density and minimal distortion.'
    ],
    tags: ['3d', 'modelling', 'blender', 'topology', 'mesh', 'uv'],
    enabled: true
  },
  {
    id: 'rigging-skeletal-animation',
    name: 'Rigging & Skeletal Animation',
    version: '1.0.0',
    category: 'Animation',
    description:
      'Inverse Kinematics (IK/FK), bone weight painting, blend shapes, state machines, and animation curves.',
    rules: [
      'Set up dual-quaternion skinning to eliminate volume loss at sharp joint bends.',
      'Keep keyframe curves smooth using custom bezier handles with continuous tangents.',
      'Normalize bone weights so no vertex exceeds 4 bone influences for optimal GPU skinning.'
    ],
    tags: ['animation', 'rigging', 'ik', 'motion', 'keyframes', 'blendshapes'],
    enabled: true
  },
  {
    id: 'procedural-world-building',
    name: 'Procedural World & Environment Building',
    version: '1.0.0',
    category: 'Building',
    description:
      'Deterministic seed-based generation, modular asset snapping, terrain heightmaps, and spatial partitioning.',
    rules: [
      'Use reproducible pseudo-random noise functions (Simplex/Perlin) tied to an explicit seed.',
      'Snap modular structural assets to a strict integer coordinate grid to prevent seams.',
      'Implement spatial hashing or BVH for fast collision and visibility tests.'
    ],
    tags: ['building', 'procedural', 'environment', 'level-design', 'generation'],
    enabled: true
  },
  {
    id: 'algorithmic-optimization',
    name: 'Performance & Memory Optimization',
    version: '1.0.0',
    category: 'Performance',
    description:
      'Low-level cache locality, zero-allocation algorithms, data-oriented design (ECS), SIMD parallelism, and memory profiling.',
    rules: [
      'Avoid dynamic memory allocations in high-frequency execution loops; use pre-allocated object pools.',
      'Structure data in contiguous Arrays-of-Structures or Structures-of-Arrays for maximum L1/L2 cache hits.',
      'Profile latency bottlenecks using deterministic hardware timers before introducing complexity.'
    ],
    tags: ['performance', 'optimization', 'memory', 'profiling', 'simd', 'low-level'],
    enabled: true
  },
  {
    id: 'devops-compilation-tools',
    name: 'Tooling, Compilers & Automation',
    version: '1.0.0',
    category: 'Tooling',
    description:
      'Build systems, CMake, Cargo, npm scripts, automated linting, AST inspection, and MCP tool orchestration.',
    rules: [
      'Enforce deterministic reproducible builds with pinned dependencies and lockfiles.',
      'Automate static type verification and linting prior to code commits.',
      'Structure CLI and tool inputs to provide human-readable logs and actionable error codes.'
    ],
    tags: ['devops', 'compilers', 'tooling', 'mcp', 'automation', 'build'],
    enabled: true
  }
];

class SkillsService {
  private skills: CatalystSkill[] = [];

  constructor() {
    this.loadSkills();
  }

  loadSkills(): CatalystSkill[] {
    try {
      const stored = localStorage.getItem('orbia_catalyst_skills');
      if (stored) {
        this.skills = JSON.parse(stored);
      } else {
        this.skills = [...DEFAULT_SKILLS];
        this.persist();
      }
    } catch {
      this.skills = [...DEFAULT_SKILLS];
    }
    return this.skills;
  }

  getAllSkills(): CatalystSkill[] {
    return this.skills;
  }

  toggleSkill(id: string): void {
    this.skills = this.skills.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    this.persist();
  }

  addSkill(skill: Omit<CatalystSkill, 'id'>): CatalystSkill {
    const newSkill: CatalystSkill = {
      ...skill,
      id: `skill-${Date.now()}`,
      isCustom: true
    };
    this.skills.push(newSkill);
    this.persist();
    return newSkill;
  }

  deleteSkill(id: string): void {
    this.skills = this.skills.filter((s) => s.id !== id);
    this.persist();
  }

  exportSkillsAsJson(): string {
    return JSON.stringify(this.skills, null, 2);
  }

  importSkillsFromJson(jsonText: string): boolean {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        const validated = parsed.filter((s) => s.id && s.name && s.description);
        this.skills = validated;
        this.persist();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getActiveSkillDirectives(taskText = ''): string {
    const enabled = this.skills.filter((s) => s.enabled);
    if (!enabled.length) return '';
    const text = taskText.toLowerCase();
    let active = enabled;
    if (text.trim()) {
      const scored = enabled
        .map((s) => {
          const keys = [...s.tags, s.category, ...s.name.split(/[^a-zA-Z0-9]+/)]
            .map((k) => k.toLowerCase())
            .filter((k) => k.length > 2);
          return { s, score: keys.filter((k) => text.includes(k)).length };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.s);
      active = scored.length ? scored : enabled.filter((s) => s.category === 'General Coding').slice(0, 1);
    }
    if (!active.length) return '';
    return (
      'RELEVANT SKILLS:\n' +
      active
        .map(
          (s) =>
            `[${s.name}]\n${s.description}\nRules:\n` + s.rules.map((r) => ` - ${r}`).join('\n')
        )
        .join('\n\n')
    );
  }

  private persist(): void {
    try {
      localStorage.setItem('orbia_catalyst_skills', JSON.stringify(this.skills));
    } catch (e) {
      console.error('Failed to persist skills', e);
    }
  }
}

export const skillsService = new SkillsService();
