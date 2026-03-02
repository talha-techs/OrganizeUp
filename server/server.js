require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const path = require("path");
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
const { serveImage } = require("./controllers/bookController");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "organizeup-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/explore", exploreRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/youtube-playlists", youtubePlaylistRoutes);
app.use("/api/content", contentRoutes);

// Image serving from GridFS
app.get("/api/images/:fileId", serveImage);

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
