const { AIValidationError } = require("../aiErrors");

/**
 * Robust JSON parser for LLM responses.
 * Strips markdown code blocks and trailing annotations safely.
 */
function cleanAndParseJson(text) {
  if (typeof text !== "string") {
    throw new AIValidationError("Raw model output is not a string", { raw: text });
  }

  // Remove markdown code fences ```json ... ``` or ``` ... ```
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt extracting first JSON object substring if model added preamble
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.substring(start, end + 1));
      } catch (innerErr) {
        // Fall through
      }
    }
    throw new AIValidationError(`Model output could not be parsed as valid JSON: ${err.message}`, { rawText: text.substring(0, 500) });
  }
}

/**
 * Validates transaction classification output against contract.
 *
 * Expected structure:
 * {
 *   "suggestedCategory": "Food", // or "category": "food"
 *   "confidence": 0.95,
 *   "reason": "Merchant corresponds to restaurant chain"
 * }
 */
function validateClassificationOutput(data, allowedCategories = null) {
  if (!data || typeof data !== "object") {
    throw new AIValidationError("Classification result must be an object", { received: typeof data });
  }

  const errors = [];
  const rawCat = data.suggestedCategory || data.category;

  let matchedCategory = null;
  if (!rawCat || typeof rawCat !== "string" || !rawCat.trim()) {
    errors.push("Field 'suggestedCategory' or 'category' is required and must be a non-empty string");
  } else {
    const trimmedCat = rawCat.trim();
    if (allowedCategories && Array.isArray(allowedCategories) && allowedCategories.length > 0) {
      const found = allowedCategories.find(c => {
        if (!c || typeof c !== "string") return false;
        const normC = c.toLowerCase().trim();
        const normTrimmed = trimmedCat.toLowerCase();
        return (
          normC === normTrimmed ||
          normC.replace(/[^a-z0-9]/g, "-") === normTrimmed.replace(/[^a-z0-9]/g, "-") ||
          normC.split(/[\s&/]+/).includes(normTrimmed)
        );
      });
      if (!found) {
        errors.push(`Category '${trimmedCat}' is not in allowed list [${allowedCategories.join(", ")}]`);
      } else {
        matchedCategory = found;
      }
    } else {
      matchedCategory = trimmedCat;
    }
  }

  // confidence (0.0 to 1.0)
  if (data.confidence === undefined || data.confidence === null) {
    data.confidence = 0.5; // neutral fallback
  } else if (typeof data.confidence !== "number" || isNaN(data.confidence) || data.confidence < 0 || data.confidence > 1) {
    errors.push("Field 'confidence' must be a number between 0.0 and 1.0");
  }

  // reason (max 300 chars)
  if (data.reason !== undefined && data.reason !== null) {
    if (typeof data.reason !== "string") {
      errors.push("Field 'reason' must be a string");
    } else if (data.reason.length > 300) {
      data.reason = data.reason.substring(0, 297) + "...";
    }
  }

  if (errors.length > 0) {
    throw new AIValidationError("Classification schema validation failed", errors);
  }

  return {
    suggestedCategory: matchedCategory,
    category: matchedCategory,
    confidence: Number(data.confidence.toFixed(2)),
    reason: data.reason ? data.reason.trim() : ""
  };
}

/**
 * Validates structured insight output.
 */
function validateInsightOutput(data) {
  if (!data || typeof data !== "object") {
    throw new AIValidationError("Insight result must be an object", { received: typeof data });
  }

  const errors = [];

  if (!data.title || typeof data.title !== "string") {
    errors.push("Field 'title' is required and must be a string");
  }

  if (!data.message && !data.summary) {
    errors.push("Either 'message' or 'summary' is required");
  }

  const severity = (data.severity || "info").toLowerCase();
  if (!["info", "low", "medium", "high", "critical"].includes(severity)) {
    errors.push("Invalid severity: must be info, low, medium, high, or critical");
  }

  if (data.confidence !== undefined && (typeof data.confidence !== "number" || data.confidence < 0 || data.confidence > 1)) {
    errors.push("Field 'confidence' must be a number between 0 and 1");
  }

  if (errors.length > 0) {
    throw new AIValidationError("Insight schema validation failed", errors);
  }

  return {
    title: data.title.trim().substring(0, 200),
    summary: (data.summary || data.message || "").trim().substring(0, 500),
    message: (data.message || data.summary || "").trim().substring(0, 2000),
    severity,
    confidence: typeof data.confidence === "number" ? Number(data.confidence.toFixed(2)) : 0.85,
    cause: data.cause ? String(data.cause).trim().substring(0, 500) : undefined,
    suggestion: data.suggestion ? String(data.suggestion).trim().substring(0, 1000) : undefined
  };
}

const VALID_SPENDING_INSIGHT_TYPES = [
  "SPENDING_SUMMARY",
  "CATEGORY_TREND",
  "SPENDING_CHANGE",
  "BUDGET_PROGRESS",
  "TOP_CATEGORY",
  "SAVING_OPPORTUNITY",
  "SPENDING_RECOMMENDATION",
  "SPENDING_INSIGHT"
];

