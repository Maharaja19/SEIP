# SEIP — AI Foundation Architecture Specification

**Document Version:** 1.0.0  
**Date:** October 6, 2026  
**Platform:** Smart Expense Intelligence Platform (SEIP)  
**Milestone:** Milestone 2A — AI Foundation Architecture  

---

## 1. AI Architecture Overview

The Smart Expense Intelligence Platform (SEIP) positions AI as an **advisory intelligence layer strictly isolated above the deterministic financial core**. 

```
┌────────────────────────────────────────────────────────┐
│                   SEIP Client App                      │
└───────────────────────────┬────────────────────────────┘
                            │ (Authenticated REST API)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Deterministic Financial Core           │
│   (Wallets, Double-Entry Ledgers, Budgets, Policies)   │
└───────────────────────────┬────────────────────────────┘
                            │ (Verified & Authoritative State)
                            ▼
┌────────────────────────────────────────────────────────┐
│              AI Data Preparation Layer (DTOs)          │
│        (Sanitization, Credential & PII Stripping)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Unified AIService                    │
│   (Prompt Limits, Timeouts, Error Translation, Logs)   │
└───────────────────────────┬────────────────────────────┘
                            │ (BaseAIProvider Contract)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Provider Abstraction Layer               │
│   ┌─────────────────────┐   ┌────────────────────────┐ │
│   │   GeminiProvider    │   │ Future (OpenAI / Mock) │ │
│   └─────────────────────┘   └────────────────────────┘ │
└───────────────────────────┬────────────────────────────┘
                            │ (Strict JSON Schemas)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Output Validation & AIInsight Model         │
│          (Bounds, Confidence, Scoped Storage)          │
└────────────────────────────────────────────────────────┘
```

### Cardinal Principle of Financial AI
> **AI models can produce errors, hallucinations, or non-deterministic variance.**  
> **Therefore, AI MUST NEVER have write access to financial ledger balances, transaction amounts, categories, or approval states.**  
> AI functions strictly as a read-only adviser that produces signals, recommendations, classifications, and explanations.

---

## 2. Provider Abstraction Layer

SEIP decouple business logic from third-party vendor SDKs through an object-oriented provider abstraction.

