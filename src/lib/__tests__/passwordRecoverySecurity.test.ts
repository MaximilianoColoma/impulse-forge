import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('password recovery security contract', () => {
  it('never parses or installs recovery credentials in the page component', () => {
    const source = read('src/pages/ResetPassword.tsx');
    const authProvider = read('src/hooks/useAuth.tsx');
    const recoveryState = read('src/integrations/supabase/passwordRecoveryState.ts');

    expect(recoveryState).toContain("event === 'PASSWORD_RECOVERY'");
    expect(recoveryState).toContain("event === 'SIGNED_IN' || event === 'SIGNED_OUT'");
    expect(authProvider).toContain('passwordRecoveryActive');
    expect(source).toContain('useAuth()');
    expect(source).not.toContain('onAuthStateChange(');
    expect(source).not.toContain("searchParams.get('access_token')");
    expect(source).not.toContain("searchParams.get('refresh_token')");
    expect(source).not.toContain('new URLSearchParams(');
    expect(source).not.toContain('setSession(');
    expect(source).not.toContain('exchangeCodeForSession(');
    expect(source).not.toContain('getSession(');
  });

  it('scrubs credential-shaped query values before loading the app module', () => {
    const html = read('index.html');
    const scrub = html.match(
      /<script id="auth-url-scrub">([\s\S]*?)<\/script>/,
    )?.[1];

    expect(scrub).toBeTruthy();
    expect(html.indexOf('auth-url-scrub')).toBeLessThan(
      html.indexOf('<script type="module"'),
    );
    expect(html).toContain('<meta name="referrer" content="no-referrer"');

    window.history.replaceState(
      {},
      '',
      '/reset-password?access_token=secret&refresh_token=secret2&keep=ok',
    );
    Function(scrub!)();

    expect(window.location.pathname).toBe('/reset-password');
    expect(window.location.search).toBe('?keep=ok');
    window.history.replaceState({}, '', '/');
  });

  it('starts the durable recovery observer before App and cache cleanup', () => {
    const main = read('src/main.tsx');

    expect(main).toContain('passwordRecoveryState');
    expect(main.indexOf('passwordRecoveryState')).toBeLessThan(main.indexOf('App from'));
    expect(main.indexOf('passwordRecoveryState')).toBeLessThan(
      main.indexOf('removeUnsafeLegacyCaches'),
    );
  });

  it('does not expose provider details or email addresses in the edge endpoint', () => {
    const edge = read('supabase/functions/reset-password/index.ts');

    expect(edge).not.toContain("console.log('Password reset email sent to:', email)");
    expect(edge).not.toContain('error instanceof Error ? error.message');
    expect(edge).toContain('Reset request could not be completed');
  });
});
