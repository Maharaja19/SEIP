# SEIP — AI Foundation Architecture Audit

**Milestone:** Milestone 2A — AI Foundation Architecture  
**Execution Date:** October 6, 2026  
**Auditor:** Antigravity AI Architecture Team  
**Codebase:** `C:\Users\mmaha\Projects\Budget\SEIP`  

---

## 1. Executive Summary

This audit assesses the state of AI-related code, heuristics, models, and endpoints in the Smart Expense Intelligence Platform (SEIP) prior to constructing the Milestone 2A AI Foundation Layer.

The objective is to establish a provider-agnostic, secure, multi-tenant AI architecture that strictly obeys the **AI Architecture Principle**:
> **Financial data remains controlled by the deterministic SEIP financial core.**  
> AI is an intelligence layer *above* the financial core.  
> AI MUST NEVER directly modify wallet balances, ledgers, transaction records, or budgets.

---

## 2. Inventory of Existing AI Artifacts

### 2.1 Models

| File | Entity | Purpose | Current State | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `backend/src/models/aiInsight.js` | `AIInsight` | Stores system/AI generated insights, alerts, and forecasts | Exists. Has `organization`, `type`, `severity`, `title`, `message`, `forecastData`. Missing `user`, `confidence`, `source`, `relatedEntity`, `expiresAt`. | **Normalize & Enhance**: Add missing fields, expand enum for canonical types (`EXPENSE_CLASSIFICATION`, `SPENDING_INSIGHT`, `FINANCIAL_HEALTH`, `BUDGET_RECOMMENDATION`, `ANOMALY`, `FORECAST`, `GENERAL`). Preserve backward compatibility. |
| `backend/src/models/transactions.js` | `Transaction.AIClassification` | Sub-document storing AI categorization results | Contains `category`, `confidence`, `classifiedAt`. Clean. | **Retain**: Perfect extension point for structured categorization outputs. |
| `backend/src/models/financialHealth.js` | `FinancialHealth` | Snapshot of calculated health score (0-100) and factors | Fully defined with `score`, `factors`, `insights`, `recommendations`, `explanation`. | **Retain**: Houses deterministic score records. |

### 2.2 Services

| File | Purpose | Current State | Deficiencies / Findings | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `backend/src/services/geminiService.js` | Gemini API client & AI utilities | Bundles SDK initialization, transaction categorization, health explanation, forecast text, and receipt OCR. | 1. Tight coupling to `@google/generative-ai` SDK.<br>2. Direct module-load dependency on `GEMINI_API_KEY`.<br>3. No abstraction layer for other providers (OpenAI, local models).<br>4. Lacks input DTO/data sanitization.<br>5. Lacks output schema validation. | **Refactor into Provider Pattern**: Extract Gemini-specific logic into `GeminiProvider.js`, fronted by an abstract `AIService.js`. |
| `backend/src/services/insightService.js` | Deterministic insight calculations | Computes budget risk, monthly comparison, and weekly patterns. | Purely deterministic aggregation via MongoDB. | **Retain**: Acts as the deterministic base that feeds verified data to the AI data preparation layer. |
| `backend/src/services/predictionService.js` | Expense projection | Computes 3-month rolling average for expenses. | Purely deterministic projection. | **Retain**: Clean baseline for future forecasting. |

### 2.3 Routes & Controllers

| Route | File | Current Purpose | Status |
| :--- | :--- | :--- | :--- |
| `/api/assistant/chat` | `backend/src/routes/assistant.js` | Chat endpoint combining DB transactions with Gemini/heuristics | Prototype stage. Directly exposes raw prompt assembly. Needs refactoring in Milestone 2B/2C. |
| `/api/receipts/scan` | `backend/src/routes/receipts.js` | Receipt OCR image upload | Uses Gemini inline base64 image inspection. |
| `/api/prediction` | `backend/src/routes/prediction.js` | Returns rolling average predictions | Functional deterministic endpoint. |
| `/api/insights` | `backend/src/routes/insights.js` | Returns deterministic category and risk insights | Functional deterministic endpoint. |

