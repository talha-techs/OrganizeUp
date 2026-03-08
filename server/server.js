require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const path = require("path");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const passport = require("./config/passport");

// Import routes
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");
const courseRoutes = require("./routes/courses");
const toolRoutes = require("./routes/tools");
const adminRoutes = require("./routes/admin");
const socialRoutes = require("./routes/social");
const exploreRoutes = require("./routes/explore");
const libraryRoutes = require("./routes/library");
const driveRoutes = require("./routes/drive");
const sectionRoutes = require("./routes/sections");
const youtubePlaylistRoutes = require("./routes/youtubePlaylists");
const contentRoutes = require("./routes/content");
const { protect } = require("./middleware/auth");
const { serveImage } = require("./controllers/bookController");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(compression());
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        frameSrc: ["'self'"],
        connectSrc: [
          "'self'",
          process.env.CLIENT_URL || "http://localhost:5173",
        ],
        mediaSrc: ["'self'"],
      },
    },
  }),
);
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Session for Passport
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET environment variable is required in production",
    );
  }
  console.warn(
    "[WARN] SESSION_SECRET not set — using insecure default. Set it in .env for security.",
  );
}
app.use(
  session({
    secret: process.env.SESSION_SECRET || "organizeup-session-secret-dev",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { message: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/books", apiLimiter, bookRoutes);
app.use("/api/courses", apiLimiter, courseRoutes);
app.use("/api/tools", apiLimiter, toolRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/social", apiLimiter, socialRoutes);
app.use("/api/explore", apiLimiter, exploreRoutes);
app.use("/api/library", apiLimiter, libraryRoutes);
app.use("/api/drive", apiLimiter, driveRoutes);
app.use("/api/sections", apiLimiter, sectionRoutes);
app.use("/api/youtube-playlists", apiLimiter, youtubePlaylistRoutes);
app.use("/api/content", apiLimiter, contentRoutes);

// Image serving from GridFS (authenticated)
app.get("/api/images/:fileId", protect, serveImage);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "OrganizeUp API is running" });
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 OrganizeUp Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
