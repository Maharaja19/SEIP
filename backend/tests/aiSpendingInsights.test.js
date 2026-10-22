const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = require('../server');

const User = require('../src/models/user');
const Organization = require('../src/models/organization');
const Transaction = require('../src/models/transactions');
const Budget = require('../src/models/budget');
const AIInsight = require('../src/models/aiInsight');

const defaultAIService = require('../src/services/ai/AIService');
const MockAIProvider = require('../src/services/ai/providers/MockAIProvider');
const { calculateSpendingAnalytics } = require('../src/services/analytics/spendingAnalyticsService');
const {
  validateSpendingInsightsOutput,
  VALID_SPENDING_INSIGHT_TYPES
} = require('../src/services/ai/schemas/aiSchemas');
const { USER_ROLES } = require('../src/utils/roles');
const { AIValidationError } = require('../src/services/ai/aiErrors');

describe('Milestone 2C: AI Spending Insights Test Suite', () => {
  let orgA;
  let orgB;
  let memberA;
  let tokenA;
  let memberA2;
  let tokenA2;
  let financeManagerA;
  let financeManagerTokenA;
  let adminA;
  let adminTokenA;
  let memberB;
  let tokenB;
  let mockProvider;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    orgA = await Organization.create({
      name: 'Alpha Insights Org',
      slug: 'alpha-insights-org',
      type: 'COMPANY',
      currency: 'INR'
    });

    orgB = await Organization.create({
      name: 'Beta Insights Org',
      slug: 'beta-insights-org',
      type: 'STARTUP',
      currency: 'INR'
    });

    memberA = await User.create({
      sNo: 701,
      name: 'Alice Insights',
      email: 'alice.insights@alpha.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgA._id,
      isActive: true
    });
    tokenA = global.createTestToken(memberA);

    memberA2 = await User.create({
      sNo: 702,
      name: 'Aaron Insights',
      email: 'aaron.insights@alpha.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgA._id,
      isActive: true
    });
    tokenA2 = global.createTestToken(memberA2);

    financeManagerA = await User.create({
      sNo: 703,
      name: 'Fiona Finance',
      email: 'fiona.finance@alpha.com',
      password: hashedPassword,
      role: USER_ROLES.FINANCE_MANAGER,
      organizationId: orgA._id,
      isActive: true
    });
    financeManagerTokenA = global.createTestToken(financeManagerA);

    adminA = await User.create({
      sNo: 704,
      name: 'Alan Admin',
      email: 'alan.admin@alpha.com',
      password: hashedPassword,
      role: USER_ROLES.ADMIN,
      organizationId: orgA._id,
      isActive: true
    });
    adminTokenA = global.createTestToken(adminA);

    memberB = await User.create({
      sNo: 705,
      name: 'Bob Beta',
      email: 'bob.beta@beta.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER,
      organizationId: orgB._id,
      isActive: true
    });
    tokenB = global.createTestToken(memberB);

    // Default mock response grounded in general spending metrics
    mockProvider = new MockAIProvider({
      structuredResponse: {
        insights: [
          {
            type: "SPENDING_SUMMARY",
            title: "Spending Overview",
            summary: "Analysis of your spending activity across active categories.",
            severity: "info",
            confidence: 0.95,
            recommendation: "Review high-frequency categories to maintain healthy cash flow."
          }
        ]
      }
    });
    defaultAIService.setProvider(mockProvider);
  });

  // ============================================================
  // 1. DETERMINISTIC FINANCIAL ANALYTICS (Phase 2 & 3)
  // ============================================================
  describe('1. Deterministic Spending Analytics Engine', () => {
    it('should calculate current and previous period totals, differences, and percentage change accurately', async () => {
      const refDate = new Date('2026-10-15T12:00:00.000Z');

      // Current month expenses (October 2026)
      await Transaction.create([
        {
          user: memberA._id,
          organization: orgA._id,
          type: 'expense',
          amount: 5900,
          category: 'Food & Dining',
          date: new Date('2026-10-05T10:00:00.000Z')
        },
        {
          user: memberA._id,
          organization: orgA._id,
          type: 'expense',
          amount: 2500,
          category: 'Transport',
          date: new Date('2026-10-10T14:00:00.000Z')
        },
        {
          user: memberA._id,
          organization: orgA._id,
          type: 'income',
          amount: 25000,
          category: 'Salary',
          date: new Date('2026-10-01T09:00:00.000Z')
        }
      ]);

      // Previous month expenses (September 2026 aligned to day 15)
      await Transaction.create([
        {
          user: memberA._id,
          organization: orgA._id,
          type: 'expense',
          amount: 5000,
          category: 'Food & Dining',
          date: new Date('2026-09-04T11:00:00.000Z')
        },
        {
          user: memberA._id,
          organization: orgA._id,
          type: 'expense',
          amount: 2000,
          category: 'Transport',
          date: new Date('2026-09-08T16:00:00.000Z')
        }
      ]);

      const analytics = await calculateSpendingAnalytics({
        organizationId: orgA._id,
        userId: memberA._id,
        userRole: USER_ROLES.MEMBER,
        referenceDate: refDate
      });

      // Deterministic Current Period Totals
      expect(analytics.summary.totalExpense).toBe(8400); // 5900 + 2500
      expect(analytics.summary.totalIncome).toBe(25000);
      expect(analytics.summary.netCashFlow).toBe(16600); // 25000 - 8400
      expect(analytics.summary.expenseCount).toBe(2);

      // Deterministic Comparison
      expect(analytics.comparison.previousTotalExpense).toBe(7000); // 5000 + 2000
      expect(analytics.comparison.absoluteChange).toBe(1400); // 8400 - 7000
      expect(analytics.comparison.percentageChange).toBe(20.0); // 1400 / 7000 * 100 = 20%
      expect(analytics.comparison.hasPreviousPeriodData).toBe(true);

      // Category Specific Calculations (Food: 5900 vs 5000 -> +900 = +18%)
      const foodCat = analytics.categories.find(c => c.category === 'Food & Dining');
      expect(foodCat).toBeDefined();
      expect(foodCat.current).toBe(5900);
      expect(foodCat.previous).toBe(5000);
      expect(foodCat.absoluteChange).toBe(900);
      expect(foodCat.percentageChange).toBe(18.0);
      expect(foodCat.shareOfSpending).toBe(70.2); // 5900 / 8400 = 70.2%
    });

    it('should rank top categories and identify highest increase and decrease', async () => {
      const refDate = new Date('2026-10-20T12:00:00.000Z');

      await Transaction.create([
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 4000, category: 'Shopping', date: new Date('2026-10-02') },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 3000, category: 'Food', date: new Date('2026-10-03') },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 1000, category: 'Bills', date: new Date('2026-10-04') },
        // Prior month
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 1000, category: 'Shopping', date: new Date('2026-09-02') },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 5000, category: 'Food', date: new Date('2026-09-03') }
      ]);

      const analytics = await calculateSpendingAnalytics({
        organizationId: orgA._id,
        userId: memberA._id,
        userRole: USER_ROLES.MEMBER,
        referenceDate: refDate
      });

      expect(analytics.rankings.topCategory.category).toBe('Shopping');
      expect(analytics.rankings.highestIncrease.category).toBe('Shopping'); // +3000
      expect(analytics.rankings.highestDecrease.category).toBe('Food'); // -2000
    });

    it('should calculate budget utilization and pacing deterministically', async () => {
      const refDate = new Date('2026-10-15T12:00:00.000Z'); // Day 15 of 31 = ~48.4% expected pace

      await Budget.create({
        organization: orgA._id,
        title: 'Operations Budget',
        total_budget: 10000,
        spent: 8500,
        status: 'approved'
      });

      const analytics = await calculateSpendingAnalytics({
        organizationId: orgA._id,
        userId: memberA._id,
        userRole: USER_ROLES.ADMIN,
        referenceDate: refDate
      });

      expect(analytics.budgets.length).toBe(1);
      const b = analytics.budgets[0];
      expect(b.allocated).toBe(10000);
      expect(b.spent).toBe(8500);
      expect(b.remaining).toBe(1500);
      expect(b.utilization).toBe(85.0);
      expect(b.riskLevel).toBe('WARNING');
      expect(b.isAheadOfPace).toBe(true); // 85% > 48.4% + 15%
    });
  });

  // ============================================================
  // 2. DATA SUFFICIENCY & ZERO DATA HANDLING (Phase 5)
  // ============================================================
  describe('2. Data Sufficiency & Missing Data Rules', () => {
    it('should return deterministic insufficient data notice when no transactions exist without calling AI', async () => {
      let aiCalled = false;
      mockProvider.structuredResponse = () => {
        aiCalled = true;
        return { insights: [] };
      };

      const res = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dataSufficiency.insufficientData).toBe(true);
      expect(res.body.data.insights[0].title).toBe('Insufficient Data');
      expect(aiCalled).toBe(false); // AI was never called!
    });

    it('should suppress trend claims when transaction count is insufficient (< 3)', async () => {
      await Transaction.create({
        user: memberA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 300,
        category: 'Food',
        date: new Date()
      });

      const analytics = await calculateSpendingAnalytics({
        organizationId: orgA._id,
        userId: memberA._id,
        userRole: USER_ROLES.MEMBER
      });

      expect(analytics.dataSufficiency.hasMultipleTransactions).toBe(false);
      expect(analytics.dataSufficiency.notice).toMatch(/Limited spending data/i);
    });

    it('should indicate first recorded period when previous period data is missing', async () => {
      await Transaction.create([
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 500, category: 'Food', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 200, category: 'Transport', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 400, category: 'Bills', date: new Date() }
      ]);

      const analytics = await calculateSpendingAnalytics({
        organizationId: orgA._id,
        userId: memberA._id,
        userRole: USER_ROLES.MEMBER
      });

      expect(analytics.dataSufficiency.hasPreviousPeriodData).toBe(false);
      expect(analytics.dataSufficiency.notice).toMatch(/First recorded spending period/i);
    });
  });

  // ============================================================
  // 3. AUTHORIZATION & TENANT SCOPING (Phase 10 & 11)
  // ============================================================
  describe('3. Authorization, RBAC & Multi-Tenant Scoping', () => {
    beforeEach(async () => {
      // Create transactions for Member A and Member A2 in Org A
      await Transaction.create([
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 1000, category: 'Food', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 1500, category: 'Transport', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 800, category: 'Bills', date: new Date() },
        { user: memberA2._id, organization: orgA._id, type: 'expense', amount: 5000, category: 'Equipment', date: new Date() }
      ]);

      // Create transaction in Org B
      await Transaction.create([
        { user: memberB._id, organization: orgB._id, type: 'expense', amount: 9999, category: 'Secret R&D', date: new Date() }
      ]);
    });

    it('should scope Member analysis strictly to their own transactions', async () => {
      const res = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      // Member A's total is 1000 + 1500 + 800 = 3300 (does not include Member A2's 5000)
      expect(res.body.data.summary.totalExpense).toBe(3300);
      expect(res.body.data.summary.expenseCount).toBe(3);
    });

    it('should allow Finance Manager to view organization-wide spending analytics', async () => {
      const res = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${financeManagerTokenA}`);

      expect(res.status).toBe(200);
      // Org A total is 3300 (Member A) + 5000 (Member A2) = 8300
      expect(res.body.data.summary.totalExpense).toBe(8300);
    });

    it('should allow Organization Admin to view organization-wide spending analytics', async () => {
      const res = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${adminTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalExpense).toBe(8300);
    });

    it('should enforce strict tenant isolation across organizations', async () => {
      const resB = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.summary.totalExpense).toBe(9999);
      // Ensure Org A transactions are completely invisible to Org B
      const orgBExpenses = resB.body.data.categories.map(c => c.category);
      expect(orgBExpenses).not.toContain('Food');
      expect(orgBExpenses).not.toContain('Equipment');
    });
  });

  // ============================================================
  // 4. STRUCTURED AI OUTPUT & FACTUAL GROUNDING (Phase 8 & 9)
  // ============================================================
  describe('4. Schema Validation & Factual Grounding', () => {
    it('should validate structured spending insight response', () => {
      const valid = validateSpendingInsightsOutput({
        insights: [
          {
            type: "SPENDING_CHANGE",
            title: "Spending surge",
            summary: "Food spending increased by 18% this month.",
            severity: "info",
            confidence: 0.9,
            recommendation: "Track dinner orders"
          }
        ]
      }, { summary: { totalExpense: 5900 }, comparison: { percentageChange: 18 } });

      expect(valid.insights.length).toBe(1);
      expect(valid.insights[0].type).toBe("SPENDING_CHANGE");
    });

    it('should reject invalid insight types', () => {
      expect(() => {
        validateSpendingInsightsOutput({
          insights: [
            {
              type: "INVALID_UNKNOWN_TYPE",
              title: "Title",
              summary: "Summary"
            }
          ]
        });
      }).toThrow(AIValidationError);
    });

    it('should reject invalid confidence values', () => {
      expect(() => {
        validateSpendingInsightsOutput({
          insights: [
            {
              type: "SPENDING_SUMMARY",
              title: "Title",
              summary: "Summary",
              confidence: 3.5 // > 1
            }
          ]
        });
      }).toThrow(AIValidationError);
    });

    it('should reject ungrounded financial figures when grounding facts are provided', () => {
      const facts = {
        summary: { totalExpense: 5900 },
        comparison: { percentageChange: 18 }
      };

      // Mentions ₹45,000 which is completely absent from provided facts!
      expect(() => {
        validateSpendingInsightsOutput({
          insights: [
            {
              type: "SPENDING_CHANGE",
              title: "Huge spending",
              summary: "You spent ₹45,000 on luxury goods this week."
            }
          ]
        }, facts);
      }).toThrow(/ungrounded financial figure/i);
    });
  });

  // ============================================================
  // 5. PROVIDER ERRORS & RESILIENCE (Phase 16)
  // ============================================================
  describe('5. AI Provider Errors & Non-Blocking Resilience', () => {
    beforeEach(async () => {
      await Transaction.create([
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 1000, category: 'Food', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 1500, category: 'Transport', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 800, category: 'Bills', date: new Date() }
      ]);
    });

    it('should return 504 on AI timeout without corrupting data', async () => {
      mockProvider.shouldFail = true;
      const { AITimeoutError } = require('../src/services/ai/aiErrors');
      mockProvider.failureError = new AITimeoutError('AI timeout', 100);

      const res = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(504);
      expect(res.body.success).toBe(false);

      // Verify transactions remain 100% intact
      const txCount = await Transaction.countDocuments({ organization: orgA._id });
      expect(txCount).toBe(3);
    });

    it('should return 503 when AI provider is unavailable', async () => {
      mockProvider.enabled = false;

      const res = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(503);
    });
  });

  // ============================================================
  // 6. CACHING & IDEMPOTENCY (Phase 12)
  // ============================================================
  describe('6. Caching & Regeneration', () => {
    beforeEach(async () => {
      await Transaction.create([
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 2000, category: 'Food', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 1000, category: 'Transport', date: new Date() },
        { user: memberA._id, organization: orgA._id, type: 'expense', amount: 500, category: 'Bills', date: new Date() }
      ]);
    });

    it('should cache generated insights and avoid calling AI repeatedly', async () => {
      let callCount = 0;
      mockProvider.structuredResponse = () => {
        callCount++;
        return {
          insights: [
            {
              type: "SPENDING_SUMMARY",
              title: `Insight Run ${callCount}`,
              summary: "Spending summary details.",
              severity: "info",
              confidence: 0.95
            }
          ]
        };
      };

      // 1. Initial request -> calls AI
      const res1 = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.cached).toBe(false);
      expect(callCount).toBe(1);

      // 2. Subsequent request -> served from cache
      const res2 = await request(app)
        .get('/api/ai/insights/spending')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.cached).toBe(true);
      expect(callCount).toBe(1); // Provider was NOT invoked!

      // 3. Forced request (?force=true) -> re-invokes AI
      const res3 = await request(app)
        .get('/api/ai/insights/spending?force=true')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res3.status).toBe(200);
      expect(res3.body.data.cached).toBe(false);
      expect(callCount).toBe(2);
    });
  });

  // ============================================================
  // 7. REGRESSION VERIFICATION (Milestone 2B intact)
  // ============================================================
  describe('7. Milestone 2B Expense Categorization Preservation', () => {
    it('should continue to categorize transactions with advisory AI suggestion intact', async () => {
      mockProvider.structuredResponse = {
        suggestedCategory: 'Food & Dining',
        confidence: 0.96,
        reason: 'Food delivery'
      };

      const tx = await Transaction.create({
        user: memberA._id,
        organization: orgA._id,
        type: 'expense',
        amount: 450,
        merchant: 'Swiggy',
        category: 'misc'
      });

      const res = await request(app)
        .post(`/api/ai/transactions/${tx._id}/classify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.classification.suggestedCategory).toBe('Food & Dining');
      expect(res.body.data.classification.status).toBe('SUGGESTED');
    });
  });
});
