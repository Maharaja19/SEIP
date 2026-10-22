const BaseAIProvider = require("./BaseAIProvider");
const { AITimeoutError } = require("../aiErrors");

class MockAIProvider extends BaseAIProvider {
  constructor(config = {}) {
    super("mock", config);
    this.textResponse = config.textResponse || "Mock AI text response";
    this.structuredResponse = config.structuredResponse || { status: "success" };
    this.delayMs = config.delayMs || 0;
    this.shouldFail = config.shouldFail || false;
    this.failureError = config.failureError || new Error("Simulated mock failure");
    this.enabled = config.enabled !== undefined ? config.enabled : true;
  }

  isAvailable() {
    return this.enabled;
  }

  getProviderInfo() {
    return {
      provider: "mock",
      model: "mock-v1",
      available: this.isAvailable()
    };
  }

  async _wait(timeoutMs) {
    if (this.delayMs > 0) {
      if (timeoutMs && this.delayMs > timeoutMs) {
        await new Promise(r => setTimeout(r, timeoutMs + 10));
        throw new AITimeoutError(`Mock provider timed out after ${timeoutMs}ms`, timeoutMs);
      }
      await new Promise(r => setTimeout(r, this.delayMs));
    }
  }

  async generateText({ prompt, timeoutMs }) {
    await this._wait(timeoutMs);
    if (this.shouldFail) throw this.failureError;
    if (typeof this.textResponse === "function") {
      return this.textResponse(prompt);
    }
    return this.textResponse;
  }

  async generateStructured({ prompt, timeoutMs }) {
    await this._wait(timeoutMs);
    if (this.shouldFail) throw this.failureError;
    if (typeof this.structuredResponse === "function") {
      return this.structuredResponse(prompt);
    }
    return this.structuredResponse;
  }
}

module.exports = MockAIProvider;
