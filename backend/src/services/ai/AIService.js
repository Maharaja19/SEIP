const GeminiProvider = require("./providers/GeminiProvider");
const aiLogger = require("./aiLogger");
const {
  AIRequestSizeError,
  AIConfigurationError
} = require("./aiErrors");
const {
  validateClassificationOutput,
  validateInsightOutput,
  validateSpendingInsightsOutput
} = require("./schemas/aiSchemas");

const MAX_PROMPT_CHARS = 4000;
const DEFAULT_TIMEOUT_MS = 10000;

class AIService {
  constructor(provider = null) {
    this.provider = provider || new GeminiProvider();
    this.maxPromptChars = MAX_PROMPT_CHARS;
    this.defaultTimeoutMs = DEFAULT_TIMEOUT_MS;
  }

  /**
   * Swap or inject an alternate AI provider (e.g., OpenAI, Mock, Local).
   */
  setProvider(provider) {
    if (!provider || typeof provider.generateText !== "function") {
      throw new Error("Invalid provider supplied: must implement BaseAIProvider interface");
    }
    this.provider = provider;
  }

  isAvailable() {
    return this.provider ? this.provider.isAvailable() : false;
  }

  getStatus() {
    const info = this.provider ? this.provider.getProviderInfo() : { provider: "none", model: "none", available: false };
    return {
      available: info.available,
      provider: info.provider,
      model: info.model,
      limits: {
        maxPromptChars: this.maxPromptChars,
        defaultTimeoutMs: this.defaultTimeoutMs
      }
    };
  }

  _validatePrompt(prompt) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Prompt must be a non-empty string");
    }
    if (prompt.length > this.maxPromptChars) {
      throw new AIRequestSizeError(
        `Prompt length (${prompt.length} characters) exceeds maximum allowed (${this.maxPromptChars} characters)`,
        this.maxPromptChars
      );
    }
  }

  /**
   * Generates free-form text response.
   */
  async generateText({ prompt, systemInstruction, maxTokens, temperature, timeoutMs, organizationId, userId }) {
    this._validatePrompt(prompt);
    const start = Date.now();
    const providerInfo = this.provider.getProviderInfo();

    try {
      const text = await this.provider.generateText({
        prompt: prompt.trim(),
        systemInstruction,
        maxTokens,
        temperature,
        timeoutMs: timeoutMs || this.defaultTimeoutMs
      });

      aiLogger.info("generateText", {
        provider: providerInfo.provider,
        model: providerInfo.model,
        latencyMs: Date.now() - start,
        organizationId,
        userId
      });

      return text;
    } catch (err) {
      aiLogger.error("generateText", err, {
        provider: providerInfo.provider,
        model: providerInfo.model,
        latencyMs: Date.now() - start,
        organizationId,
        userId
      });
      throw err;
    }
  }

  /**
   * Generates structured output validated against a schema validator function.
   */
  async generateStructured({ prompt, schemaValidator, systemInstruction, timeoutMs, organizationId, userId }) {
    this._validatePrompt(prompt);
    const start = Date.now();
    const providerInfo = this.provider.getProviderInfo();

    try {
      const rawJson = await this.provider.generateStructured({
        prompt: prompt.trim(),
        systemInstruction,
        timeoutMs: timeoutMs || this.defaultTimeoutMs
      });

      const validated = schemaValidator ? schemaValidator(rawJson) : rawJson;

      aiLogger.info("generateStructured", {
        provider: providerInfo.provider,
        model: providerInfo.model,
        latencyMs: Date.now() - start,
        organizationId,
        userId
      });

      return validated;
    } catch (err) {
      aiLogger.error("generateStructured", err, {
        provider: providerInfo.provider,
        model: providerInfo.model,
        latencyMs: Date.now() - start,
        organizationId,
        userId
      });
      throw err;
    }
  }

  /**
   * Canonical transaction classification using structured AI output.
   */
  async classify({ description, amount, currency = "INR", merchant, payee, type = "expense", date, allowedCategories, organizationId, userId, timeoutMs }) {
    if (!this.isAvailable()) {
      throw new AIConfigurationError("AI classification provider is currently unavailable");
    }

    const categoriesList = allowedCategories && allowedCategories.length > 0
      ? allowedCategories.join(", ")
      : "Food & Dining, Transport, Shopping, Bills & Utilities, Education, Healthcare, Entertainment, Salary & Wages, Business Revenue, Investment, Other / Misc";

    const prompt = `Classify this transaction into one of the allowed categories:
Type: ${type}
Amount: ${amount} ${currency}
${merchant || payee ? `Merchant/Payee: "${merchant || payee}"\n` : ""}${description ? `Description: "${description}"\n` : ""}${date ? `Date: ${date}\n` : ""}Allowed Categories: [${categoriesList}]

Output strictly valid JSON with format:
{
  "suggestedCategory": "exact string from allowed categories",
  "confidence": number between 0.0 and 1.0,
  "reason": "short explanation"
}`;

    const result = await this.generateStructured({
      prompt,
      schemaValidator: (data) => validateClassificationOutput(data, allowedCategories),
      timeoutMs,
      organizationId,
      userId
    });

    const info = this.provider ? this.provider.getProviderInfo() : { provider: "unknown", model: "unknown" };

    return {
      suggestedCategory: result.suggestedCategory || result.category,
      category: result.category || result.suggestedCategory,
      confidence: result.confidence,
      reason: result.reason,
      provider: info.provider,
      model: info.model,
      source: "ai"
    };
  }

  /**
   * Generates grounded, structured spending insights from deterministic analytics facts.
   */
  async generateSpendingInsights({ analyticsContext, organizationId, userId, timeoutMs }) {
    if (!this.isAvailable()) {
      throw new AIConfigurationError("AI insight provider is currently unavailable");
    }

    const jsonContext = JSON.stringify(analyticsContext, null, 2);

    const prompt = `You are the SEIP Financial Intelligence Engine.
Analyze the following verified, deterministic financial metrics and generate clear, actionable spending insights.

FINANCIAL FACTS (DO NOT ALTER OR INVENT ANY NUMBERS):
${jsonContext}

RULES:
1. Explain patterns, category trends, changes, and budget health based strictly on the facts provided above.
2. DO NOT calculate or fabricate new totals, percentages, or numbers. If you mention amounts or percentages, they must strictly match the provided facts.
3. If data is flagged as insufficient or has no previous period, explicitly provide guidance without making trend claims.
4. Output strictly valid JSON with this format:
{
  "insights": [
    {
      "type": "one of: SPENDING_SUMMARY, CATEGORY_TREND, SPENDING_CHANGE, BUDGET_PROGRESS, TOP_CATEGORY, SAVING_OPPORTUNITY, SPENDING_RECOMMENDATION",
      "title": "Concise headline (max 80 chars)",
      "summary": "1-2 sentence factual explanation (max 300 chars)",
      "severity": "one of: info, notice, warning, critical",
      "confidence": number between 0.0 and 1.0,
      "recommendation": "Actionable advice or suggestion"
    }
  ]
}`;

    const result = await this.generateStructured({
      prompt,
      schemaValidator: (data) => validateSpendingInsightsOutput(data, analyticsContext),
      timeoutMs,
      organizationId,
      userId
    });

    const info = this.provider ? this.provider.getProviderInfo() : { provider: "unknown", model: "unknown" };
    return {
      insights: result.insights || [],
      provider: info.provider,
      model: info.model
    };
  }
}

// Singleton default instance
const defaultAIService = new AIService();

module.exports = defaultAIService;
module.exports.AIService = AIService;
