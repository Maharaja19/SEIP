# TREASURY AI INTEGRATION - DETAILED IMPLEMENTATION GUIDE

**Last Updated**: June 6, 2026  
**Status**: Ready for Phase 1 Implementation

---

## SECTION 1: REUSABLE EXISTING APIs MAPPING

### Budget Module → AI Tools Mapping

| Existing API | Tool Name | LLM Can Use For | Confidence |
|---|---|---|---|
| Budget.findById() | getBudgetStatus | Check current utilization | ✅ High |
| Budget.find({status}) | getBudgetList | Find pending budgets | ✅ High |
| Budget.virtual("utilizationPercentage") | calculateBudgetUtilization | Analyze spending | ✅ High |
| User.findById() → permissions | checkAuthorization | Verify user can approve | ✅ High |

### Transaction Module → AI Tools Mapping

| Existing API | Tool Name | LLM Can Use For | Confidence |
|---|---|---|---|
| Transaction.find({user}) | getExpenses | Analyze user spending | ✅ High |
| Transaction.aggregate() | getExpenseStats | Calculate category totals | ✅ High |
| Transaction.index({category}) | categorizeExpense | Suggest category for transaction | ✅ Medium |
| Transaction.virtual("categoryDescription") | explainCategory | Explain what category means | ✅ High |

### Wallet Module → AI Tools Mapping

| Existing API | Tool Name | LLM Can Use For | Confidence |
|---|---|---|---|
| Wallet.findOne({student}) | getWalletBalance | Check student balance | ✅ High |
| WalletLedger.find() | getWalletHistory | Track balance changes | ✅ High |
| Wallet.updateOne() | updateBalance | Execute wallet transaction | ⚠️ Medium |

### User Module → AI Tools Mapping

| Existing API | Tool Name | LLM Can Use For | Confidence |
|---|---|---|---|
| User.findById() | getUserProfile | Get user role, department | ✅ High |
| User.methods.isLocked() | checkAccountStatus | Verify user is active | ✅ High |
| User.findOne({role}) | getUsersByRole | Find all treasurers/admins | ✅ High |

---

## SECTION 2: API ENDPOINT STRUCTURE FOR AI

### Analytics API Endpoints (TO CREATE)

```javascript
// Get expense breakdown by category
GET /api/analytics/expenses/breakdown
Query Parameters:
  - startDate: ISO string
  - endDate: ISO string
  - userId: ObjectId (optional - default to current user)
  - department: String (optional)
  
Response:
{
  success: true,
  data: {
    total: 50000,
    byCategory: {
      "food": { amount: 15000, percentage: 30 },
      "transport": { amount: 10000, percentage: 20 },
      ...
    },
    trend: "increasing" | "decreasing" | "stable"
  }
}
```

```javascript
// Get budget utilization analysis
GET /api/analytics/budgets/utilization
Query Parameters:
  - status: "pending" | "approved" | "rejected" (optional)
  - userId: ObjectId (optional)
  
Response:
{
  success: true,
  data: {
    totalBudgets: 10,
    byStatus: {
      "approved": { count: 7, avgUtilization: 65 },
      "pending": { count: 2, avgUtilization: 40 }
    }
  }
}
```

```javascript
// Get user spending comparison
GET /api/analytics/comparison/:userId
Query Parameters:
  - period: "month" | "quarter" | "year"
  
Response:
{
  success: true,
  data: {
    userSpending: 45000,
    departmentAverage: 50000,
    topCategory: "food",
    percentile: 40  // User spends less than 40% of peers
  }
}
```

### Prediction API Endpoints (TO CREATE)

```javascript
// Predict if budget will exceed
POST /api/prediction/budget-exceeding
Body:
{
  budgetId: ObjectId,
  projectionDays: 30  // optional
}

Response:
{
  success: true,
  data: {
    willExceed: true,
    exceedanceRisk: 0.87,  // 87% probability
    projectedOverrun: 5000,
    daysUntilExceeded: 12,
    recommendation: "Consider reducing discretionary spending"
  }
}
```

