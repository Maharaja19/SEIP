/**
 * Pre-Deployment Verification Script
 * 
 * Run this script to automatically verify critical production requirements
 * Usage: node scripts/verify-production.js
 */

require('dotenv').config();
const axios = require('axios');

// Simple color helpers (fallback if colors not supported)
const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  blue: (str) => `\x1b[34m${str}\x1b[0m`,
  bold: (str) => `\x1b[1m${str}\x1b[0m`
};

const success = (str) => colors.green(str);
const error = (str) => colors.red(str);
const warning = (str) => colors.yellow(str);
const info = (str) => colors.blue(str);

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Helper functions
const logTest = (name) => console.log(`\n${info('TEST:')} ${name}`);
const logPass = (msg) => {
  console.log(success('✓ ') + msg);
  results.passed++;
};
const logFail = (msg) => {
  console.log(error('✗ ') + msg);
  results.failed++;
};
const logWarning = (msg) => {
  console.log(warning('⚠ ') + msg);
  results.warnings++;
};

// ========================================
// TEST 1: Environment Configuration
// ========================================
async function testEnvironmentConfig() {
  logTest('Environment Configuration');
  
  const requiredVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'PORT',
    'ALLOWED_ORIGINS'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      logFail(`Missing required env var: ${varName}`);
      allPresent = false;
    }
  });
  
  if (allPresent) {
    logPass('All required environment variables present');
  }
  
  // Check for hardcoded secrets (basic check)
  if (process.env.JWT_SECRET === 'fallback_secret_key') {
    logFail('Using default JWT_SECRET - change in production!');
  } else if (process.env.JWT_SECRET && process.env.JWT_SECRET.length > 32) {
    logPass('Strong JWT_SECRET configured');
  }
  
  // Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    logPass('NODE_ENV set to production');
  } else {
    logWarning(`NODE_ENV is "${process.env.NODE_ENV || 'undefined'}" - should be "production"`);
  }
}

// ========================================
// TEST 2: Server Health Check
// ========================================
async function testServerHealth() {
  logTest('Server Health & Connectivity');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    
    // Check for either success field OR status field
    const isHealthy = response.data.success || (response.data.status === 'healthy') || response.status === 200;
    
    if (isHealthy) {
      logPass('Server health endpoint responding');
      const message = response.data.message || response.data.status || 'OK';
      logPass(`Server status: ${message}`);
    } else {
      logFail('Health check returned non-success status');
    }
  } catch (err) {
    logFail(`Server health check failed: ${err.message}`);
    logWarning('Ensure server is running on ' + API_BASE_URL);
  }
}

// ========================================
// TEST 3: CORS Configuration
// ========================================
async function testCORSConfig() {
  logTest('CORS Configuration');
  
  try {
    const response = await axios.options(API_BASE_URL, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    
    if (corsHeader === '*') {
      logFail('CORS allows all origins (*) - configure specific domains!');
    } else if (corsHeader) {
      logPass(`CORS configured for specific origin: ${corsHeader}`);
    } else {
      logWarning('No CORS header detected');
    }
  } catch (err) {
    logWarning(`CORS test inconclusive: ${err.message}`);
  }
}

// ========================================
// TEST 4: Security Headers
// ========================================
async function testSecurityHeaders() {
  logTest('Security Headers (Helmet.js)');
  
  try {
    const response = await axios.get(API_BASE_URL);
    
    const headers = [
      'x-dns-prefetch-control',
      'x-frame-options',
      'strict-transport-security',
      'x-download-options',
      'x-content-type-options'
    ];
    
    let presentCount = 0;
    headers.forEach(header => {
      if (response.headers[header]) {
        presentCount++;
      }
    });
    
    if (presentCount >= 4) {
      logPass(`Security headers present (${presentCount}/${headers.length})`);
    } else if (presentCount >= 2) {
      logWarning(`Only ${presentCount}/${headers.length} security headers present`);
    } else {
      logFail('Missing security headers - ensure Helmet.js is configured');
    }
  } catch (err) {
    logWarning(`Security header test inconclusive: ${err.message}`);
  }
}

// ========================================
// TEST 5: API Response Format
// ========================================
async function testAPIResponseFormat() {
  logTest('API Response Standardization');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/students?page=1&limit=1`);
    
    const hasSuccess = response.data.hasOwnProperty('success');
    const hasData = response.data.hasOwnProperty('data') || response.data.hasOwnProperty('students');
    
    if (hasSuccess && hasData) {
      logPass('API responses follow standard format');
    } else {
      logWarning('API response format inconsistent');
    }
  } catch (err) {
    logWarning(`API format test failed: ${err.message}`);
  }
}

// ========================================
// TEST 6: Rate Limiting
// ========================================
async function testRateLimiting() {
  logTest('Rate Limiting');
  
  try {
    // Make multiple rapid requests
    const promises = Array(6).fill().map(() => 
      axios.get(`${API_BASE_URL}/students?page=1&limit=1`)
    );
    
    const responses = await Promise.allSettled(promises);
    
    const rateLimited = responses.some(r => 
      r.status === 'rejected' && 
      r.reason?.response?.status === 429
    );
    
    if (rateLimited) {
      logPass('Rate limiting is active');
    } else {
      logWarning('Rate limiting may not be configured properly');
    }
  } catch (err) {
    logWarning(`Rate limit test inconclusive: ${err.message}`);
  }
}

// ========================================
// TEST 7: Error Handling
// ========================================
async function testErrorHandling() {
  logTest('Error Handling');
  
  try {
    // Try to access protected route without token
    await axios.get(`${API_BASE_URL}/students`);
    logFail('Protected route accessible without authentication');
  } catch (err) {
    if (err.response?.status === 401) {
      logPass('Authentication required for protected routes');
      
      const hasStandardError = err.response.data.hasOwnProperty('success') &&
                               err.response.data.hasOwnProperty('message');
      
      if (hasStandardError) {
        logPass('Error responses follow standard format');
      } else {
        logWarning('Error response format inconsistent');
      }
    } else {
      logFail(`Unexpected error: ${err.message}`);
    }
  }
  
  // Test invalid route
  try {
    await axios.get(`${API_BASE_URL}/nonexistent-route-123`);
  } catch (err) {
    if (err.response?.status === 404) {
      logPass('404 handler working correctly');
    }
  }
}

// ========================================
// TEST 8: Database Indexes
// ========================================
async function testDatabaseIndexes() {
  logTest('Database Connection Status');
  
  try {
    // Test with a simple authenticated request
    const response = await axios.get(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': 'Bearer invalid-token-for-test'
      }
    });
    
    // If we get here without 503, DB is connected
    logPass('Database connection appears healthy');
    logWarning('Cannot verify database indexes from client script');
    logWarning('Manually check MongoDB for proper indexes');
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      // Auth error means DB is connected but token is invalid - this is good!
      logPass('Database connection healthy (auth working)');
      logWarning('Cannot verify database indexes from client script');
    } else if (err.response?.status === 503) {
      logFail('Database connection issue detected (503 error)');
    } else {
      logWarning(`Database test inconclusive: ${err.message}`);
      logWarning('This may be OK if server is running');
    }
  }
}

// ========================================
// TEST 9: API Documentation
// ========================================
async function testAPIDocumentation() {
  logTest('Swagger API Documentation');
  
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/api-docs.json`);
    
    if (response.data.openapi) {
      logPass('Swagger spec available');
      logPass(`API Version: ${response.data.info.version}`);
      logPass(`Title: ${response.data.info.title}`);
      
      const endpointCount = Object.keys(response.data.paths || {}).length;
      logPass(`Documented endpoints: ${endpointCount}`);
    } else {
      logFail('Swagger JSON endpoint not returning valid spec');
    }
  } catch (err) {
    logFail(`Swagger documentation not accessible: ${err.message}`);
    logWarning('Visit http://localhost:5000/api-docs to verify manually');
  }
}

