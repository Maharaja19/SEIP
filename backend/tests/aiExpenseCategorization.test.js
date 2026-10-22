const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = require('../server');

const User = require('../src/models/user');
const Organization = require('../src/models/organization');
const Transaction = require('../src/models/transactions');
const Category = require('../src/models/category');
const AIInsight = require('../src/models/aiInsight');
const AuditLog = require('../src/models/auditLog');

const defaultAIService = require('../src/services/ai/AIService');
const MockAIProvider = require('../src/services/ai/providers/MockAIProvider');
const GeminiProvider = require('../src/services/ai/providers/GeminiProvider');
const {
  CONFIDENCE_LEVELS,
  CONFIDENCE_THRESHOLDS,
  evaluateConfidenceTier
} = require('../src/services/ai/classification/confidencePolicy');
const { USER_ROLES } = require('../src/utils/roles');

describe('Milestone 2B: AI Expense Categorization Test Suite', () => {
  let orgA;
  let orgB;
  let userA;
  let tokenA;
  let userA2;
  let tokenA2;
  let userB;
  let tokenB;
  let adminA;
  let adminTokenA;
  let mockProvider;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Tenant Organizations
    orgA = await Organization.create({
      name: 'Acme Corp',
      slug: 'acme-corp',
      type: 'COMPANY',
      currency: 'INR'
    });

    orgB = await Organization.create({
      name: 'Stark Industries',
      slug: 'stark-industries',
      type: 'STARTUP',
      currency: 'INR'
    });

    // Create Users
    userA = await User.create({
      sNo: 601,
      name: 'Alice Employee',
      email: 'alice@acme.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgA._id,
      isActive: true
    });
    tokenA = global.createTestToken(userA);

    userA2 = await User.create({
      sNo: 602,
      name: 'Charlie Colleague',
      email: 'charlie@acme.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgA._id,
      isActive: true
    });
    tokenA2 = global.createTestToken(userA2);

    userB = await User.create({
      sNo: 603,
      name: 'Bob Outsider',
      email: 'bob@stark.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgB._id,
      isActive: true
    });
    tokenB = global.createTestToken(userB);

    adminA = await User.create({
      sNo: 604,
      name: 'Admin Alice',
      email: 'admin@acme.com',
      password: hashedPassword,
      role: USER_ROLES.ADMIN,
      organizationId: orgA._id,
      isActive: true
    });
    adminTokenA = global.createTestToken(adminA);

    // Setup Mock AI Provider by default
    mockProvider = new MockAIProvider({
      structuredResponse: {
        suggestedCategory: 'Food & Dining',
        confidence: 0.96,
        reason: 'Food delivery transaction.'
      }
    });
    defaultAIService.setProvider(mockProvider);
  });

  afterEach(() => {
    // Restore clean state if necessary
  });

  // ============================================================
  // 1. SUCCESSFUL CLASSIFICATION (Phase 3, 4, 5, 8)
  // ============================================================
  describe('1. Successful Transaction Classification', () => {
    it('should classify an expense and provide structured suggestion without altering financial category', async () => {
      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 450,
        currency: 'INR',
        merchant: 'Swiggy',
        description: 'Dinner order',
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.classification).toBeDefined();
      expect(res.body.data.classification.suggestedCategory).toBe('Food & Dining');
      expect(res.body.data.classification.confidence).toBe(0.96);
      expect(res.body.data.classification.status).toBe('SUGGESTED');
      expect(res.body.data.classification.reason).toBe('Food delivery transaction.');
      expect(res.body.data.confidenceTier).toBe('HIGH');
      expect(res.body.data.isStrongSuggestion).toBe(true);

      // Verify authoritative category was NOT altered directly by AI
      const freshTx = await Transaction.findById(tx._id);
      expect(freshTx.category).toBe('misc');
      expect(freshTx.AIClassification.status).toBe('SUGGESTED');
      expect(freshTx.AIClassification.suggestedCategory).toBe('Food & Dining');
    });
  });

  // ============================================================
  // 2. CONFIDENCE POLICY TIERS (Phase 6)
  // ============================================================
  describe('2. Confidence Policy Tiers', () => {
    it('should flag HIGH confidence for score >= 0.85', async () => {
      expect(evaluateConfidenceTier(0.85)).toBe(CONFIDENCE_LEVELS.HIGH);
      expect(evaluateConfidenceTier(0.99)).toBe(CONFIDENCE_LEVELS.HIGH);
    });

    it('should flag MEDIUM confidence for 0.60 <= score < 0.85', async () => {
      expect(evaluateConfidenceTier(0.70)).toBe(CONFIDENCE_LEVELS.MEDIUM);
      expect(evaluateConfidenceTier(0.84)).toBe(CONFIDENCE_LEVELS.MEDIUM);

      mockProvider.structuredResponse = {
        suggestedCategory: 'Transport',
        confidence: 0.72,
        reason: 'Possible cab ride'
      };

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 150,
        merchant: 'Uber',
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.confidenceTier).toBe('MEDIUM');
      expect(res.body.data.isStrongSuggestion).toBe(true);
    });

    it('should flag LOW confidence for score < 0.60', async () => {
      expect(evaluateConfidenceTier(0.55)).toBe(CONFIDENCE_LEVELS.LOW);
      expect(evaluateConfidenceTier(0.1)).toBe(CONFIDENCE_LEVELS.LOW);

      mockProvider.structuredResponse = {
        suggestedCategory: 'Entertainment',
        confidence: 0.45,
        reason: 'Unclear payment description'
      };

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 200,
        description: 'Random transfer',
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.confidenceTier).toBe('LOW');
      expect(res.body.data.isStrongSuggestion).toBe(false);
    });
  });

  // ============================================================
  // 3. CATEGORY VALIDATION & REJECTION (Phase 3 & 5)
  // ============================================================
  describe('3. Category Validation & Unauthorized Categories', () => {
    it('should reject invented categories not in authorized whitelist', async () => {
      mockProvider.structuredResponse = {
        suggestedCategory: 'Luxury Food Delivery', // Arbitrary hallucinated category
        confidence: 0.95,
        reason: 'Expensive food'
      };

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 5000,
        merchant: 'Gourmet Club',
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Should return error from validation failure
      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);

      // Verify transaction remains valid and marked FAILED in AIClassification
      const freshTx = await Transaction.findById(tx._id);
      expect(freshTx.category).toBe('misc');
      expect(freshTx.AIClassification.status).toBe('FAILED');
    });

    it('should support tenant custom categories when authorized', async () => {
      // Create custom organization category in Org A
      await Category.create({
        name: 'Client Entertainment',
        type: 'expense',
        scope: 'organization',
        organization: orgA._id,
        isActive: true
      });

      mockProvider.structuredResponse = {
        suggestedCategory: 'Client Entertainment',
        confidence: 0.92,
        reason: 'Expense for client dinner'
      };

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 3200,
        merchant: 'Grand Hotel',
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.classification.suggestedCategory).toBe('Client Entertainment');
    });

    it('should reject malformed confidence values', async () => {
      mockProvider.structuredResponse = {
        suggestedCategory: 'Food & Dining',
        confidence: 2.5, // Invalid confidence > 1
        reason: 'Invalid'
      };

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 100,
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(502);
    });
  });

  // ============================================================
  // 4. PROVIDER ERRORS & TIMEOUTS (Phase 16)
  // ============================================================
  describe('4. AI Provider Failure & Non-blocking Behavior', () => {
    it('should return 504 on AI timeout while keeping transaction data intact', async () => {
      mockProvider.delayMs = 300;
      mockProvider.shouldFail = true;
      const { AITimeoutError } = require('../src/services/ai/aiErrors');
      mockProvider.failureError = new AITimeoutError('AI request timed out', 100);

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 1000,
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(504);
      const freshTx = await Transaction.findById(tx._id);
      expect(freshTx.category).toBe('misc');
      expect(freshTx.AIClassification.status).toBe('FAILED');
    });

    it('should return 503 when AI provider is unavailable', async () => {
      mockProvider.enabled = false;

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 100,
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(503);
    });

    it('should not fail transaction creation when AI classification fails', async () => {
      mockProvider.enabled = false;

      // Transaction creation with autoClassify=true
      const res = await request(app)
        .post('/api/transactions?classify=true')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: 250,
          category: 'misc',
          description: 'Coffee at Starbucks'
        });

      // Transaction creation succeeds 201 despite AI provider being disabled!
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(250);
    });
  });

  // ============================================================
  // 5. SECURITY & TENANT ISOLATION (Phase 14)
  // ============================================================
  describe('5. Security, IDOR & Tenant Isolation', () => {
    it('should return 404 when attempting to classify another organization transaction', async () => {
      const txOrgB = await Transaction.create({
        user: userB._id,
        organization: orgB._id,
        type: 'expense',
        amount: 500,
        category: 'misc'
      });

      // User A from Org A attempts to classify Org B's transaction
      const res = await request(app)
        .post(`/api/ai/transactions/${txOrgB._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it('should prevent non-admin member from classifying another members transaction in same org', async () => {
      const txUserA2 = await Transaction.create({
        user: userA2._id,
        organization: orgA._id,
        type: 'expense',
        amount: 300,
        category: 'misc'
      });

      // User A attempts to classify User A2's transaction
      const res = await request(app)
        .post(`/api/ai/transactions/${txUserA2._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
    });

    it('should allow organization Admin to classify any transaction in their organization', async () => {
      const txUserA = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 300,
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${txUserA._id}/classify`)
        .set('Authorization', `Bearer ${adminTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid MongoDB ObjectId in parameter', async () => {
      const res = await request(app)
        .post('/api/ai/transactions/not-an-id/classify')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_ID');
    });

    it('should protect against cross-tenant category injection', async () => {
      // Category created in Org B
      await Category.create({
        name: 'Org B Secret Research',
        type: 'expense',
        scope: 'organization',
        organization: orgB._id,
        isActive: true
      });

      mockProvider.structuredResponse = {
        suggestedCategory: 'Org B Secret Research',
        confidence: 0.95,
        reason: 'Attempted leakage'
      };

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 100,
        category: 'misc'
      });

      // Org A classification should reject Org B's private category
      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(502);
    });
  });

  // ============================================================
  // 6. ACCEPT & REJECT WORKFLOWS (Phase 9 & 13)
  // ============================================================
  describe('6. Accept / Reject / Manual Override Workflow', () => {
    it('should accept classification, update transaction category, and create audit log', async () => {
      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 850,
        merchant: 'Dominos',
        category: 'misc'
      });

      // 1. Run classification
      await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      // 2. Accept suggestion
      const acceptRes = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classification/accept`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);
      expect(acceptRes.body.data.category).toBe('Food & Dining');
      expect(acceptRes.body.data.classification.status).toBe('ACCEPTED');

      // Verify database state
      const updatedTx = await Transaction.findById(tx._id);
      expect(updatedTx.category).toBe('Food & Dining');
      expect(updatedTx.AIClassification.status).toBe('ACCEPTED');

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'AI_CLASSIFICATION_ACCEPTED',
        entityId: tx._id
      });
      expect(audit).toBeDefined();
      expect(audit.details.newCategory).toBe('Food & Dining');
      expect(String(audit.performedBy)).toBe(String(userA._id));
    });

    it('should reject classification without changing transaction category', async () => {
      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 500,
        category: 'Transport' // Existing category
      });

      // Classify
      await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Reject
      const rejectRes = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classification/reject`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Not a food expense' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.category).toBe('Transport');
      expect(rejectRes.body.data.classification.status).toBe('REJECTED');

      // Verify database
      const freshTx = await Transaction.findById(tx._id);
      expect(freshTx.category).toBe('Transport');
      expect(freshTx.AIClassification.status).toBe('REJECTED');

      // Verify audit
      const audit = await AuditLog.findOne({
        action: 'AI_CLASSIFICATION_REJECTED',
        entityId: tx._id
      });
      expect(audit).toBeDefined();
    });

    it('should prioritize manual user category override over AI suggestions', async () => {
      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 999,
        category: 'misc',
        isStudentEntry: true
      });

      // Classify
      await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      // User manually updates category to 'Shopping' via PUT /api/transactions/:id
      const updateRes = await request(app)
        .put(`/api/transactions/${tx._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ category: 'Shopping' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.category).toBe('Shopping');

      const freshTx = await Transaction.findById(tx._id);
      expect(freshTx.category).toBe('Shopping');
      // AI suggestion must not overwrite manual category
      expect(freshTx.AIClassification.status).toBe('REJECTED');
    });
  });

  // ============================================================
  // 7. IDEMPOTENCY & AIINSIGHT SCOPING (Phase 10 & 11)
  // ============================================================
  describe('7. Idempotency & AIInsight Generation', () => {
    it('should reuse recent successful classification without re-calling AI unless forced', async () => {
      let callCount = 0;
      mockProvider.structuredResponse = () => {
        callCount++;
        return {
          suggestedCategory: 'Food & Dining',
          confidence: 0.95,
          reason: `Call count ${callCount}`
        };
      };

      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 200,
        merchant: 'Cafe',
        category: 'misc'
      });

      // First call -> calls AI
      const res1 = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.reused).toBe(false);
      expect(callCount).toBe(1);

      // Second call immediately -> reused
      const res2 = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.reused).toBe(true);
      expect(callCount).toBe(1); // Provider NOT called again!

      // Third call with force=true -> calls AI again
      const res3 = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify?force=true`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res3.status).toBe(200);
      expect(res3.body.data.reused).toBe(false);
      expect(callCount).toBe(2);
    });

    it('should create and update AIInsight scoped to tenant without duplicates', async () => {
      const tx = await Transaction.create({
        user: userA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 300,
        category: 'misc'
      });

      await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Verify AIInsight was created
      const insights = await AIInsight.find({
        'relatedEntity.entityId': tx._id,
        organization: orgA._id
      });
      expect(insights.length).toBe(1);
      expect(insights[0].type).toBe('EXPENSE_CLASSIFICATION');
      expect(insights[0].metadata.suggestedCategory).toBe('Food & Dining');

      // Re-running classification does NOT create duplicate insight
      await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify?force=true`)
        .set('Authorization', `Bearer ${tokenA}`);

      const insightsAfter = await AIInsight.find({
        'relatedEntity.entityId': tx._id,
        organization: orgA._id
      });
      expect(insightsAfter.length).toBe(1);
    });
  });
});