```javascript
// Forecast future spending
POST /api/prediction/spending-forecast
Body:
{
  userId: ObjectId,
  forecastDays: 30,
  baselineMonths: 3  // Use last 3 months as baseline
}

Response:
{
  success: true,
  data: {
    forecastedAmount: 48000,
    confidenceInterval: { low: 42000, high: 54000 },
    trend: "stable",
    seasonalFactor: 1.05  // Expected 5% increase
  }
}
```

```javascript
// Detect spending anomalies
POST /api/prediction/anomalies
Body:
{
  userId: ObjectId,
  period: "week" | "month" | "quarter"
}

Response:
{
  success: true,
  data: {
    anomalies: [
      {
        transactionId: ObjectId,
        amount: 15000,
        category: "books",
        severity: "high",  // vs historical average
        reason: "2.5x normal spending in this category"
      }
    ]
  }
}
```

### Insights API Endpoints (TO CREATE)

```javascript
// Get cost optimization suggestions
GET /api/insights/cost-saving
Query Parameters:
  - userId: ObjectId
  - focus: "top-spender" | "highest-risk" | "quick-wins"
  
Response:
{
  success: true,
  data: {
    suggestions: [
      {
        id: "sug_001",
        category: "food",
        currentSpending: 15000,
        potentialSavings: 3000,
        savingsPercentage: 20,
        difficulty: "easy",
        example: "Reduce dining out frequency by 1 per week",
        impact: "moderate"
      }
    ],
    totalPotentialSavings: 8000
  }
}
```

```javascript
// Get spending recommendations
GET /api/insights/recommendations
Query Parameters:
  - userId: ObjectId
  - context: "budget-planning" | "overspending" | "optimization"
  
Response:
{
  success: true,
  data: {
    recommendations: [
      {
        id: "rec_001",
        title: "Create event fund",
        description: "...",
        priority: "high",
        estimatedImpact: "Prevent budget overruns"
      }
    ]
  }
}
```

---

## SECTION 3: LangGraph Agent Specifications

### Agent 1: BudgetAnalysisAgent

```javascript
// Purpose: Analyze budget status and performance
// Tools: getBudgetStatus, getExpenses, getInsights
// Triggers: 
//   - User asks "What's my budget status?"
//   - Routine daily check
//   - Admin review request

PROMPTS:
  system: "You are a budget analyst assistant..."
  
TOOLS:
  1. getBudgetStatus(budgetId)
     - Returns: utilization %, spending, time remaining
  
  2. getExpenses(budgetId, period)
     - Returns: expense breakdown by category
  
  3. getInsights(budgetId)
     - Returns: anomalies, trends, recommendations

FLOW:
  Input: Budget query
  ↓
  Call getBudgetStatus
  ↓
  If status is concerning, call getExpenses
  ↓
  Call getInsights
  ↓
  Generate response with analysis + recommendations
```

### Agent 2: SpendingAdvisorAgent

```javascript
// Purpose: Give spending advice and forecasts
// Tools: getExpenses, getPredictions, getRecommendations
// Triggers:
//   - User asks "Am I spending too much?"
//   - Spending exceeds threshold
//   - Monthly review

PROMPTS:
  system: "You are a spending advisor..."
  
TOOLS:
  1. getExpenses(userId, period)
     - Returns: spending by category, trends
  
  2. getPredictions(userId, context)
     - Returns: forecast, risk assessment, anomalies
  
  3. getRecommendations(userId, context)
     - Returns: cost-saving suggestions, optimization tips

FLOW:
  Input: Spending question
  ↓
  Call getExpenses for current data
  ↓
  Call getPredictions for future outlook
  ↓
  Analyze vs user's historical patterns
  ↓
  Call getRecommendations if issues detected
  ↓
  Generate personalized advice
```

### Agent 3: ComplianceAgent