### 2.4 Frontend Artifacts

| Component | File | State | Security Verification |
| :--- | :--- | :--- | :--- |
| `Dashboard.jsx` | `frontend/src/components/Dashboard.jsx` | Chat assistant UI and OCR upload button | **Clean**: Never touches or references `GEMINI_API_KEY`. Calls `/api/assistant/chat` and `/api/receipts/scan` through authenticated backend client. |

---

## 3. Key Architectural Gaps Identified

1. **Absence of Provider Abstraction:**
   Application modules directly import and invoke `geminiService`. If Google alters the GenAI SDK (as noted in deprecation notices for `@google/generative-ai` in favor of `@google/genai`) or if an organization configures an alternative LLM provider (OpenAI, Anthropic, Ollama), code changes are required across service layers.
2. **Missing Input Data Preparation / Sanitization Layer:**
   Current implementations pass raw database records (or unfiltered string representations) into model prompts. No formal Data Transfer Object (DTO) exists to strip internal IDs, sensitive fields, or irrelevant properties.
3. **Missing Output Schema Validation:**
   AI responses (such as JSON from OCR or categorization) are parsed using loose `JSON.parse` with basic null checks. No formal schema validation library or validator validates data types, bounds, confidence ranges, or unexpected keys.
4. **Missing AI Error Hierarchy & Operational Logging:**
   Errors are caught with generic `catch (err)` without distinguishing network timeouts, rate limit / quota exhaustion, authentication invalidity, or malformed responses.
5. **Missing AI Health & Status API:**
   No endpoint exists for administrators or health monitors to inspect provider availability, active model configuration, or operational status without initiating an expensive model inference.

---

## 4. Proposed Architecture (Milestone 2A Foundation)

```
                 Application / Routes
                         ↓
                     AIService (Contract)
                         ↓
               AI Provider Abstraction
          ┌──────────────┴──────────────┐
     GeminiProvider              (Future Mock / OpenAI)
          ↓                             ↓
    Google GenAI API              External Provider
```

### Components to Build in Milestone 2A:
1. **`backend/src/services/ai/aiErrors.js`**: Standardized AI error classes (`AIConfigurationError`, `AIProviderError`, `AIRateLimitError`, `AITimeoutError`, `AIValidationError`).
2. **`backend/src/services/ai/aiLogger.js`**: Sanitized operational logger for AI requests and latencies (strictly excluding API keys, passwords, and sensitive financial payloads).
3. **`backend/src/services/ai/schemas/`**: Strict schema validators for structured outputs (e.g. classification, insights, recommendations).
4. **`backend/src/services/ai/dataPreparation/`**: Sanitized DTO converters (`AITransactionContext`, `AIBudgetContext`) that sanitize financial entities before AI consumption.
5. **`backend/src/services/ai/providers/BaseAIProvider.js`**: Abstract base class defining the provider interface (`generateText`, `generateStructured`, `isAvailable`, `getProviderInfo`).
6. **`backend/src/services/ai/providers/GeminiProvider.js`**: Implementation of `BaseAIProvider` for Google Gemini models with timeout, error translation, and key protection.
7. **`backend/src/services/ai/AIService.js`**: Unified facade handling provider management, data validation, rate limit protection, and fallback execution.
8. **Normalized `AIInsight` Model**: Enriched with `user`, `confidence`, `source`, `relatedEntity`, and canonical types.
9. **Protected Health/Status Endpoint**: `GET /api/ai/status` (read-only diagnostic endpoint accessible to authenticated users).

---

## 5. Non-Negotiable Boundaries Maintained
- **Financial Core Untouched:** No modifications to balances, ledgers, transactions, or budgets.
- **No Mock/Fake AI Features:** We will NOT produce fake insights or simulate complete autonomous agents.
- **Baseline Integrity:** All 119 existing backend tests and frontend production build will remain 100% green.
