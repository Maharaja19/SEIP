# SEIP — AI Expense Categorization Audit

**Milestone:** Milestone 2B — AI Expense Categorization  
**Execution Date:** October 6, 2026  
**Auditor:** Antigravity AI Architecture Team  
**Codebase:** `C:\Users\mmaha\Projects\Budget\SEIP`  

---

## 1. Executive Summary

This audit assesses all existing AI and transaction services in SEIP prior to implementing Milestone 2B (AI-Powered Expense Categorization).

The objective is to establish an automated, advisory classification engine that leverages the Milestone 2A AI Foundation (`AIService`, `BaseAIProvider`, `GeminiProvider`, `MockAIProvider`, schemas, and data preparation) **without bypassing abstraction or creating duplicate Gemini integrations**.

---

## 2. Review of Existing Components

### 2.1 Transaction Model (`backend/src/models/transactions.js`)
- **Current State:** Contains an `AIClassification` sub-document with fields:
  ```javascript
  AIClassification: {
    category: { type: String },
    confidence: { type: Number },
    classifiedAt: { type: Date }
  }
  ```
- **Audit Assessment:** The sub-document is an excellent base, but needs normalization to support canonical lifecycle fields:
  - `suggestedCategory` (String)
  - `confidence` (Number, 0 to 1)
  - `reason` (String)
  - `provider` (String)
  - `model` (String)
  - `status`: `["PENDING", "SUGGESTED", "ACCEPTED", "REJECTED", "FAILED"]` (Default: `PENDING`)
  - Backward compatibility: Retain `category` mapped to `suggestedCategory`.
- **Decision:** **Normalize `Transaction.AIClassification` in place**. No new duplicate models needed.

### 2.2 Foundation Services
- **`AIService.js` (`backend/src/services/ai/AIService.js`):**
  - Exposes `classify({ description, amount, currency, allowedCategories, organizationId, userId })`.
  - Implements provider abstraction, timeout handling (10s), prompt sizing (4,000 chars), and operational logging (`aiLogger`).
  - **Decision:** **Use `AIService` as the central inference driver**.
- **`GeminiProvider.js` (`backend/src/services/ai/providers/GeminiProvider.js`):**
  - Concrete adapter for Google Generative AI.
  - Implements `_withTimeout` and standard error translation.
  - **Decision:** **Retain as default production provider**.
- **`MockAIProvider.js` (`backend/src/services/ai/providers/MockAIProvider.js`):**
  - Deterministic in-memory provider with configurable text/structured responses, latency, and error injection.
  - **Decision:** **Use exclusively in automated test suites** to prevent calling real Gemini APIs and burning quota during CI/CD.
- **`dataPreparation.js` (`backend/src/services/ai/dataPreparation/dataPreparation.js`):**
  - Contains `prepareTransactionContext(transaction)` which strips all database internal IDs, passwords, tokens, and PII.
  - **Decision:** **Enhance to include category list formatting**.
- **`aiSchemas.js` (`backend/src/services/ai/schemas/aiSchemas.js`):**
  - Contains `cleanAndParseJson` and `validateClassificationOutput`.
  - **Decision:** **Refine `validateClassificationOutput`** to strictly enforce `suggestedCategory`, confidence range $[0.0, 1.0]$, and whitelist membership.

### 2.3 Legacy Services (`backend/src/services/geminiService.js`)
- **Current State:** Contains legacy `classifyTransaction(description, amount)` with hardcoded rule-based heuristics and direct `@google/generative-ai` calls.
- **Audit Assessment:**
  - It bypasses tenant-scoped categories.
  - It bypasses `AIService` provider abstraction.
  - However, legacy routes (`receipts.js`, `assistant.js`) still import `geminiService.js`.
- **Decision:**
  - **Preserve compatibility:** Keep `geminiService.js` working so no existing legacy callers break.
  - **Refactor `classifyTransaction`** inside `geminiService.js` to route through `AIService.classify()` when active, falling back to heuristics gracefully.

---

## 3. Architecture Specification for Milestone 2B

```
┌────────────────────────────────────────────────────────┐
│   POST /api/ai/transactions/:id/classify               │
│   (Auth + Tenant Context + IDOR Check)                 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Classification Service                      │
│   1. Load authoritative Transaction                    │
│   2. Query Tenant-Authorized Categories                │
│   3. Check Idempotency (reuse recent suggestion)       │
│   4. Prepare Sanitized Transaction DTO                 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Unified AIService                    │
│   (AIService.classify() -> GeminiProvider / Mock)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Structured Schema Validation                │
│   (Whitelist validation, bounds [0, 1], reason max len)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│   Update Transaction.AIClassification (status: SUGGESTED)│
│   + Create/Update AIInsight (type: EXPENSE_CLASSIFICATION)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 User Decision Loop                     │
│   POST .../classification/accept -> Category updated    │
│   POST .../classification/reject -> Category untouched  │
│   PUT  /api/transactions/:id    -> Manual Override     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Key Security & Operational Guardrails

1. **Non-Blocking Execution:**
   Transaction creation MUST succeed even if AI classification fails or is unavailable.
2. **Deterministic Financial Core Boundary:**
   AI recommendations NEVER mutate `transaction.category`, `transaction.amount`, or wallet balances automatically. Category changes happen ONLY when user explicitly accepts or manually selects a category.
3. **Strict Whitelist Defense:**
   The LLM is provided only tenant-authorized categories. Any suggestion outside this list is immediately rejected with `AIValidationError`, preventing hallucinated categories.
4. **Tenant & IDOR Protection:**
   Users can only request classification for transactions within their own organization that they are authorized to view.
