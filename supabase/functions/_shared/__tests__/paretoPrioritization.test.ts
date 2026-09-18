import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { paretoTaskCount, rankTasksByPareto } from '../paretoPrioritization';

type Task = {
  id: string;
  content: string;
  status: string;
  tags?: string[] | null;
  tool?: string | null;
};

const task = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  content: `Ordinary task ${id}`,
  status: 'unprocessed',
  tags: [],
  tool: null,
  ...overrides,
});

describe('deterministic Pareto task prioritization', () => {
  it('selects the top 20 percent, with a minimum of one and maximum of three', () => {
    expect(paretoTaskCount(0)).toBe(0);
    expect(paretoTaskCount(1)).toBe(1);
    expect(paretoTaskCount(10)).toBe(2);
    expect(paretoTaskCount(40)).toBe(3);
  });

  it('prioritizes blockers and already-started work ahead of ordinary tasks', () => {
    const tasks = [
      task('ordinary-1'),
      task('started', { status: 'in-progress' }),
      task('ordinary-2'),
      task('blocker', { content: 'Resolve launch blocker', tags: ['blocker', 'high-impact'] }),
      task('ordinary-3'),
      task('ordinary-4'),
      task('ordinary-5'),
      task('ordinary-6'),
      task('ordinary-7'),
      task('ordinary-8'),
    ];

    expect(rankTasksByPareto(tasks).map(({ task }) => task.id)).toEqual(['blocker', 'started']);
  });

  it('uses stable input order for equal scores and never mutates its input', () => {
    const tasks = [task('first'), task('second'), task('third')];
    const before = structuredClone(tasks);

    expect(rankTasksByPareto(tasks).map(({ task }) => task.id)).toEqual(['first']);
    expect(tasks).toEqual(before);
  });

  it('returns transparent score reasons without external calls', () => {
    const [ranked] = rankTasksByPareto([
      task('critical', {
        status: 'in-progress',
        content: 'Urgent customer dependency before launch',
        tags: ['high-impact'],
      }),
    ]);

    expect(ranked.score).toBeGreaterThan(0);
    expect(ranked.reasons).toEqual(expect.arrayContaining([
      'already-in-progress',
      'tag:high-impact',
      'keyword:urgent',
      'keyword:customer',
      'keyword:dependency',
      'keyword:launch',
    ]));
  });

  it('keeps the deployed prioritization function independent from Lovable', () => {
    const source = readFileSync(
      `${process.cwd()}/supabase/functions/prioritize-tasks/index.ts`,
      'utf8',
    );

    expect(source).toContain("from '../_shared/paretoPrioritization.ts'");
    expect(source).toContain('rankTasksByPareto');
    expect(source).not.toContain('ai.gateway.lovable.dev');
    expect(source).not.toContain('LOVABLE_API_KEY');
  });
});
