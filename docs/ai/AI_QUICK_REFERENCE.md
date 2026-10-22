# TREASURY AI - QUICK REFERENCE CHECKLIST

**Version**: 1.0  
**Last Updated**: June 6, 2026

---

## 📋 REUSABLE EXISTING APIS

### Budget Tools ✓
- [ ] getBudgetStatus(budgetId) - Get status, utilization, timeline
- [ ] getBudgetList(filters) - List budgets by status/proposer
- [ ] checkBudgetApprovals() - Find pending approvals
- [ ] User.findById() → permissions check

### Transaction Tools ✓
- [ ] getExpenses(filters) - Get expenses by category/date
- [ ] getExpenseStats() - Calculate totals by category
- [ ] Transaction.find({category}) - Filter by type
- [ ] Transaction virtual fields - Descriptions, categories

### Wallet Tools ✓
- [ ] getWalletBalance(studentId) - Current balance
- [ ] getWalletHistory() - Balance changes
- [ ] WalletLedger.find() - Audit trail

### Auth Tools ✓
- [ ] authenticateToken() - JWT validation
- [ ] authorizeRole(roles) - Role-based access
- [ ] User.isActive check - Account status

---

## 🚀 APIS TO CREATE (Phase 2-4)

### Copilot Endpoints (Phase 4)
```
POST   /api/copilot/chat
GET    /api/copilot/conversation/:id
POST   /api/copilot/feedback
GET    /api/copilot/suggestions
```

### Context APIs (Phase 2)
```
GET    /api/ai/context/user/:userId
GET    /api/ai/context/budget/:budgetId
GET    /api/ai/context/transaction/:id
```

### Search APIs (Phase 2)
```
POST   /api/ai/search          (full-text)
POST   /api/ai/search/semantic (RAG)
GET    /api/ai/documents       (for RAG)
```

### Analytics APIs (Phase 3)
```
GET    /api/analytics/expenses/breakdown
GET    /api/analytics/budgets/utilization
GET    /api/analytics/comparison/:userId
```

### Prediction APIs (Phase 3)
```
POST   /api/prediction/budget-exceeding
POST   /api/prediction/spending-forecast
POST   /api/prediction/anomalies
```

### Insight APIs (Phase 3)
```
GET    /api/insights/cost-saving
GET    /api/insights/recommendations
GET    /api/insights/alerts
```

### Simulation APIs (Phase 4)
```
POST   /api/ai/simulate/budget-change
POST   /api/ai/simulate/spending-pattern
POST   /api/ai/simulate/policy-change
```

### Audit APIs (Phase 4)
```
POST   /api/ai/audit-log
GET    /api/ai/audit-trail/:agentId
POST   /api/ai/compliance-check
```

---

## 💾 DATABASE MODELS TO CREATE (Phase 1)

### AIDecisionLog
```javascript
{
  agentId: String,              // Which agent
  userId: ObjectId,             // For which user
  actionType: String,           // "recommend", "flag", "analyze"
  action: String,               // What was done
  reasoning: String,            // Why (explainability)
  confidence: Number,           // 0-100
  status: String,               // "pending", "accepted", "rejected"
  relatedEntities: {
    budgetIds: [ObjectId],
    transactionIds: [ObjectId],
    userIds: [ObjectId]
  },
  createdAt: Date
}
```

### ConversationHistory
```javascript
{
  userId: ObjectId,
  conversationId: String,
  turns: [{
    turn: Number,
    userMessage: String,
    aiResponse: String,
    context: Object,
    toolsCalled: [String],
    timestamp: Date
  }],
  summary: String,
  status: String,               // "active", "closed"
  expiresAt: Date              // 30 days
}
```

### UserProfile
```javascript
{
  userId: ObjectId,
  spendingPatterns: {
    categoryPreferences: Object,
    frequencyPattern: String,
    avgTransaction: Number
  },
  budgetHistory: {
    pastBudgets: [ObjectId],
    successRate: Number,
    avgOverrun: Number
  },
  preferences: {
    riskTolerance: String,
    preferredCommunication: String,
    autoApprovalThreshold: Number
  }
}
```

### PolicyDocument
```javascript
{
  title: String,
  category: String,             // "spending", "approval", "reporting"
  content: String,
  embedding: Vector,            // For RAG
  appliesTo: [String],          // Roles
  effectiveDate: Date,
  keyPrinciples: [String]
}
```

### FeedbackData
```javascript
{
  decisionId: ObjectId,         // Link to AI decision
  userId: ObjectId,
  feedbackType: String,         // "helpful", "incorrect", "incomplete"
  rating: Number,               // 1-5
  comment: String,
  outcome: Object,
  useForTraining: Boolean
}
```

### VectorEmbedding
```javascript
{
  sourceType: String,           // "policy", "budget", "transaction"
  sourceId: ObjectId,
  content: String,
  embedding: Vector,            // 768 dims for Gemini
  metadata: {
    title: String,
    category: String,
    importance: Number          // 1-5
  }
}
```

