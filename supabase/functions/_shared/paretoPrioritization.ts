export interface ParetoTask {
  id: string;
  content: string;
  status: string;
  tags?: string[] | null;
  tool?: string | null;
}

export interface RankedParetoTask<T extends ParetoTask> {
  task: T;
  score: number;
  reasons: string[];
}

const TAG_WEIGHTS: Record<string, number> = {
  blocker: 60,
  blocked: 60,
  'high-impact': 50,
  critical: 45,
  urgent: 40,
  dependency: 35,
  safety: 35,
  security: 35,
  legal: 30,
  customer: 30,
  revenue: 30,
  launch: 25,
};

const KEYWORD_WEIGHTS: Record<string, number> = {
  blocker: 35,
  blocked: 35,
  urgent: 25,
  dependency: 20,
  safety: 20,
  security: 20,
  legal: 18,
  customer: 15,
  revenue: 15,
  launch: 12,
};

function normalize(value: string): string {
  return value.toLocaleLowerCase('en-US');
}

export function paretoTaskCount(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.min(3, Math.max(1, Math.ceil(total * 0.2)));
}

export function scoreParetoTask(task: ParetoTask): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (task.status === 'in-progress') {
    score += 55;
    reasons.push('already-in-progress');
  }

  const normalizedTags = new Set((task.tags ?? []).map(normalize));
  for (const [tag, weight] of Object.entries(TAG_WEIGHTS)) {
    if (normalizedTags.has(tag)) {
      score += weight;
      reasons.push(`tag:${tag}`);
    }
  }

  const content = normalize(task.content);
  for (const [keyword, weight] of Object.entries(KEYWORD_WEIGHTS)) {
    const boundary = new RegExp(`(^|[^a-z0-9])${keyword.replace('-', '[-\\s]')}([^a-z0-9]|$)`, 'i');
    if (boundary.test(content)) {
      score += weight;
      reasons.push(`keyword:${keyword}`);
    }
  }

  if (task.tool) {
    score += 5;
    reasons.push('tool-ready');
  }

  return { score, reasons };
}

export function rankTasksByPareto<T extends ParetoTask>(tasks: readonly T[]): RankedParetoTask<T>[] {
  const ranked = tasks.map((task, index) => ({
    task,
    index,
    ...scoreParetoTask(task),
  }));

  ranked.sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked.slice(0, paretoTaskCount(tasks.length)).map(({ task, score, reasons }) => ({
    task,
    score,
    reasons,
  }));
}
