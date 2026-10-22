const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/user');

describe('Authentication Endpoints', () => {
  describe('POST /api/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user with hashed password
      const hashedPassword = await bcrypt.hash('password123', 12);
      testUser = new User({
        ...global.createTestUser({ registerNumber: '21CSE001' }),
        password: hashedPassword
      });
      await testUser.save();
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          role: 'Student',
          registerNumber: '21CSE001',
          dob: '1-1-2000',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          role: 'Student',
          registerNumber: '21CSE001',
          dob: '1-1-2000',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Wrong password');
    });

    it('should fail with invalid DOB', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          role: 'Student',
          registerNumber: '21CSE001',
          dob: '1-1-1999',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Wrong DOB');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          role: 'Student',
          registerNumber: '21CSE999',
          dob: '1-1-2000',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should be rate limited after too many attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/login')
          .send({
            role: 'Student',
            registerNumber: '21CSE001',
            dob: '1-1-2000',
            password: 'wrongpassword'
          });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/api/login')
        .send({
          role: 'Student',
          registerNumber: '21CSE001',
          dob: '1-1-2000',
          password: 'password123'
        });

      expect(response.status).toBe(429);
    });
  });

  describe('Protected Routes', () => {
    let testUser;
    let token;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      testUser = new User({
        ...global.createTestUser({ role: 'Admin' }),
        password: hashedPassword
      });
      await testUser.save();
      token = global.createTestToken(testUser);
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
});