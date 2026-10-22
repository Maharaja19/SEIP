const mongoose = require('mongoose');
require('dotenv').config();

// Setup test database connection
beforeAll(async () => {
  // Disconnect any active connections (e.g. from server.js import)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // Use test database
  const testDbUri = process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/budget_management_test';
  await mongoose.connect(testDbUri);
});

// Clean up before and after each test
const cleanDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const collections = await mongoose.connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    } catch (err) {
      console.error("Error cleaning database:", err);
    }
  }
};

beforeEach(async () => {
  await cleanDatabase();
});

afterEach(async () => {
  await cleanDatabase();
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Global test utilities
global.TEST_ORG_ID = '609366b51e2049fdea66c98c';

global.createTestUser = (overrides = {}) => {
  const randomId = Math.floor(Math.random() * 100000) + 1;
  return {
    sNo: randomId,
    name: 'Test User',
    email: overrides.email || `test_${randomId}@example.com`,
    registerNumber: overrides.registerNumber || `123456TUEE${String(randomId).padStart(3, '0').slice(-3)}`,
    dob: new Date('2000-01-01'),
    contactNo: '9876543210',
    role: 'Student',
    password: 'password123',
    organizationId: global.TEST_ORG_ID,
    ...overrides
  };
};

global.createTestToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: '1h' }
  );
};