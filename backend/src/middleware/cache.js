const NodeCache = require("node-cache");
const redis = require("redis");

// Create in-memory fallback cache
const localCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
let redisClient = null;
let useRedis = false;

if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  
  redisClient.on("error", (err) => {
    console.error("Redis client error:", err);
    useRedis = false;
  });

  redisClient.on("connect", () => {
    console.log("Connected to Redis successfully");
    useRedis = true;
  });

  redisClient.connect().catch(err => {
    console.warn("Failed to connect to Redis. Falling back to local memory cache.", err.message);
    useRedis = false;
  });
}

const cacheMiddleware = async (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  // Make cache key tenant & user role aware to prevent cross-tenant or role-based cache leaks
  const orgPart = req.organizationId ? `org:${req.organizationId}` : 'org:global';
  const rolePart = req.user && req.user.role ? `role:${req.user.role}` : 'role:anonymous';
  const urlPart = req.originalUrl || req.url;
  const key = `seip:cache:${orgPart}:${rolePart}:${urlPart}`;
  
  try {
    if (useRedis && redisClient && redisClient.isOpen) {
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`[Cache] Redis hit for ${key}`);
        return res.json(JSON.parse(cached));
      }
    } else {
      const cached = localCache.get(key);
      if (cached) {
        console.log(`[Cache] Local memory hit for ${key}`);
        return res.json(cached);
      }
    }
  } catch (err) {
    console.error("Cache read error:", err);
  }
  
  // Intercept json response to cache it
  const originalJson = res.json;
  res.json = function(body) {
    try {
      if (useRedis && redisClient && redisClient.isOpen) {
        redisClient.setEx(key, 600, JSON.stringify(body));
        console.log(`[Cache] Redis set for ${key}`);
      } else {
        localCache.set(key, body);
        console.log(`[Cache] Local memory set for ${key}`);
      }
    } catch (err) {
      console.error("Cache write error:", err);
    }
    originalJson.call(this, body);
  };
  
  next();
};

const clearCache = async (key) => {
  try {
    if (useRedis && redisClient && redisClient.isOpen) {
      if (key) {
        const keys = await redisClient.keys(`seip:cache:*:${key}`);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } else {
        const keys = await redisClient.keys("seip:cache:*");
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }
      console.log("[Cache] Redis cache cleared");
    } else {
      if (key) {
        localCache.del(key);
      } else {
        localCache.flushAll();
      }
      console.log("[Cache] Local memory cache cleared");
    }
  } catch (err) {
    console.error("Cache clear error:", err);
  }
};

module.exports = { cacheMiddleware, clearCache, cache: localCache };