/**
 * Base AI Provider Abstract Interface.
 * Defines the contract that all concrete LLM providers (Gemini, OpenAI, Mock) must implement.
 */

class BaseAIProvider {
  constructor(name = "base", config = {}) {
    if (this.constructor === BaseAIProvider) {
      throw new Error("BaseAIProvider is abstract and cannot be instantiated directly.");
    }
    this.name = name;
    this.config = config;
  }

  /**
   * Determine whether the provider is configured and operational.
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error("isAvailable() must be implemented by provider");
  }

  /**
   * Return metadata about the provider (e.g. name, model, capabilities).
   * @returns {object}
   */
  getProviderInfo() {
    return {
      provider: this.name,
      model: this.config.model || "unknown",
      available: this.isAvailable()
    };
  }

  /**
   * Generates text response for a given prompt.
   * @param {object} params
   * @param {string} params.prompt
   * @param {string} [params.systemInstruction]
   * @param {number} [params.maxTokens]
   * @param {number} [params.temperature]
   * @param {number} [params.timeoutMs]
   * @returns {Promise<string>}
   */
  async generateText({ prompt, systemInstruction, maxTokens, temperature, timeoutMs }) {
    throw new Error("generateText() must be implemented by provider");
  }

  /**
   * Generates and parses a structured JSON response.
   * @param {object} params
   * @param {string} params.prompt
   * @param {string} [params.systemInstruction]
   * @param {number} [params.timeoutMs]
   * @returns {Promise<object>}
   */
  async generateStructured({ prompt, systemInstruction, timeoutMs }) {
    throw new Error("generateStructured() must be implemented by provider");
  }
}

module.exports = BaseAIProvider;
