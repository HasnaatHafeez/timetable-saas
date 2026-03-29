/**
 * Feature System Foundation for SaaS
 * Centralized feature definitions and plan mappings
 */

const FEATURES = {
  TIMETABLE_GENERATE: "timetable:generate",
  TEACHER_MANAGE: "teacher:manage",
  SUBJECT_MANAGE: "subject:manage",
  ADVANCED_ANALYTICS: "analytics:advanced",
  MULTI_SECTION: "multi_section:enabled",
};

const PLANS = {
  FREE: "FREE",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
};

const PLAN_FEATURES = {
  FREE: [
    FEATURES.TEACHER_MANAGE,
    FEATURES.SUBJECT_MANAGE,
  ],
  PRO: [
    FEATURES.TEACHER_MANAGE,
    FEATURES.SUBJECT_MANAGE,
    FEATURES.TIMETABLE_GENERATE,
    FEATURES.MULTI_SECTION,
  ],
  ENTERPRISE: [
    "*", // full access
  ],
};

const PLAN_LIMITS = {
  FREE: {
    TIMETABLE_GENERATE_PER_MONTH: 2,
  },
  PRO: {
    TIMETABLE_GENERATE_PER_MONTH: 50,
  },
  ENTERPRISE: {
    TIMETABLE_GENERATE_PER_MONTH: -1, // unlimited
  },
};

const PLAN_FEATURES_MAP = Object.fromEntries(
  Object.entries(PLAN_FEATURES).map(([plan, features]) => [
    plan,
    new Set(features),
  ])
);

/**
 * Get features available for a given plan
 * @param {string} plan - Plan identifier (FREE, PRO, ENTERPRISE)
 * @returns {string[]} Array of feature identifiers
 */
function getPlanFeatures(plan) {
  return PLAN_FEATURES[plan] || [];
}

function hasFeature(plan, feature) {
  const features = PLAN_FEATURES_MAP[plan];

  if (!features) return false;

  // wildcard support
  if (features.has("*")) return true;

  return features.has(feature);
}

function assertFeature(plan, feature) {
  if (!hasFeature(plan, feature)) {
    const error = new Error("Feature not available in current plan");
    error.statusCode = 403;
    throw error;
  }
}

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || {};
}

module.exports = {
  FEATURES,
  PLANS,
  PLAN_FEATURES,
  PLAN_LIMITS,
  getPlanFeatures,
  hasFeature,
  assertFeature,
};

module.exports.getPlanLimits = getPlanLimits;
