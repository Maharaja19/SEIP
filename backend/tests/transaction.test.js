const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/user');
const Student = require('../models/student');
const Transaction = require('../models/transactions');

describe('Transaction Management Endpoints', () => {
  let treasurerUser;
  let studentUser;
  let treasurerToken;
  let studentToken;
  let testStudent;
  let testTransaction;

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

    // Create test student user
    studentUser = new User({
      ...global.createTestUser({
        registerNumber: '21CSE002',
        name: 'Test Student'
      }),
      password: hashedPassword
    });
    await studentUser.save();
    studentToken = global.createTestToken(studentUser);

    // Create test student record
    testStudent = new Student({
      fullName: 'Test Student',
      registerNumber: '21CSE002',
      dob: new Date('2000-01-01'),
      gender: 'Male',
      department: 'CSE',
      year: 'III',
      email: 'test@student.com',
      phoneNumber: '9876543210',
      address: 'Test Address',
      organization: global.TEST_ORG_ID
    });
    await testStudent.save();

    // Create test transaction
    testTransaction = new Transaction({
      user: studentUser._id,
      student: testStudent._id,
      organization: global.TEST_ORG_ID,
      type: 'expense',
      category: 'food',
      amount: 150,
      description: 'Lunch expense'
    });
    await testTransaction.save();
  });

  describe('POST /api/transactions', () => {
    it('should create transaction successfully', async () => {
      const transactionData = {
        user: studentUser._id,
        student: testStudent._id,
        type: 'income',
        category: 'dues',
        amount: 500,
        description: 'Library dues payment'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(transactionData);

      expect(response.status).toBe(201);
      expect(response.body.type).toBe(transactionData.type);
      expect(response.body.amount).toBe(transactionData.amount);
      expect(response.body.description).toBe(transactionData.description);
    });

    it('should reject transaction creation with invalid amount', async () => {
      const transactionData = {
        user: studentUser._id,
        student: testStudent._id,
        type: 'expense',
        category: 'food',
        amount: -100, // Invalid negative amount
        description: 'Invalid expense'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(transactionData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    it('should get all transactions successfully', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(1);
    });

    it('should paginate transactions correctly', async () => {
      // Create additional transactions for pagination test
      for (let i = 1; i <= 5; i++) {
        const transaction = new Transaction({
          user: studentUser._id,
          student: testStudent._id,
          organization: global.TEST_ORG_ID,
          type: 'expense',
          category: 'misc',
          amount: 100 + i,
          description: `Test expense ${i}`
        });
        await transaction.save();
      }

      const response = await request(app)
        .get('/api/transactions?page=1&limit=3')
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.transactions.length).toBe(3);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalTransactions).toBe(6); // 1 existing + 5 new
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should get transaction by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/transactions/${testTransaction._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(testTransaction._id.toString());
      expect(response.body.amount).toBe(testTransaction.amount);
    });

    it('should return 404 for non-existent transaction', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      const response = await request(app)
        .get(`/api/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Transaction not found');
    });
  });

  describe('GET /api/transactions/user/:identifier', () => {
    it('should get transactions by user ID successfully', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${studentUser._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(1);
    });

    it('should get transactions by register number successfully', async () => {
      const response = await request(app)
        .get(`/api/transactions/user/${testStudent.registerNumber}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should update transaction successfully', async () => {
      const updateData = {
        amount: 200,
        description: 'Updated lunch expense'
      };

      const response = await request(app)
        .put(`/api/transactions/${testTransaction._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(updateData.amount);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should reject transaction update with invalid amount', async () => {
      const updateData = {
        amount: -50 // Invalid negative amount
      };

      const response = await request(app)
        .put(`/api/transactions/${testTransaction._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete transaction successfully', async () => {
      const response = await request(app)
        .delete(`/api/transactions/${testTransaction._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Transaction deleted successfully');
    });

    it('should return 404 for non-existent transaction deletion', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      const response = await request(app)
        .delete(`/api/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Transaction not found');
    });
  });

  describe('GET /api/transactions/summary/:identifier', () => {
    it('should get transaction summary by user ID successfully', async () => {
      // Create additional transactions for summary
      const incomeTransaction = new Transaction({
        user: studentUser._id,
        student: testStudent._id,
        organization: global.TEST_ORG_ID,
        type: 'income',
        category: 'dues',
        amount: 500,
        description: 'Dues payment'
      });
      await incomeTransaction.save();

      const response = await request(app)
        .get(`/api/transactions/summary/${studentUser._id}`)
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalIncome).toBeGreaterThanOrEqual(500);
      expect(response.body.totalExpense).toBeGreaterThanOrEqual(150);
      expect(response.body.totalTransactions).toBeGreaterThanOrEqual(2);
    });
  });
});