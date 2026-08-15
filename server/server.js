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
const audiobookRoutes = require("./routes/audiobooks");
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
const telegramRoutes = require("./routes/telegram");
const discordRoutes = require("./routes/discord");
const { initTelegramBot } = require("./bot/telegramBot");
const { initDiscordBot } = require("./bot/discordBot");
const { protect } = require("./middleware/auth");
const { serveImage } = require("./controllers/bookController");

const app = express();

// Trust the Render proxy so rate limiters use the real user IP, not the load balancer IP
app.set("trust proxy", 1);

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
        mediaSrc: ["'self'", "https:"],
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
app.use("/api/audiobooks", apiLimiter, audiobookRoutes);
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
app.use("/api/telegram", apiLimiter, telegramRoutes);
app.use("/api/discord", apiLimiter, discordRoutes);

// Image serving from GridFS (authenticated)
app.get("/api/images/:fileId", protect, serveImage);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "OrganizeUp API is running" });
});

// API Root Route
app.get("/", (req, res) => {
  res.json({ message: "OrganizeUp API is running" });
});

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
  
  // Initialize Telegram Bot
  initTelegramBot();
  
  // Initialize Discord Bot
  initDiscordBot();

  // Keep-alive: ping ourselves every 14 minutes to prevent Render free-tier cold starts
  if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
    const INTERVAL = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        const url = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
        const res = await fetch(url);
        console.log(`[Keep-Alive] Pinged ${url} — ${res.status}`);
      } catch (err) {
        console.error("[Keep-Alive] Ping failed:", err.message);
      }
    }, INTERVAL);
    console.log("💓 Keep-alive ping enabled (every 14 min)");
  }
});

module.exports = app;
