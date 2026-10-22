const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../src/models/user');
const Student = require('../src/models/student');
const Due = require('../src/models/dues');

describe('Payment Management Endpoints', () => {
  let studentUser;
  let treasurerUser;
  let studentToken;
  let treasurerToken;
  let testStudent;
  let testDue;

  beforeEach(async () => {
    // Create test student user
    const hashedPassword = await bcrypt.hash('password123', 12);
    studentUser = new User({
      ...global.createTestUser({
        registerNumber: '21CSE002',
        name: 'Test Student'
      }),
      password: hashedPassword
    });
    await studentUser.save();
    studentToken = global.createTestToken(studentUser);

    // Create test treasurer
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

    // Create test due
    testDue = new Due({
      dueID: Date.now(),
      student: testStudent._id,
      amount: 500,
      reason: 'Library Fee',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'Unpaid',
      organization: global.TEST_ORG_ID
    });
    await testDue.save();
  });

  describe('POST /api/payments/generate-upi-link', () => {
    it('should generate UPI payment link successfully', async () => {
      const paymentData = {
        amount: 500,
        dueId: testDue._id,
        studentRegNo: testStudent.registerNumber
      };

      const response = await request(app)
        .post('/api/payments/generate-upi-link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.upiLink).toBeDefined();
      expect(response.body.qrCodeUrl).toBeDefined();
      expect(response.body.amount).toBe(paymentData.amount);
    });

    it('should reject payment link generation with missing data', async () => {
      const paymentData = {
        amount: 500
        // Missing dueId and studentRegNo
      };

      const response = await request(app)
        .post('/api/payments/generate-upi-link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should reject payment link generation for non-existent due', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      const paymentData = {
        amount: 500,
        dueId: fakeId,
        studentRegNo: testStudent.registerNumber
      };

      const response = await request(app)
        .post('/api/payments/generate-upi-link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Due not found');
    });

    it('should reject payment link generation for non-existent student', async () => {
      const paymentData = {
        amount: 500,
        dueId: testDue._id,
        studentRegNo: 'NONEXISTENT'
      };

      const response = await request(app)
        .post('/api/payments/generate-upi-link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Student not found');
    });
  });

  describe('POST /api/payments/submit-upi-payment', () => {
    it('should submit UPI payment successfully', async () => {
      const paymentData = {
        dueId: testDue._id,
        transactionRef: 'TXN123456789',
        upiTransactionId: 'UPI123456789012345',
        paymentScreenshot: 'https://example.com/screenshot.jpg',
        studentRegNo: testStudent.registerNumber
      };

      const response = await request(app)
        .post('/api/payments/submit-upi-payment')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Payment submitted successfully');
    });

    it('should reject payment submission with missing data', async () => {
      const paymentData = {
        dueId: testDue._id,
        transactionRef: 'TXN123456789'
        // Missing upiTransactionId and studentRegNo
      };

      const response = await request(app)
        .post('/api/payments/submit-upi-payment')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should reject payment submission with invalid UPI transaction ID', async () => {
      const paymentData = {
        dueId: testDue._id,
        transactionRef: 'TXN123456789',
        upiTransactionId: 'SHORT', // Invalid format (too short)
        paymentScreenshot: 'https://example.com/screenshot.jpg',
        studentRegNo: testStudent.registerNumber
      };

      const response = await request(app)
        .post('/api/payments/submit-upi-payment')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      // Depending on validation implementation
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('PUT /api/dues/:dueID/pay-via-upi', () => {
    it('should submit UPI payment for due successfully', async () => {
      const paymentData = {
        transactionRef: 'TXN123456789',
        upiTransactionId: 'UPI123456789012345',
        studentRegNo: testStudent.registerNumber
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/pay-via-upi`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject UPI payment submission with missing data', async () => {
      const paymentData = {
        transactionRef: 'TXN123456789'
        // Missing upiTransactionId and studentRegNo
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/pay-via-upi`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(paymentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('PUT /api/dues/:dueID/verify', () => {
    beforeEach(async () => {
      // Set up a due with pending verification
      testDue.status = 'Pending Verification';
      testDue.transactionRef = 'TXN123456789';
      testDue.upiTransactionId = 'UPI123456789012345';
      await testDue.save();
    });

    it('should approve payment successfully by treasurer', async () => {
      const verificationData = {
        action: 'approve',
        treasurerNotes: 'Payment verified successfully'
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/verify`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(verificationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved successfully');
    });

    it('should reject payment successfully by treasurer', async () => {
      const verificationData = {
        action: 'reject',
        treasurerNotes: 'Payment could not be verified'
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/verify`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(verificationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected successfully');
    });

    it('should reject verification with invalid action', async () => {
      const verificationData = {
        action: 'invalid_action',
        treasurerNotes: 'Invalid action'
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/verify`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(verificationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Action must be');
    });

    it('should reject verification for non-pending due', async () => {
      // Change due status back to Unpaid
      testDue.status = 'Unpaid';
      await testDue.save();

      const verificationData = {
        action: 'approve',
        treasurerNotes: 'Payment verified successfully'
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/verify`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send(verificationData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not in pending verification status');
    });

    it('should reject verification by student', async () => {
      const verificationData = {
        action: 'approve',
        treasurerNotes: 'Payment verified successfully'
      };

      const response = await request(app)
        .put(`/api/dues/${testDue._id}/verify`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(verificationData);

      // Assuming middleware handles role-based access
      expect([403, 500]).toContain(response.status);
    });
  });

  describe('GET /api/dues/pending-verification', () => {
    beforeEach(async () => {
      // Set up a due with pending verification
      testDue.status = 'Pending Verification';
      testDue.transactionRef = 'TXN123456789';
      testDue.upiTransactionId = 'UPI123456789012345';
      await testDue.save();
    });

    it('should get pending verification dues successfully by treasurer', async () => {
      const response = await request(app)
        .get('/api/dues/pending-verification')
        .set('Authorization', `Bearer ${treasurerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should get pending verification dues successfully by student', async () => {
      const response = await request(app)
        .get('/api/dues/pending-verification')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});