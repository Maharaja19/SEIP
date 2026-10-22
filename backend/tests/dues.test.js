const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../src/models/user');
const Due = require('../src/models/dues');

describe('Dues Management Endpoints', () => {
  let treasurerUser;
  let studentUser;
  let treasurerToken;
  let studentToken;

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
  });

  describe('POST /api/dues', () => {
    it('should create due successfully by treasurer', async () => {
      const dueData = {
        studentRegNo: '21CSE002',
        amount: 500,
        reason: 'Lab fee',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      const response = await request(app)
        .post('/api/dues')
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(dueData);

      expect(response.status).toBe(201);
      expect(response.body.studentRegNo).toBe(dueData.studentRegNo);
      expect(response.body.amount).toBe(dueData.amount);
      expect(response.body.status).toBe('pending');
    });

    it('should reject due creation with invalid amount', async () => {
      const dueData = {
        studentRegNo: '21CSE002',
        amount: -100,
        reason: 'Lab fee',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/api/dues')
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(dueData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject due creation by student', async () => {
      const dueData = {
        studentRegNo: '21CSE002',
        amount: 500,
        reason: 'Lab fee',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/api/dues')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(dueData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/dues/:regNo', () => {
    beforeEach(async () => {
      // Create test dues
      const due1 = new Due({
        studentRegNo: '21CSE002',
        amount: 500,
        reason: 'Lab fee',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organization: global.TEST_ORG_ID
      });
      const due2 = new Due({
        studentRegNo: '21CSE002',
        amount: 300,
        reason: 'Library fine',
        status: 'paid',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        organization: global.TEST_ORG_ID
      });
      await due1.save();
      await due2.save();
    });

    it('should get student dues successfully', async () => {
      const response = await request(app)
        .get('/api/dues/21CSE002')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should filter dues by status', async () => {
      const response = await request(app)
        .get('/api/dues/21CSE002?status=pending')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('pending');
    });
  });

  describe('PUT /api/dues/:dueID/pay', () => {
    let testDue;

    beforeEach(async () => {
      testDue = new Due({
        studentRegNo: '21CSE002',
        amount: 500,
        reason: 'Lab fee',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organization: global.TEST_ORG_ID
      });
      await testDue.save();
    });

    it('should mark due as paid successfully', async () => {
      const paymentData = {
        amount: 500,
        transactionRef: 'TXN123456789',
        paymentMethod: 'UPI'
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/pay`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Payment submitted');
    });

    it('should reject payment with incorrect amount', async () => {
      const paymentData = {
        amount: 400, // Less than due amount
        transactionRef: 'TXN123456789',
        paymentMethod: 'UPI'
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/pay`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('incorrect amount');
    });
  });
});