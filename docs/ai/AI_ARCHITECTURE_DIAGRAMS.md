# TREASURY AI ARCHITECTURE - VISUAL REFERENCE

**Date**: June 6, 2026  
**Purpose**: Visual representation of AI integration architecture

---

## ARCHITECTURE DIAGRAM 1: SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                 │
│                   Treasury Copilot UI Component                          │
│                    (Chat interface for users)                            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    HTTP/WebSocket
                             │
┌─────────────────────────────┴────────────────────────────────────────────┐
│                    BACKEND - EXPRESS.JS API                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    API ROUTES                                   │   │
│  │  ├─ /api/copilot/chat          (Chat endpoint)                │   │
│  │  ├─ /api/copilot/feedback      (User feedback)                │   │
│  │  ├─ /api/ai/audit-trail        (Decision logs)                │   │
│  │  └─ /api/ai/context/*          (Context APIs)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                             │                                            │
│  ┌──────────────────────────┴──────────────────────────────────────┐   │
│  │                 COPILOT SERVICE LAYER                           │   │
│  │  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐ │   │
│  │  │ CopilotService │  │ LLM Service  │  │ Tool Executor      │ │   │
│  │  │ (multi-turn)   │  │ (Gemini)     │  │ (safe execution)   │ │   │
│  │  └────────────────┘  └──────────────┘  └────────────────────┘ │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌────────────┐  ┌──────────────────────────┐ │   │
│  │  │ RAG Service  │  │ Compliance │  │ Audit Service           │ │   │
│  │  │ (search)     │  │ Service    │  │ (decision logging)      │ │   │
│  │  └──────────────┘  └────────────┘  └──────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                             │                                            │
│  ┌──────────────────────────┴──────────────────────────────────────┐   │
│  │              LANGGRAPH AGENTS (Orchestration)                   │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌─────────┐ ┌──────────────┐ │   │
│  │  │  Budget    │ │   Spending   │ │Compliance│ │  Approval  │ │   │
│  │  │ Analysis   │ │   Advisor    │ │ Agent    │ │ Assistant  │ │   │
│  │  └────────────┘ └──────────────┘ └─────────┘ └──────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                             │                                            │
│  ┌──────────────────────────┴──────────────────────────────────────┐   │
│  │                      TOOL REGISTRY                              │   │
│  │  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐ │   │
│  │  │ Budget Tools   │  │ Transaction  │  │ Insight Tools      │ │   │
│  │  │ (getBudgetSts) │  │ Tools        │  │ (getRecommended)   │ │   │
│  │  └────────────────┘  └──────────────┘  └────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                             │                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
      MongoDB            Qdrant Vector DB      Redis Cache
      (Existing          (NEW - Policies)      (NEW - Sessions)
       Models +
      NEW AI Models)
```

---

## ARCHITECTURE DIAGRAM 2: COPILOT REQUEST FLOW

```
USER MESSAGE
    │
    ├─→ Authentication Check
    │       └─→ JWT validation
    │
    ├─→ Rate Limit Check
    │       └─→ Max 100 requests/hour
    │
    ├─→ Conversation State Load
    │       └─→ From Redis cache
    │
    ├─→ Context Building
    │       ├─→ Get user profile
    │       ├─→ Get recent transactions
    │       └─→ Get active budgets
    │
    ├─→ LLM Request Preparation
    │       ├─→ Create system prompt
    │       ├─→ Include conversation history
    │       ├─→ Include user context
    │       └─→ Load available tools
    │
    ├─→ Gemini API Call
    │       ├─→ Generate response + tool calls
    │       └─→ Parse structured output
    │
    ├─→ Tool Execution
    │       ├─→ Validate tool request
    │       ├─→ Check permissions
    │       ├─→ Execute tool safely
    │       └─→ Return result
    │
    ├─→ Response Generation
    │       ├─→ Format tool results
    │       ├─→ Generate explanation
    │       └─→ Add confidence score
    │
    ├─→ Audit Logging
    │       ├─→ Log user message
    │       ├─→ Log AI response
    │       ├─→ Log tool calls
    │       └─→ Log confidence/reasoning
    │
    ├─→ User Feedback Collection
    │       └─→ Save for learning
    │
    └─→ Response to User

```

---

## ARCHITECTURE DIAGRAM 3: TOOL EXECUTION PIPELINE

```
LLM OUTPUT
    │
    ├─→ Parse Tool Call
    │       ├─→ Extract tool name
    │       ├─→ Extract parameters
    │       └─→ Validate JSON structure
    │
    ├─→ Security Checks
    │       ├─→ Tool whitelist check
    │       ├─→ Parameter validation
    │       ├─→ SQL injection prevention
    │       └─→ User permission check
    │
    ├─→ Data Access Scope
    │       ├─→ Can user access this budget?
    │       ├─→ Can user access this transaction?
    │       └─→ Enforce role-based restrictions
    │
    ├─→ Execute Tool
    │       ├─→ Call relevant API
    │       ├─→ Wrap in try-catch
    │       └─→ Set timeout (5s max)
    │
    ├─→ Validate Result
    │       ├─→ Check result schema
    │       ├─→ Mask sensitive data
    │       └─→ Sanitize output
    │
    └─→ Return to LLM

Tool Result → LLM continues reasoning → Next turn
```

---

## ARCHITECTURE DIAGRAM 4: LANGGRAPH AGENT STATE FLOW

```
                    BUDGET ANALYSIS AGENT
                    
    START
      │
      ├─→ [USER_INPUT] "What's my budget status?"
      │
      ├─→ [ANALYZE] Use getBudgetStatus tool
      │       └─→ Get current utilization, timeline
      │
      ├─→ DECISION POINT
      │       ├─→ If utilization > 80%:
      │       │   └─→ [CALL_TOOL] getExpenses
      │       │       └─→ Get breakdown by category
      │       │
      │       └─→ If issues detected:
      │           └─→ [CALL_TOOL] getInsights
      │               └─→ Get recommendations
      │
      ├─→ [SYNTHESIZE] Combine results
      │       ├─→ Summarize status
      │       ├─→ Highlight issues
      │       └─→ Suggest actions
      │
      ├─→ [RESPOND] Format for user
      │       ├─→ Clear language
      │       ├─→ Include numbers/charts
      │       └─→ Next action items
      │
      └─→ END

State representation:
{
  messages: [ /* conversation history */ ],
  context: { userId, budgetId, ... },
  toolResults: { /* tool outputs */ },
  agentState: "analyzing" | "thinking" | "responding"
}
```

---

## ARCHITECTURE DIAGRAM 5: DATA FLOW - RAG WITH POLICIES

```
POLICY DOCUMENT
    │
    ├─→ Load Document
    │       └─→ Read policy file
    │
    ├─→ Generate Embedding
    │       ├─→ Split into chunks (500 tokens)
    │       ├─→ Create embedding for each chunk
    │       └─→ Dimension: 768 (Gemini)
    │
    ├─→ Store in Qdrant
    │       ├─→ Document ID
    │       ├─→ Embedding vector
    │       └─→ Metadata (type, category, date)
    │
    └─→ Ready for Search

