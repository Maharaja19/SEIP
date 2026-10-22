const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/user');
const Student = require('../models/student');

describe('Student Management Endpoints', () => {
  let adminUser;
  let studentUser;
  let adminToken;
  let studentToken;
  let testStudent;

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
  });

  describe('POST /api/students', () => {
    it('should create student successfully by admin', async () => {
      const studentData = {
        fullName: 'New Student',
        registerNumber: '21CSE003',
        dob: '2000-01-01',
        gender: 'Female',
        department: 'CSE',
        year: 'III',
        email: 'new@student.com',
        phoneNumber: '9876543211',
        address: 'New Address'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(studentData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Student created successfully');
      expect(response.body.student.fullName).toBe(studentData.fullName);
    });

    it('should reject student creation by student', async () => {
      const studentData = {
        fullName: 'New Student',
        registerNumber: '21CSE003',
        dob: '2000-01-01',
        gender: 'Female',
        department: 'CSE',
        year: 'III',
        email: 'new@student.com',
        phoneNumber: '9876543211',
        address: 'New Address'
      };

      const response = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(studentData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/students', () => {
    it('should get all students successfully', async () => {
      const response = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.students)).toBe(true);
      expect(response.body.students.length).toBeGreaterThanOrEqual(1);
    });

    it('should paginate students correctly', async () => {
      // Create additional students for pagination test
      for (let i = 1; i <= 5; i++) {
        const student = new Student({
          fullName: `Student ${i}`,
          registerNumber: `21CSE${100 + i}`,
          dob: new Date('2000-01-01'),
          gender: 'Male',
          department: 'CSE',
          year: 'III',
          email: `student${i}@student.com`,
          phoneNumber: `987654321${i}`,
          address: `Address ${i}`,
          organization: global.TEST_ORG_ID
        });
        await student.save();
      }

      const response = await request(app)
        .get('/api/students?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.students.length).toBe(3);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalStudents).toBe(6); // 1 existing + 5 new
    });
  });

  describe('GET /api/students/:regNo', () => {
    it('should get student by register number successfully', async () => {
      const response = await request(app)
        .get(`/api/students/${testStudent.registerNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.registerNumber).toBe(testStudent.registerNumber);
      expect(response.body.fullName).toBe(testStudent.fullName);
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .get('/api/students/NONEXISTENT')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Student not found');
    });
  });

  describe('PUT /api/students/:regNo', () => {
    it('should update student successfully by admin', async () => {
      const updateData = {
        address: 'Updated Address',
        phoneNumber: '9999999999'
      };

      const response = await request(app)
        .put(`/api/students/${testStudent.registerNumber}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Student updated successfully');
      expect(response.body.student.address).toBe(updateData.address);
      expect(response.body.student.phoneNumber).toBe(updateData.phoneNumber);
    });

    it('should reject student update by student for another student', async () => {
      const updateData = {
        address: 'Updated Address'
      };

      const response = await request(app)
        .put(`/api/students/${testStudent.registerNumber}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('DELETE /api/students/:regNo', () => {
    it('should delete student successfully by admin', async () => {
      const response = await request(app)
        .delete(`/api/students/${testStudent.registerNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Student deleted successfully');
    });

    it('should reject student deletion by student', async () => {
      const response = await request(app)
        .delete(`/api/students/${testStudent.registerNumber}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});