const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const { uploadToGridFS, deleteFromGridFS } = require("../config/gridfs");

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Check if this email should be admin
    const isAdmin =
      process.env.ADMIN_EMAIL &&
      email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    const user = await User.create({
      name,
      email,
      password,
      role: isAdmin ? "admin" : "user",
      isVerified: true,
    });

    const token = generateToken(user._id);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(401).json({
        message: "This account uses Google sign-in. Please login with Google.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
const googleCallback = async (req, res) => {
  try {
    const token = generateToken(req.user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend — token is already in httpOnly cookie, no URL exposure
    res.redirect(`${process.env.CLIENT_URL}/auth/google/success`);
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        videoProgress: user.videoProgress,
        readingProgress: user.readingProgress,
        notifications: user.notifications || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/auth/notifications/mark-read
const markNotificationsRead = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { "notifications.$[].read": true } },
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ message: "Logged out successfully" });
};

// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;

    // Handle avatar image upload
    if (req.file) {
      // Delete old avatar from GridFS if it exists
      if (user.avatarImageId) {
        await deleteFromGridFS(user.avatarImageId, "image");
      }
      const avatarImageId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "image",
      );
      user.avatarImageId = avatarImageId;
      user.avatar = `/api/images/${avatarImageId}`;
    } else if (req.body.removeAvatar === "true") {
      // Allow removing avatar
      if (user.avatarImageId) {
        await deleteFromGridFS(user.avatarImageId, "image");
      }
      user.avatarImageId = null;
      user.avatar = "";
    }

    await user.save();

    res.json({
      message: "Profile updated",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getMe,
  logout,
  updateProfile,
  markNotificationsRead,
};
