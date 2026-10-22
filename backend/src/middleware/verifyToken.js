const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { getUserIdFromDecoded } = require("../utils/jwtHelper");

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. No token provided." 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userId = getUserIdFromDecoded(decoded);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token. User not found." 
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token." 
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false, 
        message: "Token expired." 
      });
    }
    
    console.error("Token verification error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error." 
    });
  }
};

module.exports = verifyToken;