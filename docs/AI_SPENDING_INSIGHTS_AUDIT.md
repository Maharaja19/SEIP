# AI Spending Insights Architecture Audit

**Milestone:** 2C — AI Spending Insights  
**Project Path:** `C:\Users\mmaha\Projects\Budget\SEIP`  
**Date:** October 6, 2026  

---

## 1. Executive Summary

This audit assesses all existing analytics, insight, prediction, and AI services across SEIP to design a deterministic, grounded AI spending insights architecture.

### Core Architecture Axiom:
> **Gemini MUST NOT calculate financial totals, averages, percentages, differences, or budget utilizations from raw transactions.**  
> **All financial facts must be calculated by a deterministic financial analytics engine.**  
> **Gemini's role is strictly interpretation, narrative contextualization, pattern explanation, and proactive recommendations based on verified mathematical facts.**

---

## 2. Inventory of Existing Analytics & AI Components

| Service / Model | File Path | Current Status | Assessment & Migration Strategy |
|---|---|---|---|
| `insightService.js` | `backend/src/services/insightService.js` | Legacy Active | Contains deterministic calculations (month comparisons, top 3 categories, weekly spending pattern, budget risk). Uses rule-based templates. **Reuse mathematical calculation logic** into a centralized `spendingAnalyticsService.js`. |
| `comprehensiveAnalyticsService.js` | `backend/src/services/comprehensiveAnalyticsService.js` | Active | Aggregates 6-month trends, category breakdowns, and basic financial totals. Used by dashboard analytics endpoint. |
| `predictionService.js` | `backend/src/services/predictionService.js` | Legacy Active | Calculates 3-month moving average for simple expense projection. Do not touch or duplicate. |
| `assistant.js` | `backend/src/routes/assistant.js` | Inactive / Legacy | Legacy chat endpoint with direct raw transaction prompting and heuristic fallback. Out of scope for Milestone 2C (AI Assistant is Milestone 2F). |
| `geminiService.js` | `backend/src/services/geminiService.js` | Legacy Bridge | Bypassed in Milestone 2A/2B in favor of `AIService` and `GeminiProvider`. Do not use. |
| `AIInsight` Model | `backend/src/models/aiInsight.js` | Canonical Active | Unified storage for insights with tenant isolation, TTL, severity, metadata, and related entities. **Extend `INSIGHT_TYPES`** to support specific spending insight types. |
| `financialHealth.js` | `backend/src/models/financialHealth.js` | Deferred | Financial health scoring model. Out of scope for Milestone 2C (Financial Health is Milestone 2D). |
| `AIService.js` | `backend/src/services/ai/AIService.js` | Canonical Active | Foundation service for AI execution. Exposes `generateStructured()` with provider swapping (`MockAIProvider` / `GeminiProvider`). |
| `dataPreparation.js` | `backend/src/services/ai/dataPreparation/dataPreparation.js` | Canonical Active | Strips sensitive fields, prepares clean DTOs. **Add `prepareSpendingAnalyticsContext()`** to sanitize deterministic metrics for AI ingestion. |
| `aiSchemas.js` | `backend/src/services/ai/schemas/aiSchemas.js` | Canonical Active | Validates structured LLM outputs. **Add `validateSpendingInsightsOutput()`** with factual grounding checks. |

---

## 3. Deterministic Analytics Engine Design (`spendingAnalyticsService.js`)

To guarantee financial truthfulness, `spendingAnalyticsService.js` will compute:

1. **Current Period Aggregation**:
   - Total Income, Total Expenses, Net Cash Flow
   - Transaction count, average expense amount
2. **Category Analysis**:
   - Total spending per category
   - Share of wallet (% of total expense)
   - Transaction count per category
   - Previous period spending per category
   - Absolute change (₹) and relative change (%) per category
3. **Period Comparison (Partial-Period Aware)**:
   - Compares Current Period (e.g. Month-to-date Oct 1 → Oct 6) with Equivalent Previous Period (Sep 1 → Sep 6) to avoid partial-month skew.
   - Calculates absolute and percentage month-over-month variances.
4. **Budget Utilization**:
   - Tracks active budgets, allocated amounts, actual spend, remaining funds, and percentage utilization.
   - Computes deterministic severity based on thresholds (`< 70%`: Safe/Info, `70–90%`: Warning, `> 90%` or exceeded: Critical).
5. **Rankings & Extremes**:
   - Top spending category
   - Top 3 categories
   - Category with largest nominal increase
   - Category with largest nominal decrease
6. **Data Sufficiency Rules**:
   - Zero transactions: returns `insufficientData: true`, `reason: "NO_TRANSACTIONS"`
   - < 3 transactions: suppresses trend claims (`insufficientHistory: true`)
   - No previous period data: suppresses percentage growth claims (`noPreviousPeriod: true`)

---

## 4. Grounding & Factual Validation Strategy

```text
Deterministic Analytics Engine
      ↓  (Calculated Facts: Food=₹5,900, Prev=₹5,000, +18%, Utilization=84%)
AI Data Preparation (Sanitized Facts DTO)
      ↓
AIService (Structured LLM Prompt)
      ↓
Raw Model Output
      ↓
Factual Grounding Validator (aiSchemas.js)
  - Checks: Are all quoted numerical figures present in the calculated facts?
  - Rejects or strips hallucinated numbers.
      ↓
Validated AIInsight Persistence
```

---

## 5. Summary of Action Items

1. **Extend `AIInsight` Model**: Add `SPENDING_SUMMARY`, `CATEGORY_TREND`, `SPENDING_CHANGE`, `BUDGET_PROGRESS`, `TOP_CATEGORY`, `SAVING_OPPORTUNITY`, `SPENDING_RECOMMENDATION` to `INSIGHT_TYPES`.
2. **Build `spendingAnalyticsService.js`**: Purely deterministic calculations with partial-period alignment and tenant scoping.
3. **Enhance `dataPreparation.js`**: Create `prepareSpendingAnalyticsContext()` returning structured, sanitized metrics DTO.
4. **Build Schema & Factual Grounding in `aiSchemas.js`**: Validate structured insight lists and ground numeric citations.
5. **Add Endpoint in `ai.js`**: `GET /api/ai/insights/spending` with caching, tenant isolation, and RBAC scoping.
6. **Frontend Component**: Build `SpendingInsightsSection.jsx` and integrate into Dashboard.
7. **Comprehensive Tests**: Build `tests/aiSpendingInsights.test.js` using `MockAIProvider`.
