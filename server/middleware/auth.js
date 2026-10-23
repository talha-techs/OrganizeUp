const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check query param (allows streaming media & PDF range requests)
    else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized, no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

// Optional protect - verifies JWT if provided, but does not block unauthenticated requests
const optionalProtect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check query param (allows streaming media & PDF range requests)
    else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    }
    next();
  } catch (error) {
    // For optional routes, proceed unauthenticated rather than blocking
    next();
  }
};

// Strict Admin Middleware
// 1. Reloads user fresh from DB on every request (never trusting client claim or stale JWT payload)
// 2. Requires role === 'admin' AND email === ADMIN_EMAIL (case-insensitive)
// 3. Returns 404 to non-admins so the route existence is completely concealed
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    // Always fetch fresh user state from the database
    const freshUser = await User.findById(req.user._id).select("role email");
    if (!freshUser) {
      return res.status(404).json({ message: "Route not found" });
    }

    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
    const userEmail = freshUser.email ? freshUser.email.trim().toLowerCase() : "";

    const isRoleAdmin = freshUser.role === "admin";
    const isEmailAdmin = Boolean(adminEmail && userEmail === adminEmail);

    if (!isRoleAdmin || !isEmailAdmin) {
      // Non-admins get 404 to avoid leaking existence of admin endpoints
      return res.status(404).json({ message: "Route not found" });
    }

    // Attach verified user info
    req.user.role = freshUser.role;
    req.user.email = freshUser.email;
    next();
  } catch (error) {
    console.error("requireAdmin error:", error.message);
    return res.status(404).json({ message: "Route not found" });
  }
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

module.exports = {
  protect,
  optionalProtect,
  requireAdmin,
  adminOnly: requireAdmin,
  generateToken,
};

