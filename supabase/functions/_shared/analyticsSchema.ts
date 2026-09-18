// T2.10 · Analytics Contract (server-only)
// Defense-in-Depth beside DB CHECK constraints. Every payload MUST validate here
// before entering the operational_event_outbox / analytics_metric_outbox pipeline.
//
// Rules:
//  - No freeform property bags. `.strict()` rejects unknown keys.
//  - Operational events carry pseudonymous refs and stay INTERNAL.
//  - Metric buckets NEVER carry actor/space/team/user identifiers.
//  - PostHog capture uses constant distinct_id = `ops-system:${env}` and $process_person_profile: false.

import { z } from "npm:zod@3.23.8";

export const ENVIRONMENTS = ["production", "staging", "development", "test"] as const;
export const TIERS        = ["free", "pro", "power", "team", "enterprise"] as const;
export const SIZE_BUCKETS = ["1", "2-5", "6-20", "21+"] as const;
export const RESULTS      = ["success", "failure"] as const;

export const METRIC_NAMES = [
  "tenancy.space_switch.success", "tenancy.space_switch.failure",
  "team.seat.assigned",           "team.seat.revoked",
  "team.invite.success",          "team.invite.failure",
  "impulse.create.success",       "impulse.create.failure",
  "auth.login.success",           "auth.login.failure",
  "analytics.delivery.pending",   "analytics.delivery.failed",
] as const;

export const OperationalEventSchema = z.object({
  event_name:       z.enum(METRIC_NAMES),
  result:           z.enum(RESULTS),
  actor_ref:        z.string().uuid().nullable().optional(),
  space_ref:        z.string().uuid().nullable().optional(),
  team_ref:         z.string().uuid().nullable().optional(),
  tier:             z.enum(TIERS).nullable().optional(),
  team_size_bucket: z.enum(SIZE_BUCKETS).nullable().optional(),
  surface:          z.string().max(64).nullable().optional(),
  error_class:      z.string().max(64).nullable().optional(),
  environment:      z.enum(ENVIRONMENTS).default("production"),
}).strict();

export type OperationalEventInput = z.infer<typeof OperationalEventSchema>;

export const MetricBucketSchema = z.object({
  metric_id:          z.string().uuid(),
  metric_name:        z.enum(METRIC_NAMES),
  bucket_start:       z.string().datetime(),
  bucket_end:         z.string().datetime(),
  environment:        z.enum(ENVIRONMENTS),
  tier:               z.enum(TIERS).nullable().optional(),
  size_bucket:        z.enum(SIZE_BUCKETS).nullable().optional(),
  result:             z.enum(RESULTS).nullable().optional(),
  error_class:        z.string().max(64).nullable().optional(),
  metric_value:       z.number().finite().nonnegative(),
  source_event_count: z.number().int().nonnegative(),
}).strict().refine((v) => new Date(v.bucket_end) > new Date(v.bucket_start), {
  message: "bucket_end must be > bucket_start",
  path: ["bucket_end"],
});

export type MetricBucketInput = z.infer<typeof MetricBucketSchema>;

/**
 * Forbidden properties — even if a caller tries to smuggle these in.
 * Enforced by `.strict()` above; this list documents intent for reviewers/tests.
 */
export const FORBIDDEN_METRIC_PROPS = [
  "actor_ref", "space_ref", "team_ref",
  "user_id", "customer_id", "email", "email_domain",
  "session_id", "device_id", "ip", "geo",
  "url", "route", "referrer", "user_agent", "browser",
  "project_id", "impulse_id", "content", "prompt",
  "stacktrace", "payload", "metadata", "context", "properties", "raw_event",
] as const;

export type PostHogOperationalMetric = {
  uuid: string;                                       // = metric_id; PostHog dedup anchor
  event: "ops.metric_bucket";
  distinct_id: `ops-system:${typeof ENVIRONMENTS[number]}`;
  timestamp: string;                                   // = bucket_end (ISO)
  properties: {
    $process_person_profile: false;                    // mandatory
    schema_version: 1;
    metric_name: typeof METRIC_NAMES[number];
    environment: typeof ENVIRONMENTS[number];
    bucket_start: string;
    bucket_end: string;
    tier?: typeof TIERS[number];
    size_bucket?: typeof SIZE_BUCKETS[number];
    result?: typeof RESULTS[number];
    error_class?: string;
    metric_value: number;
    source_event_count: number;
  };
};

export function toPostHogEvent(row: MetricBucketInput): PostHogOperationalMetric {
  const env = row.environment;
  const props: PostHogOperationalMetric["properties"] = {
    $process_person_profile: false,
    schema_version: 1,
    metric_name: row.metric_name,
    environment: env,
    bucket_start: row.bucket_start,
    bucket_end: row.bucket_end,
    metric_value: row.metric_value,
    source_event_count: row.source_event_count,
  };
  if (row.tier)        props.tier = row.tier;
  if (row.size_bucket) props.size_bucket = row.size_bucket;
  if (row.result)      props.result = row.result;
  if (row.error_class) props.error_class = row.error_class;

  return {
    uuid: row.metric_id,
    event: "ops.metric_bucket",
    distinct_id: `ops-system:${env}`,
    timestamp: row.bucket_end,
    properties: props,
  };
}