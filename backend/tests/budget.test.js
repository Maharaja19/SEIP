const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/user');
const Budget = require('../models/budget');

describe('Budget Management Endpoints', () => {
  let treasurerUser;
  let adminUser;
  let studentUser;
  let treasurerToken;
  let adminToken;
  let studentToken;
  let testBudget;

  beforeEach(async () => {
    // Create test treasurer
    const hashedPassword = await bcrypt.hash('password123', 12);
    treasurerUser = new User({
      ...global.createTestUser({ 
        role: 'Treasurer',
        registerNumber: 'T001',
        name: 'Test Treasurer'
      }),
      password: hashedPassword
    });
    await treasurerUser.save();
    treasurerToken = global.createTestToken(treasurerUser);

    // Create test admin
    adminUser = new User({
      ...global.createTestUser({ 
        role: 'Admin',
        registerNumber: 'A001',
        name: 'Test Admin'
      }),
      password: hashedPassword
    });
    await adminUser.save();
    adminToken = global.createTestToken(adminUser);

    // Create test student
    studentUser = new User({
      ...global.createTestUser({
        registerNumber: '21CSE002',
        name: 'Test Student'
      }),
      password: hashedPassword
    });
    await studentUser.save();
    studentToken = global.createTestToken(studentUser);

    // Create test budget
    testBudget = new Budget({
      title: 'Test Budget',
      description: 'Test budget for testing',
      total_budget: 10000,
      spent: 2000,
      remaining: 8000,
      expenses: [
        { item: 'Test Expense 1', amount: 1000 },
        { item: 'Test Expense 2', amount: 1000 }
      ],
      status: 'approved',
      proposedBy: treasurerUser._id,
      organization: global.TEST_ORG_ID
    });
    await testBudget.save();
  });

  describe('POST /api/budgets', () => {
    it('should create budget successfully by treasurer', async () => {
      const budgetData = {
        title: 'New Budget',
        description: 'New budget for testing',
        total_budget: 15000,
        expenses: [
          { item: 'New Expense 1', amount: 5000 },
          { item: 'New Expense 2', amount: 3000 }
        ]
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(budgetData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(budgetData.title);
      expect(response.body.total_budget).toBe(budgetData.total_budget);
      expect(response.body.spent).toBe(8000); // 5000 + 3000
      expect(response.body.remaining).toBe(7000); // 15000 - 8000
    });

    it('should reject budget creation by student', async () => {
      const budgetData = {
        title: 'New Budget',
        description: 'New budget for testing',
        total_budget: 15000,
        expenses: [
          { item: 'New Expense 1', amount: 5000 },
          { item: 'New Expense 2', amount: 3000 }
        ]
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(budgetData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/budgets', () => {
    it('should get all budgets successfully', async () => {
      const response = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should get current budget successfully', async () => {
      const response = await request(app)
        .get('/api/budgets/current')
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(testBudget.title);
    });
  });

  describe('GET /api/budgets/:id', () => {
    it('should get budget by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/budgets/${testBudget._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(testBudget._id.toString());
      expect(response.body.title).toBe(testBudget.title);
    });

    it('should return 404 for non-existent budget', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      const response = await request(app)
        .get(`/api/budgets/${fakeId}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Budget not found');
    });
  });

  describe('PUT /api/budgets/:id', () => {
    it('should update budget successfully by treasurer', async () => {
      const updateData = {
        title: 'Updated Budget',
        total_budget: 12000
      };

      const response = await request(app)
        .put(`/api/budgets/${testBudget._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.total_budget).toBe(updateData.total_budget);
    });

    it('should reject budget update by student', async () => {
      const updateData = {
        title: 'Updated Budget'
      };

      const response = await request(app)
        .put(`/api/budgets/${testBudget._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('PUT /api/budgets/:id/status', () => {
    it('should approve budget successfully by admin', async () => {
      const statusData = {
        status: 'Approved',
        approvedBy: adminUser._id
      };

      const response = await request(app)
        .put(`/api/budgets/${testBudget._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(statusData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('approved');
    });

    it('should reject budget by treasurer', async () => {
      const statusData = {
        status: 'Rejected',
        approvedBy: treasurerUser._id
      };

      const response = await request(app)
        .put(`/api/budgets/${testBudget._id}/status`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(statusData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('rejected');
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    it('should delete budget successfully by treasurer', async () => {
      const response = await request(app)
        .delete(`/api/budgets/${testBudget._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Budget deleted');
    });

    it('should reject budget deletion by student', async () => {
      const response = await request(app)
        .delete(`/api/budgets/${testBudget._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});