const VALID_INSIGHT_SEVERITIES = ["info", "notice", "warning", "critical", "low", "medium", "high"];

/**
 * Validates array or object of structured spending insights.
 * Enforces schema constraints, limits maximum insights count,
 * and performs factual grounding against deterministic calculations.
 */
function validateSpendingInsightsOutput(data, deterministicFacts = null) {
  if (!data || typeof data !== "object") {
    throw new AIValidationError("Spending insights response must be an object or array", { received: typeof data });
  }

  const rawList = Array.isArray(data) ? data : (Array.isArray(data.insights) ? data.insights : [data]);
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return { insights: [] };
  }

  // Collect grounded numbers if deterministic facts are provided
  let groundedNumbers = null;
  if (deterministicFacts) {
    groundedNumbers = new Set();
    const collectNumbers = (obj) => {
      if (!obj || typeof obj !== "object") return;
      for (const val of Object.values(obj)) {
        if (typeof val === "number" && !isNaN(val)) {
          groundedNumbers.add(Math.round(val));
          groundedNumbers.add(Number(val.toFixed(1)));
        } else if (typeof val === "object") {
          collectNumbers(val);
        }
      }
    };
    collectNumbers(deterministicFacts);
  }

  const validatedInsights = [];
  const errors = [];

  for (let idx = 0; idx < Math.min(rawList.length, 6); idx++) {
    const item = rawList[idx];
    if (!item || typeof item !== "object") continue;

    // Type
    const rawType = (item.type || "SPENDING_SUMMARY").toUpperCase().trim();
    if (!VALID_SPENDING_INSIGHT_TYPES.includes(rawType)) {
      errors.push(`Insight #${idx + 1}: Invalid type '${rawType}'`);
    }

    // Title
    if (!item.title || typeof item.title !== "string" || !item.title.trim()) {
      errors.push(`Insight #${idx + 1}: Title is required and must be a string`);
    }

    // Summary / message
    const summary = item.summary || item.message;
    if (!summary || typeof summary !== "string" || !summary.trim()) {
      errors.push(`Insight #${idx + 1}: Summary or message is required`);
    }

    // Severity
    let severity = (item.severity || "info").toLowerCase().trim();
    if (!VALID_INSIGHT_SEVERITIES.includes(severity)) {
      severity = "info";
    }

    // Confidence
    let confidence = 0.85;
    if (item.confidence !== undefined && item.confidence !== null) {
      if (typeof item.confidence !== "number" || isNaN(item.confidence) || item.confidence < 0 || item.confidence > 1) {
        errors.push(`Insight #${idx + 1}: Confidence must be a number between 0.0 and 1.0`);
      } else {
        confidence = Number(item.confidence.toFixed(2));
      }
    }

    // Recommendation / suggestion
    const recommendation = item.recommendation || item.suggestion || undefined;

    // Phase 9: Factual Grounding Verification
    if (groundedNumbers && groundedNumbers.size > 0 && summary) {
      // Find numbers mentioned with currency (₹, INR, Rs) or percentages (%)
      const financialNumberMatches = summary.match(/(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d+)?)|([\d]+(?:\.\d+)?)\s*%/gi);
      if (financialNumberMatches) {
        for (const match of financialNumberMatches) {
          const numStr = match.replace(/[^0-9.]/g, "");
          const numVal = parseFloat(numStr);
          if (!isNaN(numVal) && numVal > 0) {
            // Check if present in grounded numbers (allow within 2% margin or ±1 for rounding)
            const isGrounded = Array.from(groundedNumbers).some(g => Math.abs(g - numVal) <= 1 || (g > 0 && Math.abs(g - numVal) / g < 0.02));
            if (!isGrounded && numVal > 10) {
              errors.push(`Insight #${idx + 1} contains ungrounded financial figure: ${match}`);
            }
          }
        }
      }
    }

    validatedInsights.push({
      type: rawType,
      title: item.title ? item.title.trim().substring(0, 200) : "Spending Insight",
      summary: summary ? summary.trim().substring(0, 500) : "",
      message: summary ? summary.trim().substring(0, 2000) : "",
      recommendation: recommendation ? String(recommendation).trim().substring(0, 1000) : undefined,
      suggestion: recommendation ? String(recommendation).trim().substring(0, 1000) : undefined,
      severity,
      confidence
    });
  }

  if (errors.length > 0) {
    throw new AIValidationError(`Spending insights schema validation failed: ${errors.join("; ")}`, errors);
  }

  return { insights: validatedInsights };
}

module.exports = {
  cleanAndParseJson,
  validateClassificationOutput,
  validateInsightOutput,
  validateSpendingInsightsOutput,
  VALID_SPENDING_INSIGHT_TYPES,
  VALID_INSIGHT_SEVERITIES
};