```javascript
// Purpose: Check policy compliance, flag violations
// Tools: searchDocuments, getInsights, flagAnomaly
// Triggers:
//   - Budget created (check against policies)
//   - Large expense detected
//   - Admin manual check

PROMPTS:
  system: "You are a compliance officer..."
  
TOOLS:
  1. searchDocuments(query)
     - RAG search over policies
     - Returns: relevant policy sections
  
  2. getInsights(context)
     - Returns: patterns, risks, anomalies
  
  3. flagAnomaly(transactionId, reason)
     - Logs compliance concern
     - Returns: confirmation + next steps

FLOW:
  Input: Budget/transaction for compliance check
  ↓
  Get applicable policies via searchDocuments
  ↓
  Analyze transaction against policies
  ↓
  If violation detected, call flagAnomaly
  ↓
  Generate compliance report with recommendations
```

### Agent 4: ApprovalAssistantAgent

```javascript
// Purpose: Assist with budget approvals
// Tools: getBudgetStatus, getExpenses, approveTransaction
// Triggers:
//   - New budget submitted for approval
//   - Approval deadline approaching
//   - Manual approval review

PROMPTS:
  system: "You are an approval assistant..."
  
TOOLS:
  1. getBudgetStatus(budgetId)
     - Returns: budget details, history
  
  2. getExpenses(budgetId, period)
     - Returns: expense breakdown
     - Compare vs similar past budgets
  
  3. approveTransaction(id, reason)
     - Executes approval
     - Logs decision reasoning

FLOW:
  Input: Budget review request
  ↓
  Call getBudgetStatus
  ↓
  Call getExpenses to analyze proposed expenses
  ↓
  Compare vs historical similar budgets
  ↓
  Check compliance (if critical)
  ↓
  Generate approval recommendation
  ↓
  If user confirms, call approveTransaction
```

---

## SECTION 4: TOOL IMPLEMENTATION SPECIFICATIONS

### Tool: getBudgetStatus

```javascript
// Purpose: Get current budget status
// Used by: BudgetAnalysisAgent, ApprovalAssistantAgent

SIGNATURE:
async getBudgetStatus(budgetId: ObjectId): Promise<BudgetStatus>

IMPLEMENTATION:
1. Validate budgetId
2. Query Budget collection
3. Calculate utilization % = (spent / total_budget) * 100
4. Calculate days remaining
5. Determine status: "on-track" | "at-risk" | "exceeded"
6. Include recent expenses
7. Include approval status

RETURNS:
{
  budgetId: ObjectId,
  title: String,
  totalBudget: Number,
  spent: Number,
  utilization: Number,        // percentage
  remaining: Number,
  daysRemaining: Number,
  status: "on-track" | "at-risk" | "exceeded",
  lastUpdated: Date,
  recentExpenses: [{            // Last 5 expenses
    amount: Number,
    category: String,
    date: Date
  }],
  approvalStatus: "pending" | "approved" | "rejected"
}

ERRORS:
- 404: Budget not found
- 403: User doesn't have access
- 500: Database error
```

### Tool: getExpenses

```javascript
// Purpose: Get expense breakdown
// Used by: SpendingAdvisorAgent, BudgetAnalysisAgent

SIGNATURE:
async getExpenses(filters: {
  userId?: ObjectId,
  budgetId?: ObjectId,
  startDate?: Date,
  endDate?: Date,
  category?: String,
  limit?: Number
}): Promise<ExpenseData>

IMPLEMENTATION:
1. Validate user access (can only see own expenses)
2. Build MongoDB query from filters
3. Sort by date descending
4. Group by category
5. Calculate totals, averages, trends
6. Include percentage breakdown
7. Mark anomalies (if 2x average)

RETURNS:
{
  total: Number,
  count: Number,
  byCategory: {
    [category]: {
      total: Number,
      count: Number,
      percentage: Number,
      avgPerTransaction: Number,
      trend: "up" | "down" | "stable"
    }
  },
  trend: "increasing" | "decreasing" | "stable",
  recentTransactions: [{
    id: ObjectId,
    amount: Number,
    category: String,
    date: Date,
    description: String
  }]
}

ERRORS:
- 400: Invalid date range
- 403: Cannot view other users' expenses
- 500: Database error
```

### Tool: getPredictions

