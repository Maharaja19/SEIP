/**
 * Environment variable validation
 * Ensures all required environment variables are present before server startup
 */

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'FRONTEND_URL'
];

const optionalEnvVars = {
  'PORT': '5000',
  'NODE_ENV': 'development',
  'ALLOWED_ORIGINS': null,
  'JWT_EXPIRES_IN': '7d',
  'RATE_LIMIT_WINDOW_MS': '900000', // 15 minutes
  'RATE_LIMIT_MAX_REQUESTS': '500',
  'AUTH_RATE_LIMIT_MAX': '10',
  'MONGO_MAX_POOL_SIZE': '10',
  'MONGO_MIN_POOL_SIZE': '5'
};

const validateEnvironmentVariables = () => {
  const missing = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional variables and set defaults
  Object.entries(optionalEnvVars).forEach(([varName, defaultValue]) => {
    if (!process.env[varName]) {
      if (defaultValue !== null) {
        process.env[varName] = defaultValue;
        warnings.push(`${varName} not set, using default: ${defaultValue}`);
      }
    }
  });

  // Print warnings for optional variables with defaults
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('\n⚠️  Environment variable warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.log('');
  }

  // Exit if required variables are missing
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your .env file before starting the server.\n');
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ All required environment variables are set');
  }
};

module.exports = validateEnvironmentVariables;

