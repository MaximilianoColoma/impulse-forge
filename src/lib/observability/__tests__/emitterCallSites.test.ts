// T2.10_A Gate · Regression guards for the wired emitter call sites.
// These are static-source guards: they fail loudly if a future refactor drops
// an emitter without replacing it, which unit-rendering tests would miss.
import { describe, it, expect } from 'vitest';
import useAuthSrc from '@/hooks/useAuth.tsx?raw';
import useActiveSpaceSrc from '@/hooks/useActiveSpace.tsx?raw';
import impulseCatcherSrc from '@/components/ImpulseCatcher.tsx?raw';

const sources: Record<string, string> = {
  'src/hooks/useAuth.tsx': useAuthSrc,
  'src/hooks/useActiveSpace.tsx': useActiveSpaceSrc,
  'src/components/ImpulseCatcher.tsx': impulseCatcherSrc,
};

const read = (p: string) => sources[p];

describe('emitter call sites', () => {
  it('useAuth confirms logins via the auth-login-confirm function', () => {
    const src = read('src/hooks/useAuth.tsx');
    expect(src).toMatch(/functions\.invoke\(\s*['"]auth-login-confirm['"]/);
    expect(src).toMatch(/SIGNED_IN/);
    // must not block or throw into the auth flow
    expect(src).toMatch(/auth-login-confirm'\)\s*\.catch/);
  });

  it('space switch emits tenancy.space_switch.success with the space_switcher surface', () => {
    const src = read('src/hooks/useActiveSpace.tsx');
    expect(src).toContain('emitOperationalEvent');
    expect(src).toContain('tenancy.space_switch.success');
    expect(src).toContain('space_switcher');
  });

  it('impulse creation emits both success and failure', () => {
    const src = read('src/components/ImpulseCatcher.tsx');
    expect(src).toContain('impulse.create.success');
    expect(src).toContain('impulse.create.failure');
    expect(src).toContain('impulse_catcher');
    // failure branch must classify the error without leaking content
    expect(src).toMatch(/error_class:/);
    expect(src).not.toMatch(/error_class:\s*error\?\.message/);
  });

  it('no call site passes actor_ref from the client', () => {
    for (const file of [
      'src/hooks/useActiveSpace.tsx',
      'src/components/ImpulseCatcher.tsx',
    ]) {
      expect(read(file)).not.toMatch(/actor_ref\s*:/);
    }
  });
});