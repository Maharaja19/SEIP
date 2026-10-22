const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Connection pool options
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 10,
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 5,
      maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS) || 30000,
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
      // Retry options
      retryWrites: true,
      retryReads: true
    });
    console.log("✅ MongoDB connected with pooling");
    console.log(`📊 Connection pool: max=${mongoose.connection.readyState === 1 ? mongoose.connection.client.s.options.maxPoolSize : 'N/A'}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