```javascript
// Purpose: Get spending predictions
// Used by: SpendingAdvisorAgent

SIGNATURE:
async getPredictions(context: {
  userId: ObjectId,
  budgetId?: ObjectId,
  forecastDays?: Number
}): Promise<Prediction>

IMPLEMENTATION:
1. Get user's spending history (last 90 days)
2. Apply statistical model:
   - Linear trend analysis
   - Moving average (smooth noise)
   - Seasonality detection
3. Generate forecast for forecastDays
4. Calculate confidence intervals
5. Identify anomaly threshold
6. Compare vs budget remaining (if budgetId provided)

RETURNS:
{
  forecast: {
    projectedAmount: Number,
    confidenceInterval: { low: Number, high: Number },
    daysUntilExceeding: Number | null
  },
  trend: {
    direction: "up" | "down" | "stable",
    percentageChange: Number
  },
  anomalyThreshold: Number,  // Amount that would be unusual
  seasonalFactor: Number      // Expected seasonal variation
}

ERRORS:
- 400: Insufficient history for prediction
- 403: User cannot access budget
- 500: Calculation error
```

### Tool: getInsights

```javascript
// Purpose: Generate insights for budget/spending
// Used by: BudgetAnalysisAgent, ComplianceAgent

SIGNATURE:
async getInsights(context: {
  userId?: ObjectId,
  budgetId?: ObjectId,
  type: "anomalies" | "patterns" | "recommendations"
}): Promise<Insights>

IMPLEMENTATION:
1. Analyze spending data:
   - Anomaly detection (3-sigma rule)
   - Pattern recognition (frequency analysis)
   - Category analysis (where is money going)
2. Compare vs historical patterns
3. Generate recommendations
4. Score recommendations by impact
5. Prioritize by urgency

RETURNS:
{
  anomalies: [{
    description: String,
    severity: "low" | "medium" | "high",
    impact: Number
  }],
  patterns: [{
    category: String,
    pattern: String,  // "increasing", "seasonal", etc
    recommendation: String
  }],
  recommendations: [{
    id: String,
    title: String,
    description: String,
    potentialSavings: Number,
    difficulty: "easy" | "medium" | "hard",
    priority: "low" | "medium" | "high"
  }]
}

ERRORS:
- 400: Invalid context
- 403: Insufficient permissions
- 500: Analysis error
```

---

## SECTION 5: RAG (RETRIEVAL AUGMENTED GENERATION) SETUP

### Document Types to Index

#### 1. Policy Documents
```javascript
// Example policy document structure
{
  title: "Budget Spending Policy",
  category: "spending",
  content: `
    Maximum spending limits:
    - Food: 30% of budget
    - Transport: 20% of budget
    - ...
  `,
  appliesTo: ["Treasurer", "Student"],
  effectiveDate: "2026-01-01",
  keyPoints: [
    "Maximum 30% allocation to food",
    "Requires approval for items > 10000",
    ...
  ]
}
```

#### 2. Budget Templates
```javascript
// Example budget template
{
  name: "Class Event Budget",
  content: `
    Typical breakdown:
    - Venue: 40%
    - Food: 35%
    - Decorations: 15%
    - Contingency: 10%
  `,
  historicalData: {
    avgTotal: 50000,
    successful: 0.92,
    commonIssues: ["Food overspending"]
  }
}
```

#### 3. Guidelines & Best Practices
```javascript
// Example guidelines
{
  title: "Budget Planning Best Practices",
  content: `
    1. Build in 10% contingency
    2. Finalize 2 weeks before event
    3. Update expenses daily
    ...
  `
}
```

### Qdrant Collection Schema

```javascript
{
  name: "treasury_documents",
  vectors: {
    size: 768,              // Gemini embedding dimension
    distance: "Cosine"      // Similarity metric
  },
  payload_schema: {
    sourceType: "keyword",  // "policy", "template", "guideline"
    sourceId: "uuid",
    department: "keyword",
    category: "keyword",
    importance: "integer",  // 1-5
    createdAt: "datetime"
  }
}
```

### RAG Query Flow