---

## 🤖 AGENTS TO BUILD (Phase 3)

### Agent 1: BudgetAnalysisAgent
```javascript
Tools:
  ✓ getBudgetStatus(budgetId)
  ✓ getExpenses(budgetId, period)
  ✓ getInsights(budgetId)

Triggers:
  - "What's my budget status?"
  - Daily automatic check
  - Admin review request

Outputs:
  - Budget utilization %
  - Expense breakdown
  - Recommendations
```

### Agent 2: SpendingAdvisorAgent
```javascript
Tools:
  ✓ getExpenses(userId, period)
  ✓ getPredictions(userId)
  ✓ getRecommendations(userId)

Triggers:
  - "Am I spending too much?"
  - Spending exceeds threshold
  - Monthly review

Outputs:
  - Spending analysis
  - Forecasts
  - Cost-saving advice
```

### Agent 3: ComplianceAgent
```javascript
Tools:
  ✓ searchDocuments(query)        # RAG
  ✓ getInsights(context)
  ✓ flagAnomaly(transactionId)

Triggers:
  - Budget creation (check policy)
  - Large expense
  - Manual review

Outputs:
  - Policy compliance report
  - Violation flags
  - Recommendations
```

### Agent 4: ApprovalAssistantAgent
```javascript
Tools:
  ✓ getBudgetStatus(budgetId)
  ✓ getExpenses(budgetId)
  ✓ approveTransaction(id)        # Restricted

Triggers:
  - Budget submitted for approval
  - Approval deadline approaching
  - Manual review

Outputs:
  - Approval recommendation
  - Risk assessment
  - Approval action
```

---

## 🛠️ TOOLS TO IMPLEMENT (Phase 3)

### Budget Tools
- [ ] getBudgetStatus(budgetId)
- [ ] getBudgetList(filters)
- [ ] approveBudget(budgetId, reason)
- [ ] rejectBudget(budgetId, reason)

### Transaction Tools
- [ ] getExpenses(filters)
- [ ] getExpensesByUser(userId)
- [ ] getExpenseStats(period)
- [ ] flagAnomaly(transactionId, reason)

### Insight Tools
- [ ] getOptimizationTips(context)
- [ ] generateRecommendations(context)
- [ ] getPredictions(context)

### RAG Tools
- [ ] searchDocuments(query)

### Audit Tools
- [ ] logAIDecision(decision)

---

## 🔒 SECURITY CONTROLS TO IMPLEMENT

### Phase 1: Critical
- [ ] Sanitize inputs before LLM
- [ ] Validate JWT tokens
- [ ] Scope queries by userId
- [ ] Rate limit API calls

### Phase 2: Important
- [ ] Tool whitelist/blacklist
- [ ] Output sanitization
- [ ] PII masking in logs
- [ ] Execution sandboxing

### Phase 3: Enhanced
- [ ] Jailbreak detection
- [ ] Prompt injection prevention
- [ ] SQL injection prevention
- [ ] HTML injection prevention

### Phase 4: Complete
- [ ] Data retention policies
- [ ] Conversation cleanup (30 days)
- [ ] GDPR compliance logging
- [ ] Cost monitoring & alerts

---

## 📦 DEPENDENCIES TO ADD

```json
{
  "@langchain/langgraph": "^0.1.0",
  "@langchain/google-genai": "^0.0.x",
  "@qdrant/js-client-rest": "^1.x.x",
  "dotenv": "^16.x.x",
  "redis": "^4.x.x",
  "bull": "^4.x.x",
  "uuid": "^9.x.x"
}
```

### Docker Containers
```yaml
qdrant:
  image: qdrant/qdrant:latest
  ports: 6333:6333

redis:
  image: redis:7-alpine
  ports: 6379:6379
```

### Environment Variables
```env
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-1.5-pro
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379
AI_SERVICE_LOG_LEVEL=debug
AI_DECISION_RETENTION_DAYS=90
CONVERSATION_RETENTION_DAYS=30
AI_REQUEST_RATE_LIMIT=100
AI_MONTHLY_BUDGET_LIMIT=1000
```

---

## 📊 PHASE BREAKDOWN

### Phase 1: Foundation (5 days)
**What You'll Have**:
- ✓ Qdrant + Redis running
- ✓ Gemini API integrated
- ✓ 6 new database models
- ✓ LLM service working

**Deliverables**:
- src/ai-service/llm/geminiClient.js
- src/services/llmService.js
- 6 model files
- Basic tests

**Effort**: 3-4 developers days

---

### Phase 2: APIs (5 days)
**What You'll Have**:
- ✓ Context retrieval APIs
- ✓ Search APIs (full-text + RAG)
- ✓ Analytics APIs
- ✓ Audit log APIs

**Deliverables**:
- 12+ API endpoints
- RAG service
- API tests

**Effort**: 3-4 developer days

---

### Phase 3: Agents (5 days)
**What You'll Have**:
- ✓ 4 LangGraph agents
- ✓ 10+ tools implemented
- ✓ Agent routing
- ✓ Tool calling framework