LATER: USER ASKS QUESTION
    │
    ├─→ "Can I spend 50% on food?"
    │
    ├─→ Generate Question Embedding
    │       ├─→ Embed same way as documents
    │       └─→ 768-dimensional vector
    │
    ├─→ Query Qdrant
    │       ├─→ Find similar vectors
    │       ├─→ Top-5 matching documents
    │       └─→ Similarity scores
    │
    ├─→ Retrieve Relevant Policies
    │       ├─→ "Budget Spending Policy - Section 3.1"
    │       ├─→ "Department Guidelines - Food Expenses"
    │       └─→ Similar past decisions
    │
    ├─→ Include in LLM Prompt
    │       ├─→ System prompt
    │       ├─→ User question
    │       ├─→ Retrieved documents
    │       └─→ "Based on policy X, here's my answer..."
    │
    └─→ LLM Generates Answer
            with policy awareness
```

---

## ARCHITECTURE DIAGRAM 6: SECURITY LAYERS

```
REQUEST
    │
    ├─→ Layer 1: NETWORK
    │       ├─→ HTTPS/TLS encryption
    │       └─→ API Gateway rate limiting
    │
    ├─→ Layer 2: AUTHENTICATION
    │       ├─→ JWT token validation
    │       ├─→ Token expiry check
    │       └─→ Signature verification
    │
    ├─→ Layer 3: AUTHORIZATION
    │       ├─→ Role check (Admin/Treasurer/Student)
    │       ├─→ Budget visibility check
    │       └─→ Tool access control
    │
    ├─→ Layer 4: INPUT SANITIZATION
    │       ├─→ SQL injection prevention
    │       ├─→ XSS prevention
    │       ├─→ Prompt injection prevention
    │       └─→ Type validation
    │
    ├─→ Layer 5: DATA ACCESS
    │       ├─→ User scoping (can only see own data)
    │       ├─→ Field-level masking (hide email in logs)
    │       └─→ Aggregation scoping (don't expose cross-user totals)
    │
    ├─→ Layer 6: TOOL EXECUTION
    │       ├─→ Tool whitelist check
    │       ├─→ Parameter validation per tool
    │       ├─→ Execution sandbox
    │       └─→ Timeout protection (5s max)
    │
    ├─→ Layer 7: AUDIT LOGGING
    │       ├─→ Log all AI actions
    │       ├─→ Store reasoning
    │       ├─→ Track decision provenance
    │       └─→ Enable compliance audit
    │
    └─→ ALLOWED
```

---

## ARCHITECTURE DIAGRAM 7: DATABASE SCHEMA - AI MODELS

```
┌──────────────────────────────────────────────────────────────┐
│                    MONGODB COLLECTIONS                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  EXISTING (from treasury-v2)           NEW (from AI module) │
│  ├─ User                               ├─ AIDecisionLog    │
│  ├─ Budget                             ├─ PolicyDocument   │
│  ├─ Transaction                        ├─ ConversationHist │
│  ├─ Wallet                             ├─ UserProfile      │
│  ├─ Student                            ├─ FeedbackData     │
│  └─ ...                                └─ ...              │
│                                                              │
│  Relationships:                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ AIDecisionLog                                           │ │
│  ├─ userId → User._id                                      │ │
│  ├─ relatedBudgets → [Budget._id]                          │ │
│  ├─ relatedTransactions → [Transaction._id]                │ │
│  └─ agentId → String (which agent made decision)           │ │
│                                                             │ │
│  ConversationHistory                                        │ │
│  ├─ userId → User._id                                      │ │
│  └─ actionsTaken → [AIDecisionLog._id]                     │ │
│                                                             │ │
│  UserProfile                                               │ │
│  └─ userId → User._id                                      │ │
│                                                             │ │
│  FeedbackData                                              │ │
│  ├─ userId → User._id                                      │ │
│  └─ decisionId → AIDecisionLog._id                         │ │
│                                                             │ │
│  PolicyDocument                                            │ │
│  └─ relatedBudgets → [Budget._id]                          │ │
│                                                             │ │
│  VectorEmbedding (for RAG)                                 │ │
│  ├─ sourceId → Document._id                                │ │
│  └─ embedding → Vector<768>                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Indexes to create:
├─ AIDecisionLog: (userId, createdAt), (agentId, status)
├─ ConversationHistory: (userId, expiresAt)
├─ UserProfile: (userId)
├─ FeedbackData: (userId, createdAt)
├─ PolicyDocument: (category, effectiveDate)
└─ VectorEmbedding: (sourceType, sourceId)
```

---

## ARCHITECTURE DIAGRAM 8: TOOL REGISTRY MAPPING

```
                    TOOL REGISTRY
                    
    ┌─────────────────────────────────────────────────────────┐
    │                   BUDGET TOOLS                          │
    ├─────────────────────────────────────────────────────────┤
    │ ✓ getBudgetStatus(budgetId)                             │
    │   → Returns: status, utilization, timeline              │
    │   → Used by: BudgetAnalysisAgent                        │
    │                                                          │
    │ ✓ getBudgetList(filters)                                │
    │   → Returns: array of budgets matching filters          │
    │   → Used by: ApprovalAssistantAgent                     │
    │                                                          │
    │ ✓ approveBudget(budgetId, reason)                       │
    │   → Returns: success, budget updated                    │
    │   → Used by: ApprovalAssistantAgent                     │
    │   → RESTRICTED: Admins only                             │
    └─────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────┐
    │                TRANSACTION TOOLS                        │
    ├─────────────────────────────────────────────────────────┤
    │ ✓ getExpenses(filters)                                  │
    │   → Returns: expenses by category, totals               │
    │   → Used by: SpendingAdvisorAgent                       │
    │                                                          │
    │ ✓ getExpenseStats(period)                               │
    │   → Returns: statistics, trends, anomalies              │
    │   → Used by: BudgetAnalysisAgent                        │
    │                                                          │
    │ ✓ flagAnomaly(transactionId, reason)                    │
    │   → Returns: anomaly flagged & logged                   │
    │   → Used by: ComplianceAgent                            │
    │   → RESTRICTED: Treasurers+ only                        │
    └─────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────┐
    │                  INSIGHT TOOLS                          │
    ├─────────────────────────────────────────────────────────┤
    │ ✓ getOptimizationTips(context)                          │
    │   → Returns: savings suggestions                        │
    │   → Used by: SpendingAdvisorAgent                       │
    │                                                          │
    │ ✓ generateRecommendations(context)                      │
    │   → Returns: prioritized recommendations                │
    │   → Used by: BudgetAnalysisAgent                        │
    │                                                          │
    │ ✓ getPredictions(context)                               │
    │   → Returns: forecast, trend analysis                   │
    │   → Used by: SpendingAdvisorAgent                       │
    └─────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────┐
    │                   RAG TOOLS                             │
    ├─────────────────────────────────────────────────────────┤
    │ ✓ searchDocuments(query)                                │
    │   → Returns: relevant policies, guidelines              │
    │   → Used by: ComplianceAgent                            │
    └─────────────────────────────────────────────────────────┘
    
    ┌─────────────────────────────────────────────────────────┐
    │                  AUDIT TOOLS                            │
    ├─────────────────────────────────────────────────────────┤
    │ ✓ logAIDecision(decision)                               │
    │   → Returns: decision logged with ID                    │
    │   → Used by: All agents (automatic)                     │
    │   → INTERNAL: Not callable by user                      │
    └─────────────────────────────────────────────────────────┘
```

---

## ARCHITECTURE DIAGRAM 9: TECHNOLOGY STACK ADDITIONS

```
FRONTEND
    ├─ React 18 (existing)
    ├─ Copilot Chat Component (NEW)
    │   ├─ Message display
    │   ├─ Input handling
    │   ├─ Streaming display
    │   └─ Feedback buttons
    └─ API client (existing + copilot endpoints)

BACKEND (Express)
    ├─ Existing layers (models, middleware, routes)
    ├─ NEW: AI Service (/src/ai-service)
    │   ├─ Agents (4 agents)
    │   ├─ Tools (10+ tools)
    │   ├─ RAG (Qdrant integration)
    │   ├─ LLM (Gemini integration)
    │   └─ Utils (context, audit, validators)
    ├─ NEW: Copilot routes/controllers
    └─ NEW: AI models in MongoDB

LLM PROVIDER
    └─ Google Gemini API
        ├─ Model: gemini-1.5-pro
        ├─ Token limit: 2M context
        └─ Cost-tracked per user

VECTOR DATABASE
    └─ Qdrant (Docker container)
        ├─ Collections: treasury_documents
        ├─ Vector size: 768 (Gemini embeddings)
        └─ Distance metric: Cosine

CACHE/SESSION
    └─ Redis (Docker container)
        ├─ Session storage
        ├─ Conversation cache
        └─ Rate limit tracking

ORCHESTRATION
    └─ LangGraph (library)
        ├─ Agent definitions
        ├─ State management
        ├─ Tool routing
        └─ Error recovery

MONITORING
    ├─ Logging (existing + AI decision logs)
    ├─ Metrics (cost, latency, errors)
    └─ Alerts (budget exceeded, failures)
```

---

## ARCHITECTURE DIAGRAM 10: DEPLOYMENT OVERVIEW

```
DEVELOPMENT
    ├─ Backend: localhost:5000
    ├─ Frontend: localhost:3000
    ├─ MongoDB: localhost:27017
    ├─ Qdrant: localhost:6333
    ├─ Redis: localhost:6379
    └─ docker-compose.yml

PRODUCTION
    ├─ Backend (Kubernetes pod)
    │   ├─ AI service container
    │   ├─ Express API container
    │   └─ Worker container (async jobs)
    │
    ├─ Databases (Kubernetes)
    │   ├─ MongoDB replica set
    │   ├─ Qdrant deployment
    │   └─ Redis cluster
    │
    ├─ LLM Provider
    │   └─ Google Gemini API (external)
    │
    └─ Monitoring
        ├─ Prometheus (metrics)
        ├─ Grafana (dashboards)
        └─ ELK (logs)
```

---

## DIAGRAM 11: API ENDPOINT HIERARCHY

```
/api/
├─ /auth/                          (existing)
├─ /budgets/                       (existing)
├─ /transactions/                  (existing)
├─ /wallet/                        (existing)
│
├─ /analytics/                     (to create - non-AI)
│   ├─ /expenses/breakdown
│   ├─ /budgets/utilization
│   └─ /comparison/:userId
│
├─ /prediction/                    (to create - non-AI)
│   ├─ /budget-exceeding
│   ├─ /spending-forecast
│   └─ /anomalies
│
├─ /insights/                      (to create - non-AI)
│   ├─ /cost-saving
│   ├─ /recommendations
│   └─ /alerts
│
└─ /copilot/                       (to create - AI)
    ├─ /chat                       POST - Send user message
    ├─ /conversation/:id           GET - Get conversation history
    ├─ /feedback                   POST - Submit feedback
    └─ /suggestions                GET - Get quick suggestions

└─ /ai/                            (to create - AI internal)
    ├─ /context/:type/:id         GET - Get context for agent
    ├─ /search                     POST - Full-text & semantic search
    ├─ /simulate                   POST - Scenario simulation
    ├─ /audit-trail/:agentId      GET - Audit logs
    └─ /feedback                   POST - Log feedback
```

---

**End of Visual Architecture Document**