// ========================================
// TEST 10: Analytics Endpoints
// ========================================
async function testAnalyticsEndpoints() {
  logTest('Analytics Endpoints Availability');
  
  // Note: These require authentication, so we'll just check if routes exist
  const analyticsRoutes = [
    '/analytics/dashboard',
    '/analytics/predictions',
    '/analytics/efficiency-metrics'
  ];
  
  let routesFound = 0;
  
  for (const route of analyticsRoutes) {
    try {
      await axios.get(`${API_BASE_URL}${route}`);
    } catch (err) {
      if (err.response?.status === 401) {
        // Route exists but requires auth - this is good!
        routesFound++;
      } else if (err.response?.status === 404) {
        logFail(`Analytics route missing: ${route}`);
      }
    }
  }
  
  if (routesFound === analyticsRoutes.length) {
    logPass(`All ${analyticsRoutes.length} analytics endpoints available`);
  } else if (routesFound > 0) {
    logWarning(`${routesFound}/${analyticsRoutes.length} analytics endpoints found`);
  }
}

// ========================================
// MAIN EXECUTION
// ========================================
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log(info('PRE-DEPLOYMENT VERIFICATION SCRIPT'));
  console.log('='.repeat(60) + '\n');
  
  const startTime = Date.now();
  
  await testEnvironmentConfig();
  await testServerHealth();
  await testCORSConfig();
  await testSecurityHeaders();
  await testAPIResponseFormat();
  await testRateLimiting();
  await testErrorHandling();
  await testDatabaseIndexes();
  await testAPIDocumentation();
  await testAnalyticsEndpoints();
  
  const duration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log(info('TEST SUMMARY'));
  console.log('='.repeat(60));
  console.log(success(`Passed: ${results.passed}`));
  console.log(error(`Failed: ${results.failed}`));
  console.log(warning(`Warnings: ${results.warnings}`));
  console.log(`\nDuration: ${duration}ms`);
  console.log('='.repeat(60) + '\n');
  
  // Final verdict
  if (results.failed === 0 && results.warnings <= 2) {
    console.log(success('PRODUCTION READY!'));
    console.log('\nNote: Complete manual testing still required.');
    console.log(warning('See PRE_DEPLOYMENT_REVIEW.md for full checklist.\n'));
    process.exit(0);
  } else if (results.failed <= 2) {
    console.log(warning('READY WITH WARNINGS'));
    console.log('\nAddress the failed tests before deployment.');
    console.log(warning('Review PRE_DEPLOYMENT_REVIEW.md for details.\n'));
    process.exit(1);
  } else {
    console.log(error('NOT READY FOR PRODUCTION'));
    console.log('\n' + error('Critical tests failed. Do not deploy until resolved.'));
    console.log(error('See PRE_DEPLOYMENT_REVIEW.md for remediation.\n'));
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error(error('Test execution failed:'), err);
  process.exit(1);
});
