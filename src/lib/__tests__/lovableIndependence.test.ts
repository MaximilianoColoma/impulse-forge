import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function sourceFiles(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const full = join(path, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|html)$/.test(name) ? [full] : [];
  });
}

describe('Lovable-independent private PWA contract', () => {
  it('ships no Lovable runtime URL in frontend source', () => {
    const frontend = sourceFiles(join(root, 'src'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');

    expect(frontend).not.toMatch(/(?:ai\.gateway\.)?lovable\.(?:dev|app)/i);
  });

  it.each([
    ['src/services/aiTagging.ts', 'generate-tags'],
    ['src/services/semanticSearch.ts', 'semantic-search'],
    ['src/components/OptimizationWidget.tsx', 'optimize-structure'],
    ['src/components/ProjectStructureModal.tsx', 'brainstorm-structure'],
    ['src/components/dashboard/SmartMatchingWidget.tsx', 'get-fingerprint'],
    ['src/pages/Analytics.tsx', 'analyze-patterns'],
    ['src/pages/Blueprints.tsx', 'publish-blueprint'],
    ['src/pages/Blueprints.tsx', 'evolve-blueprint'],
  ])('%s gates optional function %s', (path, functionName) => {
    const source = read(path);
    expect(source).toContain('runtimeFeatures');
    expect(source).toContain(functionName);
  });

  it('keeps deterministic Pareto available without an edge-function deployment', () => {
    const projectBoard = read('src/pages/ProjectBoard.tsx');
    const nextSteps = read('src/components/dashboard/NextStepsWidget.tsx');

    expect(projectBoard).toContain('rankTasksByPareto');
    expect(nextSteps).toContain('rankTasksByPareto');
    expect(projectBoard).not.toContain("invoke('prioritize-tasks'");
    expect(nextSteps).not.toContain("invoke('prioritize-tasks'");
    expect(read('supabase/functions/prioritize-tasks/index.ts')).toContain('deterministic-pareto-v1');
  });

  it('guards the Analytics retry path before any optional AI invocation', () => {
    const analytics = read('src/pages/Analytics.tsx');
    const fetchStart = analytics.indexOf('const fetchAnalytics');
    const fetchEnd = analytics.indexOf('const getConfidenceColor');
    const fetchBlock = analytics.slice(fetchStart, fetchEnd);

    expect(fetchBlock.indexOf('if (!runtimeFeatures.optionalAiEnabled)')).toBeGreaterThanOrEqual(0);
    expect(fetchBlock.indexOf('if (!runtimeFeatures.optionalAiEnabled)')).toBeLessThan(
      fetchBlock.indexOf("invoke('analyze-patterns'"),
    );
  });

  it('excludes archived impulses from both Pareto query paths', () => {
    expect(read('src/components/dashboard/NextStepsWidget.tsx')).toContain(
      ".eq('is_archived', false)",
    );
    expect(read('supabase/functions/prioritize-tasks/index.ts')).toContain(
      ".eq('is_archived', false)",
    );
  });

  it('never runtime-caches authenticated Supabase responses', () => {
    const viteConfig = read('vite.config.ts');
    const main = read('src/main.tsx');

    expect(viteConfig).not.toContain('runtimeCaching');
    expect(viteConfig).not.toContain('supabase-cache');
    expect(main).toContain('await removeUnsafeLegacyCaches()');
    expect(main.indexOf('await removeUnsafeLegacyCaches()')).toBeLessThan(
      main.indexOf('createRoot('),
    );
  });
});