```
User Question
↓
Generate embedding of question
↓
Query Qdrant with embedding similarity
↓
Retrieve top 5 most relevant documents
↓
Include context in LLM prompt
↓
LLM generates answer informed by policies/templates
↓
Return answer with source citations
```

---

## SECTION 6: SECURITY IMPLEMENTATION CHECKLIST

### Before Deploying to Production

#### Authentication & Authorization
- [ ] Implement service-to-service authentication for Gemini API calls
- [ ] Add rate limiting per user (max 100 AI requests/hour)
- [ ] Implement API key rotation for Gemini
- [ ] Add request signing for Gemini calls
- [ ] Validate JWT tokens before AI calls

#### Data Access
- [ ] Scope all queries by userId (AI can't see others' data)
- [ ] Add role-based tool access (only treasurers can approve)
- [ ] Mask PII in audit logs (hide email, phone)
- [ ] Implement budget visibility rules
- [ ] Validate ownership before returning data

#### Tool Execution
- [ ] Create tool whitelist (only approved tools callable)
- [ ] Implement execution sandbox
- [ ] Add input validation per tool
- [ ] Add output sanitization
- [ ] Implement rollback for failed executions

#### Prompt Injection Prevention
- [ ] Sanitize all user input before LLM
- [ ] Validate prompt structure
- [ ] Add jailbreak detection
- [ ] Validate LLM output
- [ ] Add SQL/HTML injection prevention

#### Model Security
- [ ] Store Gemini API key in .env (never in code)
- [ ] Implement cost quotas per user
- [ ] Set up Gemini API monitoring
- [ ] Configure fallback models
- [ ] Add request timeouts

#### Data Privacy
- [ ] Implement 30-day conversation cleanup
- [ ] Add PII redaction
- [ ] Create GDPR compliance logging
- [ ] Implement right-to-be-forgotten
- [ ] Add data retention policies

#### Audit & Monitoring
- [ ] Log all AI decisions to database
- [ ] Track decision reasoning & confidence
- [ ] Monitor for anomalies in AI behavior
- [ ] Set up alerts for failures
- [ ] Create cost monitoring dashboard

---

## SECTION 7: QUICK START FOR PHASE 1

### Step 1: Docker Setup
```bash
# Update docker-compose.yml with Qdrant & Redis sections (see above)
docker-compose up -d

# Verify services
curl http://localhost:6333/health      # Qdrant
curl http://localhost:6379/ping        # Redis
```

### Step 2: Environment Setup
```bash
# Update backend/.env
GEMINI_API_KEY=your_actual_key_here
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379
```

### Step 3: Install Dependencies
```bash
cd backend
npm install @langchain/langgraph @langchain/google-genai @qdrant/js-client-rest
npm install --save-dev @types/node
```

### Step 4: Create Base LLM Service
```bash
# Create files
touch src/ai-service/llm/geminiClient.js
touch src/ai-service/llm/promptManager.js
touch src/services/llmService.js

# Create basic implementations (templates provided in section 4)
```

### Step 5: Create AI Models
```bash
# Create database models
touch src/models/aiDecisionLog.js
touch src/models/conversationHistory.js
touch src/models/userProfile.js

# Create models (templates provided in Part 3 of main report)
```

### Step 6: Test
```bash
npm test          # Run test suite
npm run dev       # Start development server
# Test basic Gemini connectivity
```

---

## SECTION 8: TESTING STRATEGY

### Unit Tests
- **Coverage**: Service & Repository layers (70%+ target)
- **Focus**: 
  - Tool input validation
  - Response parsing
  - Error handling
  - Edge cases

### Integration Tests
- **Coverage**: Controller + Service + Repository
- **Focus**:
  - Agent tool calling
  - Database operations
  - RAG retrieval
  - Error recovery

### E2E Tests
- **Coverage**: Full copilot workflows
- **Focus**:
  - Multi-turn conversations
  - Agent routing
  - Tool execution
  - User feedback

### Performance Tests
- **Latency**: <500ms for tool calls
- **Throughput**: 100+ concurrent users
- **Database**: Query optimization
- **LLM**: Cost & rate limiting

---

**End of Detailed Implementation Guide**
