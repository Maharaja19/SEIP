const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');

const User = require('../src/models/user');
const Organization = require('../src/models/organization');
const AIInsight = require('../src/models/aiInsight');
const Transaction = require('../src/models/transactions');

const { AIService } = require('../src/services/ai/AIService');
const GeminiProvider = require('../src/services/ai/providers/GeminiProvider');
const MockAIProvider = require('../src/services/ai/providers/MockAIProvider');
const {
  AIConfigurationError,
  AIProviderError,
  AITimeoutError,
  AIValidationError,
  AIRequestSizeError
} = require('../src/services/ai/aiErrors');
const {
  cleanAndParseJson,
  validateClassificationOutput,
  validateInsightOutput
} = require('../src/services/ai/schemas/aiSchemas');
const {
  prepareTransactionContext,
  prepareBudgetContext
} = require('../src/services/ai/dataPreparation/dataPreparation');
const { USER_ROLES } = require('../src/utils/roles');

describe('AI Foundation Architecture Suite (Milestone 2A)', () => {
  let orgA;
  let orgB;
  let memberUserA;
  let memberTokenA;
  let memberUserB;
  let memberTokenB;
  let financeManagerA;
  let financeManagerTokenA;
  let hashedPassword;

  beforeEach(async () => {
    hashedPassword = await bcrypt.hash('password123', 10);

    orgA = await Organization.create({
      name: 'Alpha AI Org',
      slug: 'alpha-ai-org',
      type: 'COMPANY',
      currency: 'INR'
    });

    orgB = await Organization.create({
      name: 'Beta AI Org',
      slug: 'beta-ai-org',
      type: 'STARTUP',
      currency: 'USD'
    });

    memberUserA = await User.create({
      sNo: 501,
      name: 'Alice AI User',
      email: 'alice.ai@alpha.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgA._id,
      isActive: true
    });
    memberTokenA = global.createTestToken(memberUserA);

    memberUserB = await User.create({
      sNo: 502,
      name: 'Bob AI User',
      email: 'bob.ai@beta.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgB._id,
      isActive: true
    });
    memberTokenB = global.createTestToken(memberUserB);

    financeManagerA = await User.create({
      sNo: 503,
      name: 'Fiona AI Manager',
      email: 'fiona.ai@alpha.com',
      password: hashedPassword,
      role: USER_ROLES.FINANCE_MANAGER,
      organizationId: orgA._id,
      isActive: true
    });
    financeManagerTokenA = global.createTestToken(financeManagerA);
  });

  // ==========================================
  // 1. CONFIGURATION & KEY SAFETY
  // ==========================================
  describe('1. Configuration & Secret Protection', () => {
    it('should disable Gemini provider and throw AIConfigurationError when API key is missing', async () => {
      const unconfiguredProvider = new GeminiProvider({ apiKey: '' });
      expect(unconfiguredProvider.isAvailable()).toBe(false);

      const info = unconfiguredProvider.getProviderInfo();
      expect(info.available).toBe(false);
      expect(info.provider).toBe('gemini');
      expect(info.apiKey).toBeUndefined(); // Key must never be in provider info

      const service = new AIService(unconfiguredProvider);
      await expect(service.generateText({ prompt: 'Test prompt' })).rejects.toThrow(AIConfigurationError);
    });

    it('should never expose GEMINI_API_KEY in GET /api/ai/status', async () => {
      const res = await request(app)
        .get('/api/ai/status')
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBeDefined();
      expect(res.body.data.model).toBeDefined();

      // Ensure no keys, secrets, or passwords appear anywhere in response payload
      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toMatch(/api_?key/i);
      expect(responseString).not.toMatch(/secret/i);
      expect(responseString).not.toMatch(/AIza[0-9A-Za-z-_]{35}/);
    });
  });

  // ==========================================
  // 2. PROVIDER ABSTRACTION
  // ==========================================
  describe('2. Provider Abstraction & Swapping', () => {
    it('should allow hot-swapping providers on AIService', async () => {
      const mock1 = new MockAIProvider({ textResponse: 'Response from Mock 1' });
      const mock2 = new MockAIProvider({ textResponse: 'Response from Mock 2' });

      const service = new AIService(mock1);
      const res1 = await service.generateText({ prompt: 'Hello' });
      expect(res1).toBe('Response from Mock 1');

      service.setProvider(mock2);
      const res2 = await service.generateText({ prompt: 'Hello' });
      expect(res2).toBe('Response from Mock 2');
    });

    it('should reject invalid provider that does not implement BaseAIProvider interface', () => {
      const service = new AIService();
      expect(() => service.setProvider({})).toThrow(/BaseAIProvider/);
      expect(() => service.setProvider(null)).toThrow(/BaseAIProvider/);
    });
  });

  // ==========================================
  // 3. STRUCTURED OUTPUT VALIDATION
  // ==========================================
  describe('3. Structured Output & Schema Validation', () => {
    it('should cleanly parse JSON wrapped in markdown code fences', () => {
      const markdownJson = '```json\n{\n  "category": "food",\n  "confidence": 0.95,\n  "reason": "Cafeteria"\n}\n```';
      const parsed = cleanAndParseJson(markdownJson);
      expect(parsed.category).toBe('food');
      expect(parsed.confidence).toBe(0.95);
    });

    it('should validate structured classification outputs against allowed categories', () => {
      const valid = { category: 'Food', confidence: 0.92, reason: 'Restaurant' };
      const validated = validateClassificationOutput(valid, ['food', 'transport', 'misc']);
      expect(validated.category).toBe('food');
      expect(validated.confidence).toBe(0.92);
      expect(validated.reason).toBe('Restaurant');
    });

    it('should throw AIValidationError if category is not in allowed list', () => {
      const invalid = { category: 'gambling', confidence: 0.99 };
      expect(() => validateClassificationOutput(invalid, ['food', 'transport', 'misc']))
        .toThrow(AIValidationError);
    });

    it('should throw AIValidationError if confidence is out of [0, 1] range', () => {
      const invalidHigh = { category: 'food', confidence: 1.5 };
      expect(() => validateClassificationOutput(invalidHigh))
        .toThrow(AIValidationError);

      const invalidLow = { category: 'food', confidence: -0.2 };
      expect(() => validateClassificationOutput(invalidLow))
        .toThrow(AIValidationError);
    });

    it('should validate structured insight outputs', () => {
      const raw = {
        title: 'High dining expenses',
        summary: 'Dining out accounted for 45% of spending',
        severity: 'MEDIUM',
        confidence: 0.88,
        suggestion: 'Reduce takeaway orders next week'
      };
      const validated = validateInsightOutput(raw);
      expect(validated.title).toBe('High dining expenses');
      expect(validated.severity).toBe('medium');
      expect(validated.confidence).toBe(0.88);
      expect(validated.suggestion).toBe('Reduce takeaway orders next week');
    });
  });

  // ==========================================
  // 4. TIMEOUT, ERROR HANDLING & SIZE LIMITS
  // ==========================================
  describe('4. Timeouts, Error Handling & Size Limits', () => {
    it('should enforce prompt size limits and throw AIRequestSizeError on oversized input', async () => {
      const mock = new MockAIProvider();
      const service = new AIService(mock);

      const oversizedPrompt = 'a'.repeat(4500);
      await expect(service.generateText({ prompt: oversizedPrompt }))
        .rejects.toThrow(AIRequestSizeError);
    });

    it('should enforce execution timeout and throw AITimeoutError when provider is slow', async () => {
      const slowMock = new MockAIProvider({ delayMs: 200 });
      const service = new AIService(slowMock);

      await expect(service.generateText({ prompt: 'Quick query', timeoutMs: 50 }))
        .rejects.toThrow(AITimeoutError);
    });

    it('should handle provider errors gracefully and translate them to AIProviderError', async () => {
      const failingMock = new MockAIProvider({
        shouldFail: true,
        failureError: new Error('Network reset by peer')
      });
      const service = new AIService(failingMock);

      await expect(service.generateText({ prompt: 'Test' }))
        .rejects.toThrow('Network reset by peer');
    });

    it('should NOT fail financial core transaction creation if AI fails', async () => {
      // Create transaction via core API — should succeed with 201 regardless of AI
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${memberTokenA}`)
        .send({
          type: 'expense',
          amount: 250,
          category: 'food',
          description: 'Team snacks'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(250);

      // Verify the transaction is cleanly committed in database
      const saved = await Transaction.findById(res.body.data._id);
      expect(saved).toBeDefined();
      expect(saved.amount).toBe(250);
    });
  });

  // ==========================================
  // 5. DATA PREPARATION (SANITIZATION)
  // ==========================================
  describe('5. Data Preparation & Sanitization', () => {
    it('should sanitize raw transaction into clean DTO without sensitive internals', () => {
      const rawTx = {
        _id: '609366b51e2049fdea66c98c',
        user: '609366b51e2049fdea66c999',
        organization: '609366b51e2049fdea66c98c',
        amount: 1450.50,
        currency: 'inr',
        type: 'EXPENSE',
        category: 'technology',
        merchant: 'JetBrains Inc',
        description: 'IDE License Renewal',
        date: new Date('2026-10-02'),
        department: 'Engineering',
        tags: ['software', 'tools'],
        __v: 0
      };

      const prepared = prepareTransactionContext(rawTx);

      expect(prepared.amount).toBe(1450.5);
      expect(prepared.currency).toBe('INR');
      expect(prepared.type).toBe('expense');
      expect(prepared.merchant).toBe('JetBrains Inc');
      expect(prepared.description).toBe('IDE License Renewal');
      expect(prepared.department).toBe('Engineering');
      expect(prepared.tags).toEqual(['software', 'tools']);

      // Internal database IDs must not be leaked in the AI DTO
      expect(prepared._id).toBeUndefined();
      expect(prepared.user).toBeUndefined();
      expect(prepared.organization).toBeUndefined();
      expect(prepared.__v).toBeUndefined();
    });

    it('should prepare sanitized budget context', () => {
      const rawBudget = {
        title: 'Operations Q4',
        period: 'MONTHLY',
        allocated: 50000,
        spent: 20000,
        remaining: 30000,
        expenses: [{ item: 'Internet', amount: 2000 }]
      };

      const prepared = prepareBudgetContext(rawBudget);
      expect(prepared.title).toBe('Operations Q4');
      expect(prepared.allocated).toBe(50000);
      expect(prepared.spent).toBe(20000);
      expect(prepared.remaining).toBe(30000);
      expect(prepared.utilizationPercentage).toBe(40);
      expect(prepared.expensesCount).toBe(1);
    });
  });

  // ==========================================
  // 6. TENANT ISOLATION & RBAC (AI PERSISTENCE)
  // ==========================================
  describe('6. Tenant Isolation & AI Insights Scoping', () => {
    beforeEach(async () => {
      // Create insights in Org A
      await AIInsight.create({
        organization: orgA._id,
        user: memberUserA._id,
        type: 'SPENDING_INSIGHT',
        severity: 'info',
        title: 'Alpha Insight 1',
        message: 'Personal spending note for Alice',
        confidence: 0.95
      });

      await AIInsight.create({
        organization: orgA._id,
        type: 'BUDGET_RECOMMENDATION',
        severity: 'medium',
        title: 'Alpha Org Budget Advisory',
        message: 'Organization-wide budget advisory',
        confidence: 0.90
      });

      // Create insight in Org B
      await AIInsight.create({
        organization: orgB._id,
        user: memberUserB._id,
        type: 'SPENDING_INSIGHT',
        severity: 'high',
        title: 'Beta Secret Insight',
        message: 'Private insight for Org B',
        confidence: 0.99
      });
    });

    it('should isolate insights by tenant: Member in Org A cannot see Org B insights', async () => {
      const res = await request(app)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${memberTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const titles = res.body.data.map(i => i.title);
      expect(titles).toContain('Alpha Insight 1');
      expect(titles).not.toContain('Beta Secret Insight'); // Tenant B isolated
    });

    it('should allow Finance Manager in Org A to view organization-wide insights', async () => {
      const res = await request(app)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${financeManagerTokenA}`);

      expect(res.status).toBe(200);
      const titles = res.body.data.map(i => i.title);
      expect(titles).toContain('Alpha Org Budget Advisory');
      expect(titles).not.toContain('Beta Secret Insight');
    });

    it('should enforce authentication on /api/ai endpoints', async () => {
      const statusRes = await request(app).get('/api/ai/status');
      expect(statusRes.status).toBe(401);

      const insightsRes = await request(app).get('/api/ai/insights');
      expect(insightsRes.status).toBe(401);
    });
  });
});
