/**
 * Confidence Policy & Thresholds for SEIP AI Expense Categorization.
 * Centralizes categorization confidence levels to prevent scattered magic numbers.
 */

const CONFIDENCE_LEVELS = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.60
};

/**
 * Evaluates raw confidence float (0.0 - 1.0) into a categorical tier.
 * @param {number} confidence
 * @returns {"HIGH" | "MEDIUM" | "LOW"}
 */
function evaluateConfidenceTier(confidence) {
  const conf = Number(confidence) || 0;
  if (conf >= CONFIDENCE_THRESHOLDS.HIGH) {
    return CONFIDENCE_LEVELS.HIGH;
  }
  if (conf >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return CONFIDENCE_LEVELS.MEDIUM;
  }
  return CONFIDENCE_LEVELS.LOW;
}

/**
 * Returns whether a classification can be presented as a strong recommendation.
 * Low confidence (< 0.60) classifications are flagged as weak suggestions.
 */
function isStrongSuggestion(confidence) {
  return (Number(confidence) || 0) >= CONFIDENCE_THRESHOLDS.MEDIUM;
}

module.exports = {
  CONFIDENCE_LEVELS,
  CONFIDENCE_THRESHOLDS,
  evaluateConfidenceTier,
  isStrongSuggestion
};
