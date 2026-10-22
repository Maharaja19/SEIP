const BaseAIProvider = require("./BaseAIProvider");
const {
  AIConfigurationError,
  AIProviderError,
  AIRateLimitError,
  AITimeoutError
} = require("../aiErrors");
const { cleanAndParseJson } = require("../schemas/aiSchemas");

class GeminiProvider extends BaseAIProvider {
  constructor(config = {}) {
    const apiKey = config.apiKey !== undefined ? config.apiKey : (process.env.GEMINI_API_KEY || null);
    const model = config.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const defaultTimeoutMs = config.timeoutMs || 10000;

    super("gemini", { model, defaultTimeoutMs });

    this.apiKey = apiKey && typeof apiKey === "string" ? apiKey.trim() : null;
    this.modelName = model;
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.client = null;

    if (this.apiKey) {
      try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        this.client = new GoogleGenerativeAI(this.apiKey);
      } catch (err) {
        this.client = null;
      }
    }
  }

  isAvailable() {
    return Boolean(this.apiKey && this.client);
  }

  getProviderInfo() {
    return {
      provider: "gemini",
      model: this.modelName,
      available: this.isAvailable()
    };
  }

  /**
   * Internal execution with timeout.
   */
  async _withTimeout(promise, timeoutMs) {
    const limit = timeoutMs || this.defaultTimeoutMs;
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new AITimeoutError(`Gemini request timed out after ${limit}ms`, limit));
      }, limit);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Translates third-party Google Generative AI errors into SEIP AI Error hierarchy.
   */
  _translateError(err) {
    if (err instanceof AITimeoutError) return err;

    const message = err?.message || String(err);
    const status = err?.status || err?.statusCode;

    if (status === 429 || message.includes("429") || message.toLowerCase().includes("quota")) {
      return new AIRateLimitError("Gemini quota or rate limit exceeded");
    }

    if (status === 401 || status === 403 || message.toLowerCase().includes("api key")) {
      return new AIConfigurationError("Gemini authentication failure or invalid API key");
    }

    return new AIProviderError(`Gemini execution failed: ${message}`, err);
  }

  async generateText({ prompt, systemInstruction, maxTokens, temperature, timeoutMs }) {
    if (!this.isAvailable()) {
      throw new AIConfigurationError("Gemini provider is not configured or disabled");
    }

    try {
      const modelOptions = { model: this.modelName };
      if (systemInstruction) {
        modelOptions.systemInstruction = systemInstruction;
      }

      const generativeModel = this.client.getGenerativeModel(modelOptions);
      const generationConfig = {};
      if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
      if (temperature !== undefined) generationConfig.temperature = temperature;

      const call = generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig
      });

      const response = await this._withTimeout(call, timeoutMs);
      return response.response.text();
    } catch (err) {
      throw this._translateError(err);
    }
  }

  async generateStructured({ prompt, systemInstruction, timeoutMs }) {
    const structuredPrompt = `${prompt}\n\nIMPORTANT: Respond strictly with valid JSON only. Do not wrap in conversational text or commentary.`;
    const rawText = await this.generateText({
      prompt: structuredPrompt,
      systemInstruction,
      temperature: 0.1, // Low temperature for deterministic formatting
      timeoutMs
    });

    return cleanAndParseJson(rawText);
  }
}

module.exports = GeminiProvider;
