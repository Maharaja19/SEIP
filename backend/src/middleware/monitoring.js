const os = require('os');
const mongoose = require('mongoose');

// System metrics collection
class SystemMonitor {
  static getSystemMetrics() {
    return {
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      cpu: {
        cores: os.cpus().length,
        architecture: os.arch(),
        platform: os.platform(),
        loadAverage: os.loadavg()
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      },
      timestamp: new Date().toISOString()
    };
  }

  static async getDatabaseMetrics() {
    try {
      const db = mongoose.connection.db;
      const admin = db.admin();
      
      // Get database stats
      const dbStats = await db.stats();
      
      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = {};
      
      for (const collection of collections) {
        try {
          const stats = await db.collection(collection.name).stats();
          collectionStats[collection.name] = {
            documents: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            indexes: stats.nindexes
          };
        } catch (error) {
          collectionStats[collection.name] = { error: error.message };
        }
      }

      return {
        connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        database: dbStats.db,
        collections: Object.keys(collectionStats).length,
        totalSize: dbStats.dataSize,
        totalDocuments: dbStats.objects,
        indexes: dbStats.indexes,
        collectionDetails: collectionStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connection: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  static getApplicationMetrics() {
    const memoryUsage = process.memoryUsage();
    
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        heapUsagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2)
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Log slow requests (>1000ms)
    if (duration > 1000) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
    
    // Add performance headers
    res.set('X-Response-Time', `${duration}ms`);
    res.set('X-Request-ID', req.id || 'unknown');
    
    originalEnd.apply(res, args);
  };
  
  next();
};

// Request ID middleware
const requestIdMiddleware = (req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.set('X-Request-ID', req.id);
  next();
};

// Health check endpoint handler
const healthCheck = async (req, res) => {
  try {
    const [systemMetrics, dbMetrics, appMetrics] = await Promise.all([
      SystemMonitor.getSystemMetrics(),
      SystemMonitor.getDatabaseMetrics(),
      SystemMonitor.getApplicationMetrics()
    ]);

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      system: systemMetrics,
      database: dbMetrics,
      application: appMetrics,
      checks: {
        database: dbMetrics.connection === 'connected',
        memory: parseFloat(systemMetrics.memory.usage) < 90,
        disk: true // Could add disk space check here
      }
    };

    // Determine overall health status
    const allChecksPass = Object.values(healthStatus.checks).every(check => check === true);
    healthStatus.status = allChecksPass ? 'healthy' : 'unhealthy';
    
    const statusCode = allChecksPass ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

// Metrics endpoint handler
const metricsEndpoint = async (req, res) => {
  try {
    const metrics = await SystemMonitor.getDatabaseMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  SystemMonitor,
  performanceMonitor,
  requestIdMiddleware,
  healthCheck,
  metricsEndpoint
};