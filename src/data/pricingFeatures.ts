/**
 * String values in this file are **i18n keys** (see src/i18n/locales/*.ts),
 * not user-facing copy. Consumers must resolve them via `t(...)`.
 * Prices, thresholds, feature flags and order are language-agnostic and stay here.
 */
export const pricingFeatures = {
  free: {
    name: 'pricing.tiers.free.name',
    description: 'pricing.tiers.free.description',
    price: { monthly: 0, yearly: 0 },
    archetype: {
      label: 'pricing.tiers.free.archetype.label',
      persona: 'pricing.tiers.free.archetype.persona',
    },
    primaryUpgradeTrigger: 'project_limit_reached',
    features: [
      { name: 'pricing.features.impulse_catcher', included: true },
      { name: 'pricing.features.kanban_board', included: true },
      { name: 'pricing.features.up_to_3_projects', included: true },
      { name: 'pricing.features.up_to_50_impulses', included: true },
      { name: 'pricing.features.basic_dashboard', included: true },
      { name: 'pricing.features.sprint_mode', included: true },
      { name: 'pricing.features.mobile_pwa', included: true },
      { name: 'pricing.features.ai_tagging', included: false },
      { name: 'pricing.features.semantic_search', included: false },
      { name: 'pricing.features.analytics_dashboard', included: false },
      { name: 'pricing.features.ai_optimization', included: false },
      { name: 'pricing.features.export_functions', included: false },
      { name: 'pricing.features.blueprint_engine', included: false },
      { name: 'pricing.features.api_access', included: false },
      { name: 'pricing.features.team_collab', included: false },
      { name: 'pricing.features.priority_support', included: false }
    ]
  },
  pro: {
    name: 'pricing.tiers.pro.name',
    description: 'pricing.tiers.pro.description',
    price: { monthly: 12, yearly: 122 }, // 15% Rabatt: 12 * 12 * 0.85 = 122.4
    archetype: {
      label: 'pricing.tiers.pro.archetype.label',
      persona: 'pricing.tiers.pro.archetype.persona',
    },
    primaryUpgradeTrigger: 'repeated_project_structure',
    features: [
      { name: 'pricing.features.all_free_features', included: true },
      { name: 'pricing.features.unlimited_projects_impulses', included: true },
      { name: 'pricing.features.ai_tagging', included: true },
      { name: 'pricing.features.semantic_search', included: true },
      { name: 'pricing.features.analytics_dashboard', included: true },
      { name: 'pricing.features.ai_optimization', included: true },
      { name: 'pricing.features.export_functions', included: true },
      { name: 'pricing.features.share_target_api', included: true },
      { name: 'pricing.features.swipe_gestures', included: true },
      { name: 'pricing.features.blueprint_engine', included: false },
      { name: 'pricing.features.api_access', included: false },
      { name: 'pricing.features.team_collab', included: false },
      { name: 'pricing.features.priority_support', included: false }
    ]
  },
  power: {
    name: 'pricing.tiers.power.name',
    description: 'pricing.tiers.power.description',
    price: { monthly: 35, yearly: 357 }, // 15% Rabatt: 35 * 12 * 0.85 = 357
    archetype: {
      label: 'pricing.tiers.power.archetype.label',
      persona: 'pricing.tiers.power.archetype.persona',
    },
    primaryUpgradeTrigger: 'team_invite_attempted',
    features: [
      { name: 'pricing.features.all_pro_features', included: true },
      { name: 'pricing.features.blueprint_engine', included: true },
      { name: 'pricing.features.evolution_engine', included: true },
      { name: 'pricing.features.api_access_personal_token', included: true },
      { name: 'pricing.features.priority_support', included: true },
      { name: 'pricing.features.advanced_analytics', included: true },
      { name: 'pricing.features.custom_workflows', included: true },
      { name: 'pricing.features.team_collab', included: false },
      { name: 'pricing.features.central_admin', included: false }
    ]
  },
  enterprise: {
    name: 'pricing.tiers.enterprise.name',
    description: 'pricing.tiers.enterprise.description',
    // Preis pro Seat/Monat bzw. pro Seat/Jahr (Selfservice bis 50 Seats;
    // >50 Seats laufen über Sales-Kontakt).
    price: { monthly: 15, yearly: 150 },
    perSeat: true,
    minSeats: 5,
    maxSeats: 50,
    archetype: {
      label: 'pricing.tiers.enterprise.archetype.label',
      persona: 'pricing.tiers.enterprise.archetype.persona',
    },
    primaryUpgradeTrigger: 'seat_utilization_high',
    features: [
      { name: 'pricing.features.all_power_features', included: true },
      { name: 'pricing.features.team_collab_unlimited', included: true },
      { name: 'pricing.features.central_admin_dashboard', included: true },
      { name: 'pricing.features.custom_integrations', included: true },
      { name: 'pricing.features.sla_dedicated_support', included: true },
      { name: 'pricing.features.custom_onboarding', included: true },
      { name: 'pricing.features.sso_saml', included: true },
      { name: 'pricing.features.audit_logs', included: true },
      { name: 'pricing.features.custom_contracts', included: true }
    ]
  }
};

export const tierLimits = {
  free: {
    projects: 3,
    impulses: 50,
    apiCalls: 100,
    storage: 100 // MB
  },
  pro: {
    projects: Infinity,
    impulses: Infinity,
    apiCalls: 10000,
    storage: 1000 // MB
  },
  power: {
    projects: Infinity,
    impulses: Infinity,
    apiCalls: 100000,
    storage: 10000 // MB
  },
  enterprise: {
    projects: Infinity,
    impulses: Infinity,
    apiCalls: Infinity,
    storage: Infinity
  }
};