**Deliverables**:
- Agent definitions
- Tool implementations
- Agent tests

**Effort**: 4-5 developer days

---

### Phase 4: Copilot (5 days)
**What You'll Have**:
- ✓ Chat API endpoints
- ✓ Multi-turn conversations
- ✓ Session management
- ✓ Streaming responses

**Deliverables**:
- Copilot service
- Chat controller
- Integration tests

**Effort**: 3-4 developer days

---

### Phase 5: Optimization (5 days)
**What You'll Have**:
- ✓ Analytics infrastructure
- ✓ Feedback loop
- ✓ Performance optimized
- ✓ Cost tracking

**Deliverables**:
- Analytics models
- Feedback service
- Performance reports

**Effort**: 2-3 developer days

---

## ✅ BEFORE YOU START

### Prerequisites
- [ ] Node.js 18+
- [ ] npm 9+
- [ ] Docker installed
- [ ] MongoDB running
- [ ] Gemini API key obtained
- [ ] Read all 3 AI documents

### Setup Steps
```bash
# 1. Install new dependencies
cd backend
npm install @langchain/langgraph @langchain/google-genai @qdrant/js-client-rest

# 2. Create .env file
cp .env.example .env
# Update GEMINI_API_KEY, QDRANT_URL, REDIS_URL

# 3. Start Docker containers
docker-compose up -d

# 4. Verify services
curl http://localhost:6333/health      # Qdrant
redis-cli ping                          # Redis

# 5. Run existing tests
npm test

# 6. You're ready!
```

---

## 🎯 QUICK WINS (Easy First Tasks)

### Week 1 Quick Wins
1. **Create Gemini client** (2 hours)
   - Wrap Gemini API
   - Handle errors
   - Add logging

2. **Create database models** (3 hours)
   - AIDecisionLog
   - ConversationHistory
   - Create indexes

3. **Create tool registry** (2 hours)
   - Define tool interface
   - Create registry
   - Add validation

### Week 2 Quick Wins
1. **Implement first tool** (2 hours)
   - getBudgetStatus
   - Call existing API
   - Add tests

2. **Create first API** (2 hours)
   - /api/copilot/chat
   - Connect to LLM
   - Basic response

3. **Create first agent** (3 hours)
   - BudgetAnalysisAgent
   - Use 1-2 tools
   - Test with mock data

---

## 🚨 CRITICAL REMINDERS

### Must-Do Security Items
- [ ] Never commit API keys to git
- [ ] Always validate user input
- [ ] Always scope by userId
- [ ] Always log AI decisions
- [ ] Always rate limit API calls

### Must-Test Items
- [ ] Tool execution with invalid inputs
- [ ] User can't see other users' data
- [ ] Tool calls are logged
- [ ] Error handling works
- [ ] Rate limiting works

### Must-Monitor Items
- [ ] Gemini API cost
- [ ] Database query performance
- [ ] API response times (<500ms)
- [ ] Error rates (<1%)
- [ ] User feedback

---

## 📞 REFERENCE DOCS

**Main Documents**:
1. [AI_READINESS_REPORT.md](AI_READINESS_REPORT.md) - Full assessment
2. [AI_IMPLEMENTATION_GUIDE.md](AI_IMPLEMENTATION_GUIDE.md) - Implementation details
3. [AI_ARCHITECTURE_DIAGRAMS.md](AI_ARCHITECTURE_DIAGRAMS.md) - Visual architecture

**External Resources**:
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Qdrant Docs](https://qdrant.tech/documentation/)
- [Redis Docs](https://redis.io/docs/)

---

## 📝 WEEKLY CHECKLIST

### Week 1: Foundation
- [ ] Qdrant running
- [ ] Redis running
- [ ] Gemini API key configured
- [ ] LLM service working
- [ ] Database models created
- [ ] Basic tests passing

### Week 2: Agents
- [ ] Tool registry created
- [ ] 3+ tools implemented
- [ ] 2 agents created
- [ ] Agent routing working
- [ ] Tool execution tested

### Week 3: APIs
- [ ] Copilot chat API working
- [ ] Context retrieval APIs working
- [ ] Search API working
- [ ] Authentication on all endpoints
- [ ] Error handling complete

### Week 4: RAG
- [ ] Documents embedded
- [ ] Qdrant collection populated
- [ ] Semantic search working
- [ ] Compliance agent using policies
- [ ] RAG integrated with LLM

### Week 5: Integration
- [ ] All agents connected
- [ ] Multi-turn conversations working
- [ ] Feedback collection working
- [ ] Audit logging complete
- [ ] Security review done

### Week 6: Optimization
- [ ] Performance benchmarks recorded
- [ ] Cost analysis done
- [ ] Prompts optimized
- [ ] Documentation complete
- [ ] Ready for production

---

**Print this checklist and check off items as you go!**

**Ready to start? Begin with Phase 1: Foundation**

---

**End of Quick Reference**