### 2.1 Base Provider Contract
[`BaseAIProvider`](file:///C:/Users/mmaha/Projects/Budget/SEIP/backend/src/services/ai/providers/BaseAIProvider.js) defines the contract:
- `isAvailable()`: Returns boolean readiness based on configuration.
- `getProviderInfo()`: Returns metadata (`provider`, `model`, `available`) without leaking credentials.
- `generateText({ prompt, systemInstruction, maxTokens, temperature, timeoutMs })`: Returns raw string response.
- `generateStructured({ prompt, systemInstruction, timeoutMs })`: Returns validated JSON object.

### 2.2 Implemented Providers
1. **`GeminiProvider`**: Interfaces with Google Generative AI (`@google/generative-ai`), supporting model configuration via `GEMINI_MODEL` (default: `gemini-1.5-flash`), with built-in per-request timeout handling and error mapping.
2. **`MockAIProvider`**: In-memory deterministic provider used for offline testing, simulating provider latency, quota errors, and schema variations without consuming network or billing resources.

---

## 3. Gemini Integration Boundary & Credential Protection

1. **Environment Variable Ingestion:**
   `GEMINI_API_KEY` and `GEMINI_MODEL` are loaded into backend runtime memory only.
2. **Zero Frontend Leakage:**
   The frontend build and client bundles NEVER receive or bundle `GEMINI_API_KEY`.
3. **Status Sanitization:**
   `GET /api/ai/status` exposes only `{ available, provider, model, limits }`. Secret keys are omitted from responses and logs.
4. **Graceful Degradation:**
   If `GEMINI_API_KEY` is omitted or invalid, `isAvailable()` evaluates to `false`. The platform operates seamlessly in rule-based fallback mode.

---

## 4. Data Preparation Layer

AI models do NOT receive raw database documents or MongoDB schemas.

[`dataPreparation.js`](file:///C:/Users/mmaha/Projects/Budget/SEIP/backend/src/services/ai/dataPreparation/dataPreparation.js) extracts strictly normalized DTOs:
- **`AITransactionContext`**: Exposes `type`, `amount`, `currency`, `merchant`, `description`, `department`, `tags`. All internal user hashes, passwords, internal document IDs, and session tokens are stripped.
- **`AIBudgetContext`**: Exposes `title`, `period`, `allocated`, `spent`, `remaining`, `utilizationPercentage`, and itemized expense lines.
- **`prepareAggregatedContext`**: Aggregates tenant metrics with sanitized totals for high-level advisors.

---

## 5. Structured AI Output & Schema Validation

Model outputs are treated as untrusted external inputs.

[`aiSchemas.js`](file:///C:/Users/mmaha/Projects/Budget/SEIP/backend/src/services/ai/schemas/aiSchemas.js) enforces strict validation:
1. **Markdown Fence Stripping (`cleanAndParseJson`)**: Extracts JSON from ````json ... ```` formatting.
2. **Classification Output Schema**:
   - `category`: Must match allowed tenant categories.
   - `confidence`: Must be a finite float in range $[0.0, 1.0]$.
   - `reason`: Max 300 characters.
3. **Insight Output Schema**:
   - `title`: Required string, max 200 chars.
   - `message` / `summary`: Required string, max 2000 chars.
   - `severity`: Must belong to `["info", "low", "medium", "high", "critical"]`.
   - `confidence`: Range $[0.0, 1.0]$.

Violations trigger `AIValidationError` and prevent corrupt data from reaching the storage or presentation layers.

---

## 6. AIInsight Model Architecture

The [`AIInsight`](file:///C:/Users/mmaha/Projects/Budget/SEIP/backend/src/models/aiInsight.js) model stores persistent intelligence artifacts:

- **Multi-Tenant Scoping:** `organization` (ref Organization, indexed, required).
- **User Scoping:** `user` (ref User, indexed, optional for individual recommendations).
- **Canonical Insight Types:**
  - `EXPENSE_CLASSIFICATION`
  - `SPENDING_INSIGHT`
  - `BUDGET_RECOMMENDATION`
  - `FINANCIAL_HEALTH`
  - `FORECAST`
  - `ANOMALY`
  - `GENERAL`
- **Severity Levels:** `info`, `low`, `medium`, `high`, `critical`.
- **Entity Linking:** `relatedEntity: { entityType, entityId }`.
- **Confidence Rating:** Numeric float $[0.0, 1.0]$.
- **Audit & Source Attribution:** `source: ["rules", "gemini", "openai", "system", "ai"]`.

---

## 7. Security & Tenant Isolation

1. **Authentication:** All `/api/ai/*` endpoints enforce `authenticateToken`.
2. **Tenant Boundary:** The `tenantContext` middleware partitions all insight queries:
   - Tenant A cannot view Tenant B insights under any circumstances.
   - Querying or tampering with `organizationId` in body or query params is blocked with HTTP 403.
3. **Role-Based Access Control:**
   - **Member:** Can view personal insights. Cannot view organization-level financial summaries or cross-member records.
   - **Finance Manager / Org Admin:** Can view organization-wide insights and budget recommendations.
   - **Super Admin:** Platform oversight.

---

## 8. Cost & Abuse Protection

1. **Request Rate Limiting:**
   AI endpoints are protected by `aiLimiter` (60 requests / 15 minutes).
2. **Request Size Capping:**
   Maximum prompt length is bounded at 4,000 characters. Requests exceeding this threshold immediately raise `AIRequestSizeError` (HTTP 413) without contacting external APIs.
3. **Execution Timeouts:**
   Default 10,000ms timeout wraps all provider requests, preventing hung processes via `AITimeoutError` (HTTP 504).

---

## 9. Error Handling & Operational Logging

Standardized error classes in [`aiErrors.js`](file:///C:/Users/mmaha/Projects/Budget/SEIP/backend/src/services/ai/aiErrors.js):
- `AIConfigurationError` (HTTP 503)
- `AIProviderError` (HTTP 502)
- `AIRateLimitError` (HTTP 429)
- `AITimeoutError` (HTTP 504)
- `AIValidationError` (HTTP 502)
- `AIRequestSizeError` (HTTP 413)

Operational logging in [`aiLogger.js`](file:///C:/Users/mmaha/Projects/Budget/SEIP/backend/src/services/ai/aiLogger.js):
- Automatically redacts passwords, tokens, API keys, and sensitive financial secrets.
- Records provider name, model, latency in milliseconds, and tenant context.

---

## 10. Testing Strategy

Complete test coverage in [`backend/tests/aiFoundation.test.js`](file:///C:/Users/mmaha/Projects/Budget/SEIP/backend/tests/aiFoundation.test.js):
1. **Configuration Validation:** Ensures disabled state when key is missing and protects key from leakage.
2. **Provider Swapping:** Validates dynamic injection of alternate providers.
3. **Structured Schemas:** Validates boundary conditions and JSON extraction.
4. **Timeouts & Size Limits:** Validates timeout enforcement and prompt truncation.
5. **Data Preparation:** Validates field stripping and DTO purity.
6. **Isolation & Scoping:** Verifies tenant partitioning on insight queries.
7. **Failure Non-Interference:** Proves that an AI failure cannot abort or corrupt transaction creation.

---

## 11. Roadmap to Milestone 2B & Beyond

1. **Milestone 2B: Transaction Categorization Engine:**
   Deploy structured categorization pipeline leveraging verified `AIService.classify()` with heuristic fallbacks.
2. **Milestone 2C: Financial Health Intelligence:**
   Automate multi-factor scoring and narrative explanations via background workers.
3. **Milestone 2D: Predictive Cash-Flow & Anomaly Detection:**
   Implement non-linear forecasting and outlier spend alerts.
