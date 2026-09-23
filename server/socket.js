const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const CustomSection = require("./models/CustomSection");
const { resolveSectionRole } = require("./middleware/sectionAuth");

let io = null;

// Track presence: sectionId -> Map<socketId, { userId, name, email, avatar, role }>
const sectionPresence = new Map();

// Track sockets: socketId -> Set<sectionId>
const socketSections = new Map();

// Track active focus on blocks: sectionId -> Map<blockId, { userId, name, avatar }>
const sectionBlockFocus = new Map();

const getAllowedOrigins = () => {
  const allowed = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://organizeup.app",
    "https://www.organizeup.app",
  ];
  if (process.env.CLIENT_URL) {
    allowed.push(process.env.CLIENT_URL);
  }
  return [...new Set(allowed)];
};

const emitPresenceUpdate = (sectionId) => {
  if (!io) return;
  const roomSockets = sectionPresence.get(sectionId);
  if (!roomSockets) {
    io.to(`section:${sectionId}`).emit("presence_update", { activeUsers: [] });
    return;
  }

  // Deduplicate by userId
  const uniqueUsers = new Map();
  for (const info of roomSockets.values()) {
    if (!uniqueUsers.has(info.userId)) {
      uniqueUsers.set(info.userId, info);
    }
  }

  io.to(`section:${sectionId}`).emit("presence_update", {
    activeUsers: Array.from(uniqueUsers.values()),
  });
};

const handleLeaveSection = (socket, sectionId) => {
  const roomName = `section:${sectionId}`;
  socket.leave(roomName);

  // Remove from presence
  if (sectionPresence.has(sectionId)) {
    const roomUsers = sectionPresence.get(sectionId);
    roomUsers.delete(socket.id);
    if (roomUsers.size === 0) {
      sectionPresence.delete(sectionId);
    }
  }

  // Remove any block focus held by this socket's user
  if (sectionBlockFocus.has(sectionId)) {
    const focusMap = sectionBlockFocus.get(sectionId);
    for (const [blockId, user] of focusMap.entries()) {
      if (user.socketId === socket.id) {
        focusMap.delete(blockId);
        socket.to(roomName).emit("block_focus_changed", {
          blockId,
          focused: false,
        });
      }
    }
    if (focusMap.size === 0) {
      sectionBlockFocus.delete(sectionId);
    }
  }

  emitPresenceUpdate(sectionId);

  const userJoinedSet = socketSections.get(socket.id);
  if (userJoinedSet) {
    userJoinedSet.delete(sectionId);
  }
};

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.authorization) {
        const parts = socket.handshake.headers.authorization.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
          token = parts[1];
        }
      }

      if (!token && socket.handshake.headers?.cookie) {
        const cookieMatch = socket.handshake.headers.cookie.match(/token=([^;]+)/);
        if (cookieMatch) token = decodeURIComponent(cookieMatch[1]);
      }

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket authentication error:", err.message);
      next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  // Connection Handler
  io.on("connection", (socket) => {
    const user = socket.user;
    socketSections.set(socket.id, new Set());

    // ── Join Section Room ──
    socket.on("join_section", async ({ sectionId }) => {
      if (!sectionId) return;

      try {
        const section = await CustomSection.findById(sectionId);
        if (!section) {
          return socket.emit("error", { message: "Section not found" });
        }

        const role = resolveSectionRole(section, user);
        if (role === "none" && section.visibility !== "public") {
          return socket.emit("error", { message: "Not authorized to view this section" });
        }

        const roomName = `section:${sectionId}`;
        socket.join(roomName);

        // Record presence
        if (!sectionPresence.has(sectionId)) {
          sectionPresence.set(sectionId, new Map());
        }
        sectionPresence.get(sectionId).set(socket.id, {
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role,
        });

        socketSections.get(socket.id).add(sectionId);

        // Broadcast presence
        emitPresenceUpdate(sectionId);

        // Send existing active block focuses to the joining user
        if (sectionBlockFocus.has(sectionId)) {
          const focusList = Array.from(sectionBlockFocus.get(sectionId).entries()).map(
            ([blockId, focusUser]) => ({
              blockId,
              user: {
                userId: focusUser.userId,
                name: focusUser.name,
                avatar: focusUser.avatar,
              },
            }),
          );
          socket.emit("initial_block_focus", { focuses: focusList });
        }
      } catch (err) {
        console.error("Socket join_section error:", err);
      }
    });

    // ── Block Focus (Collaborator clicked into block) ──
    socket.on("block_focus", ({ sectionId, blockId }) => {
      if (!sectionId || !blockId) return;

      if (!sectionBlockFocus.has(sectionId)) {
        sectionBlockFocus.set(sectionId, new Map());
      }
      const focusMap = sectionBlockFocus.get(sectionId);
      const userInfo = {
        userId: user._id.toString(),
        name: user.name,
        avatar: user.avatar,
        socketId: socket.id,
      };
      focusMap.set(blockId, userInfo);

      socket.to(`section:${sectionId}`).emit("block_focus_changed", {
        blockId,
        user: {
          userId: userInfo.userId,
          name: userInfo.name,
          avatar: userInfo.avatar,
        },
        focused: true,
      });
    });

    // ── Block Blur (Collaborator finished editing block) ──
    socket.on("block_blur", ({ sectionId, blockId }) => {
      if (!sectionId || !blockId) return;

      if (sectionBlockFocus.has(sectionId)) {
        sectionBlockFocus.get(sectionId).delete(blockId);
      }

      socket.to(`section:${sectionId}`).emit("block_focus_changed", {
        blockId,
        focused: false,
      });
    });

    // ── Leave Section Room ──
    socket.on("leave_section", ({ sectionId }) => {
      if (!sectionId) return;
      handleLeaveSection(socket, sectionId);
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      const joined = socketSections.get(socket.id);
      if (joined) {
        for (const sectionId of joined) {
          handleLeaveSection(socket, sectionId);
        }
        socketSections.delete(socket.id);
      }
    });
  });

  console.log("⚡ Real-time Socket.io engine initialized");
  return io;
};

const getIO = () => {
  return io;
};

const broadcastToSection = (sectionId, eventName, payload, excludeSocketId = null) => {
  if (!io || !sectionId) return;
  const roomName = `section:${sectionId}`;
  if (excludeSocketId) {
    io.to(roomName).except(excludeSocketId).emit(eventName, payload);
  } else {
    io.to(roomName).emit(eventName, payload);
  }
};

const broadcastActivity = (sectionId, activity) => {
  if (!io || !sectionId) return;
  const roomName = `section:${sectionId}`;
  io.to(roomName).emit("activity_event", {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    ...activity,
    timestamp: activity.timestamp || new Date(),
  });
};

module.exports = {
  initSocket,
  getIO,
  broadcastToSection,
  broadcastActivity,
};
