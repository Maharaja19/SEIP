const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/user');

describe('User Management Endpoints', () => {
  let adminUser;
  let studentUser;
  let treasurerUser;
  let adminToken;
  let studentToken;
  let treasurerToken;

  beforeEach(async () => {
    // Create test admin
    const hashedPassword = await bcrypt.hash('password123', 12);
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
  });

  describe('POST /api/users', () => {
    it('should create user successfully by admin', async () => {
      const userData = {
        sNo: 2,
        name: 'New User',
        registerNumber: '21CSE003',
        email: 'newuser@test.com',
        contactNo: '9876543211',
        role: 'Student',
        password: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.registerNumber).toBe(userData.registerNumber);
    });

    it('should reject user creation by student', async () => {
      const userData = {
        sNo: 2,
        name: 'New User',
        registerNumber: '21CSE003',
        email: 'newuser@test.com',
        contactNo: '9876543211',
        role: 'Student',
        password: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/users', () => {
    it('should get all users successfully by admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // admin, student, treasurer
    });

    it('should reject getting all users by student', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/users/${studentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(studentUser._id.toString());
      expect(response.body.name).toBe(studentUser.name);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /api/users/me', () => {
    it('should get current user profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe(studentUser.name);
      expect(response.body.user.registerNumber).toBe(studentUser.registerNumber);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should reject getting profile without token', async () => {
      const response = await request(app)
        .get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not authenticated');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user successfully by admin', async () => {
      const updateData = {
        name: 'Updated Student Name',
        email: 'updated@test.com'
      };

      const response = await request(app)
        .put(`/api/users/${studentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.email).toBe(updateData.email);
    });

    it('should allow user to update their own profile', async () => {
      const updateData = {
        name: 'Self Updated Name',
        email: 'selfupdated@test.com'
      };

      const response = await request(app)
        .put(`/api/users/${studentUser._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.email).toBe(updateData.email);
    });

    it('should reject updating another user by student', async () => {
      const updateData = {
        name: 'Hacker Attempt'
      };

      const response = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('PUT /api/users/:id/change-password', () => {
    it('should change password successfully with correct current password', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      };

      const response = await request(app)
        .put(`/api/users/${studentUser._id}/change-password`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject password change with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456'
      };

      const response = await request(app)
        .put(`/api/users/${studentUser._id}/change-password`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(passwordData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Current password is incorrect');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user successfully by admin', async () => {
      // Create a user to delete
      const deleteUser = new User({
        ...global.createTestUser({
          registerNumber: '21CSE004',
          name: 'Delete User'
        }),
        password: await bcrypt.hash('password123', 12)
      });
      await deleteUser.save();

      const response = await request(app)
        .delete(`/api/users/${deleteUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should reject user deletion by student', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 for non-existent user deletion', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });
});