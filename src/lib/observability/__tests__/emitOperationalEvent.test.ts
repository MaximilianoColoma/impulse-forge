// T2.10_A Gate · Client emitter contract.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import { emitOperationalEvent } from '../emitOperationalEvent';

const ALLOWED_KEYS = [
  'event_name', 'result', 'space_ref', 'team_ref',
  'surface', 'error_class', 'tier', 'team_size_bucket',
];

describe('emitOperationalEvent', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: { event_id: 'x' }, error: null });
  });

  it('relays the payload to the operational-event-emit function', async () => {
    await emitOperationalEvent({
      event_name: 'impulse.create.success',
      result: 'success',
      space_ref: null,
      surface: 'impulse_catcher',
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    const [fn, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe('operational-event-emit');
    expect(opts.body.event_name).toBe('impulse.create.success');
    expect(opts.body.result).toBe('success');
  });

  it('never sends keys outside the typed contract (no freeform props)', async () => {
    await emitOperationalEvent({
      event_name: 'tenancy.space_switch.success',
      result: 'success',
      space_ref: '00000000-0000-4000-8000-000000000001',
      team_ref: null,
      surface: 'space_switcher',
      error_class: null,
      tier: 'pro',
      team_size_bucket: '2-5',
    });

    const [, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    for (const key of Object.keys(opts.body)) {
      expect(ALLOWED_KEYS).toContain(key);
    }
  });

  it('never carries actor_ref (server resolves it from the JWT)', async () => {
    await emitOperationalEvent({
      event_name: 'auth.login.success',
      result: 'success',
    });
    const [, opts] = invoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(opts.body).not.toHaveProperty('actor_ref');
  });

  it('is fire-and-forget: resolves even when invoke rejects', async () => {
    invoke.mockImplementation(() => Promise.reject(new Error('network down')));
    await expect(
      emitOperationalEvent({ event_name: 'impulse.create.failure', result: 'failure' }),
    ).resolves.toBeUndefined();
  });

  it('never throws when invoke throws synchronously', async () => {
    invoke.mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(
      emitOperationalEvent({ event_name: 'auth.login.failure', result: 'failure' }),
    ).resolves.toBeUndefined();
  });
});