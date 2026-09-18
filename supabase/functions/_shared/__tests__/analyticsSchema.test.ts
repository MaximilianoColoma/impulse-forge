// T2.10_A Gate · Server-side Zod contract.
import { describe, it, expect } from 'vitest';
import {
  OperationalEventSchema,
  MetricBucketSchema,
  FORBIDDEN_METRIC_PROPS,
  METRIC_NAMES,
} from '../analyticsSchema.ts';

const valid = {
  event_name: 'impulse.create.success',
  result: 'success',
} as const;

describe('OperationalEventSchema', () => {
  it('accepts a minimal payload and defaults environment to production', () => {
    const parsed = OperationalEventSchema.parse({ ...valid });
    expect(parsed.environment).toBe('production');
  });

  it('rejects unknown keys (no freeform property bags)', () => {
    for (const key of ['payload', 'metadata', 'properties', 'content', 'url']) {
      const res = OperationalEventSchema.safeParse({ ...valid, [key]: 'x' });
      expect(res.success, `key ${key} must be rejected`).toBe(false);
    }
  });

  it('rejects unknown event families', () => {
    expect(OperationalEventSchema.safeParse({ ...valid, event_name: 'foo.bar' }).success).toBe(false);
  });

  it('accepts every declared event family', () => {
    for (const name of METRIC_NAMES) {
      const res = OperationalEventSchema.safeParse({ event_name: name, result: 'success' });
      expect(res.success, name).toBe(true);
    }
  });

  it('rejects an invalid result enum', () => {
    expect(OperationalEventSchema.safeParse({ ...valid, result: 'maybe' }).success).toBe(false);
  });

  it('rejects non-uuid refs and overlong surface/error_class', () => {
    expect(OperationalEventSchema.safeParse({ ...valid, space_ref: 'not-a-uuid' }).success).toBe(false);
    expect(OperationalEventSchema.safeParse({ ...valid, surface: 'x'.repeat(65) }).success).toBe(false);
    expect(OperationalEventSchema.safeParse({ ...valid, error_class: 'x'.repeat(65) }).success).toBe(false);
  });

  it('treats optional refs as nullable', () => {
    const parsed = OperationalEventSchema.parse({
      ...valid,
      space_ref: null,
      team_ref: null,
      tier: null,
      team_size_bucket: null,
      surface: null,
      error_class: null,
    });
    expect(parsed.space_ref).toBeNull();
  });
});

describe('MetricBucketSchema', () => {
  const bucket = {
    metric_id: '00000000-0000-4000-8000-000000000001',
    metric_name: 'auth.login.success',
    bucket_start: '2026-07-17T10:00:00.000Z',
    bucket_end: '2026-07-17T11:00:00.000Z',
    environment: 'production',
    metric_value: 3,
    source_event_count: 3,
  };

  it('accepts a tenant-free bucket', () => {
    expect(MetricBucketSchema.safeParse(bucket).success).toBe(true);
  });

  it('rejects every forbidden (tenant-identifying) property', () => {
    for (const prop of FORBIDDEN_METRIC_PROPS) {
      const res = MetricBucketSchema.safeParse({ ...bucket, [prop]: 'x' });
      expect(res.success, `${prop} must be rejected`).toBe(false);
    }
  });

  it('rejects inverted bucket windows', () => {
    expect(
      MetricBucketSchema.safeParse({ ...bucket, bucket_end: '2026-07-17T09:00:00.000Z' }).success,
    ).toBe(false);
  });
});