# SEIP AI Spending Insights — Technical Architecture & Guide

## 1. Overview

The **AI Spending Insights** feature analyzes user and organizational financial data to generate grounded, explainable spending intelligence.

### The Source-of-Truth Principle
> **Gemini MUST NOT calculate financial facts from raw transactions.**  
> **All calculations (totals, category distributions, period comparisons, budget utilizations, percentage changes, and rankings) are performed by SEIP's deterministic analytics engine.**  
> **Gemini's role is strictly interpretation, narrative contextualization, pattern explanation, and proactive advisory recommendations based on verified mathematical facts.**

---

## 2. End-to-End Architecture Flow

```mermaid
flowchart TD
    User([User / Dashboard UI]) -->|1. Request Insights| EP[GET /api/ai/insights/spending]
    EP --> Auth[Authenticate Token + Tenant Context]
    Auth --> CacheCheck{Cache Valid & !force?}
    CacheCheck -->|Yes| ReturnCache[Return Cached AIInsights]
    ReturnCache --> User
    CacheCheck -->|No| Engine[Deterministic Spending Analytics Service]
    Engine --> DB[(MongoDB Transactions & Budgets)]
    DB --> Engine
    Engine --> SuffCheck{Data Sufficient?}
    SuffCheck -->|No (0 txs)| DetNotice[Return Deterministic Notice]
    DetNotice --> User
    SuffCheck -->|Yes| DataPrep[AI Data Preparation Layer]
    DataPrep -->|Sanitized Facts DTO| AIS[AIService]
    AIS --> Prov[BaseAIProvider / GeminiProvider / MockAIProvider]
    Prov -->|Structured JSON Output| Schema[aiSchemas: validateSpendingInsightsOutput]
    Schema --> GroundCheck{Factual Grounding Check}
    GroundCheck -->|Ungrounded Figures Detected| Error[AIValidationError 502]
    GroundCheck -->|Grounded| Persist[(Persist AIInsight to MongoDB)]
    Persist --> User
```

---

## 3. Deterministic Spending Analytics Engine (`spendingAnalyticsService.js`)

Located at `backend/src/services/analytics/spendingAnalyticsService.js`, this module calculates:

1. **Current Period Aggregation**:
   - Total Expenses, Total Income, Net Cash Flow (`Income - Expense`)
   - Expense transaction count and average transaction amount
2. **Category Analysis**:
   - Total spending per category
   - Share of spending (`(Category / Total Expenses) * 100`)
   - Transaction count and average per category
   - Previous period spending per category
   - Nominal difference (`Current - Previous`) and percentage change (`((Current - Previous) / Previous) * 100`)
3. **Period Comparison (Aligned Month-to-Date)**:
   - Partial-period aligned comparison: compares Current Month Day 1 → Day N with Previous Month Day 1 → Day N.
   - Prevents skewing insights when comparing a partial month against a complete month.
4. **Budget Progress & Pacing**:
   - Allocated amount, spent amount, remaining amount
   - Utilization percentage (`(Spent / Allocated) * 100`)
   - Expected calendar pace (`(Days Elapsed / Total Days in Month) * 100`)
   - Pacing status: `AHEAD_OF_PACE` if utilization exceeds expected pace by > 15%
5. **Category Rankings**:
   - Top category, Top 3 categories
   - Category with largest nominal increase
   - Category with largest nominal decrease

---

## 4. Time Period Handling

- Standard calendar periods: Month, Custom.
- When evaluating a month in progress (e.g. October 1–6), the previous month comparison is automatically bounded to the identical day range (September 1–6).
- Clear period labels are provided in the DTO: e.g. `"Month-to-date (Days 1–6)"` vs `"Previous Month Aligned (Days 1–6)"`.

---

## 5. Data Sufficiency Rules

Misleading insights and hallucinations are prevented through strict data sufficiency gates:

| Scenario | Condition | Behavior |
|---|---|---|
| **Zero Transactions** | `expenseCount === 0` | Gemini is **never invoked**. Returns a deterministic notice: *"Not enough spending data yet to generate insights."* |
| **Limited History** | `expenseCount < 3` | Trend and pattern claims are suppressed. Notice: *"Limited spending data: trend claims are suppressed until more history is recorded."* |
| **Missing Prior Month** | `prevExpenseCount === 0` | Period-over-period percentage growth claims are suppressed. Notice: *"First recorded spending period: period-over-period variance will be enabled next month."* |

---

## 6. AI Data Preparation Layer (`dataPreparation.js`)

`prepareSpendingAnalyticsContext(analytics)` transforms raw database structures into a minimal, sanitized DTO:

- **Included**: Calculated totals, category percentages, budget progress, top categories, and sufficiency flags.
- **Excluded**: MongoDB `_id`, `__v`, hashes, tokens, user profile fields, cross-tenant records, raw ledger IDs.

---

## 7. Structured Output Contract & Factual Grounding

### Output JSON Schema
```json
{
  "insights": [
    {
      "type": "SPENDING_CHANGE",
      "title": "Food spending increased",
      "summary": "Food spending increased by 18% compared with the previous period.",
      "severity": "info",
      "confidence": 0.92,
      "recommendation": "Consider reviewing food delivery purchases."
    }
  ]
}
```

### Factual Grounding Enforcement
In `backend/src/services/ai/schemas/aiSchemas.js`:
- Regex scans for currency values (`₹X`, `X INR`) and percentage values (`X%`).
- Cross-references extracted figures against the deterministic calculation facts.
- If the model introduces unsupported financial numbers (e.g. claims *"You spent ₹45,000"* when the facts say `₹5,900`), `validateSpendingInsightsOutput` rejects the insight with `AIValidationError`.

---

## 8. Insight Types & Severity Policy

### Canonical Types (`models/aiInsight.js`):
1. `SPENDING_SUMMARY`: Broad overview of cash flow and top spending.
2. `SPENDING_CHANGE`: Substantial period-over-period nominal or percentage shifts.
3. `CATEGORY_TREND`: Significant category growth, concentration, or contraction.
4. `BUDGET_PROGRESS`: Utilization warnings, pace alerts, or healthy adherence.
5. `TOP_CATEGORY`: Dominant spending drivers.
6. `SAVING_OPPORTUNITY`: Identified areas for discretionary reduction.
7. `SPENDING_RECOMMENDATION`: Actionable, targeted financial advice.

### Severity Scale:
- `info`: Normal, positive, or neutral observations.
- `notice`: Minor or noteworthy variance.
- `warning`: Budget utilization >= 85%, or category surge > 20%.
- `critical`: Budget exceeded (> 100%), or cash flow negative.

---

## 9. Caching & Idempotency

- Insights are stored in `AIInsight` with a 6-hour cache window.
- Normal dashboard requests serve cached insights (`cached: true`), preventing unnecessary Gemini invocations.
- `?force=true` or `?refresh=true` re-executes deterministic analytics and re-generates insights.

---

## 10. Authorization & Tenant Scoping (RBAC)

- **Member**: Analytics and insights are strictly scoped to `user: req.user._id` and `organization: req.organizationId`.
- **Finance Manager & Organization Admin**: Analytics and insights are scoped organization-wide (`organization: req.organizationId`).
- **Cross-Tenant IDOR**: Verified inaccessible across tenant organizations.
- **API Key Protection**: Provider info never exposes `GEMINI_API_KEY`.
