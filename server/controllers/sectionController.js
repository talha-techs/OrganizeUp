const crypto = require("crypto");
const CustomSection = require("../models/CustomSection");
const SubSection = require("../models/SubSection");
const UserLibrary = require("../models/UserLibrary");
const User = require("../models/User");
const SectionInvite = require("../models/SectionInvite");
const { uploadToGridFS } = require("../config/gridfs");
const { fetchPexelsBanner } = require("../services/pexelsService");
const {
  resolveSectionRole,
  getSectionPermissions,
  checkSectionAccess,
} = require("../middleware/sectionAuth");
const { broadcastToSection, broadcastActivity } = require("../socket");

// @desc    Get all custom sections for current user (+ saved from library; admin sees all)
// @route   GET /api/sections?mine=true&shared=true
const getSections = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const savedSectionIdMap = new Map();

    let filter;
    if (req.query.mine === "true") {
      filter = { addedBy: req.user._id };
    } else if (req.query.shared === "true") {
      filter = { "collaborators.user": req.user._id };
    } else if (isAdmin) {
      filter = {};
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "section",
      }).select("contentId _id");
      saved.forEach((s) => savedSectionIdMap.set(s.contentId.toString(), s._id));
    } else {
      const saved = await UserLibrary.find({
        user: req.user._id,
        contentType: "section",
      }).select("contentId _id");
      const savedIds = saved.map((s) => s.contentId);
      saved.forEach((s) => savedSectionIdMap.set(s.contentId.toString(), s._id));

      filter = {
        $or: [
          { addedBy: req.user._id },
          { "collaborators.user": req.user._id },
          { _id: { $in: savedIds } },
        ],
      };
    }

    const sections = await CustomSection.find(filter)
      .populate("addedBy", "name email avatar")
      .populate("collaborators.user", "name email avatar")
      .sort({ createdAt: -1 });

    const sectionsWithSaved = sections.map((s) => {
      const obj = s.toObject();
      const sIdStr = s._id.toString();
      const role = resolveSectionRole(s, req.user);
      const permissions = getSectionPermissions(role, s.visibility);

      if (savedSectionIdMap.has(sIdStr)) {
        obj.isSaved = true;
        obj.libraryEntryId = savedSectionIdMap.get(sIdStr);
      } else {
        obj.isSaved = false;
      }
      obj.myRole = role;
      obj.isOwner = role === "owner";
      obj.isShared = Array.isArray(s.collaborators) && s.collaborators.length > 0;
      obj.collaboratorCount = s.collaborators?.length || 0;
      obj.permissions = permissions;
      return obj;
    });

    res.json({ sections: sectionsWithSaved });
  } catch (error) {
    console.error("Get sections error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get a single custom section
// @route   GET /api/sections/:id
const getSection = async (req, res) => {
  try {
    const { section, role, permissions, error, status } = await checkSectionAccess(
      req.params.id,
      req.user,
    );

    if (error) {
      return res.status(status).json({ message: error });
    }

    const savedEntry = await UserLibrary.findOne({
      user: req.user._id,
      contentType: "section",
      contentId: section._id,
    });

    const sectionObj = section.toObject();
    sectionObj.isSaved = !!savedEntry;
    sectionObj.libraryEntryId = savedEntry?._id || null;
    sectionObj.isOwner = role === "owner";
    sectionObj.myRole = role;
    sectionObj.permissions = permissions;

    res.json({ section: sectionObj, myRole: role, permissions });
  } catch (error) {
    console.error("Get section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a custom section
// @route   POST /api/sections
const createSection = async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    let bannerImage = req.body.bannerImage || "";

    if (req.file) {
      const fileId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname || `section_banner_${Date.now()}.jpg`,
        req.file.mimetype,
        "image",
      );
      bannerImage = `/api/images/${fileId}`;
    } else if (!bannerImage && name) {
      // Auto-fetch banner from Pexels if API key is provided
      bannerImage = await fetchPexelsBanner(name);
    }

    const section = await CustomSection.create({
      name,
      description: description || "",
      icon: icon || "folder",
      color: color || "indigo",
      bannerImage: bannerImage || "",
      addedBy: req.user._id,
      visibility: "private",
    });

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name avatar",
    );

    res.status(201).json({ section: populated });
  } catch (error) {
    console.error("Create section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Import Drive files into a custom section
// @route   POST /api/sections/:id/import
const importToSection = async (req, res) => {
  try {
    const { driveLink, driveFolderId, files, folders } = req.body;

    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const isOwner = section.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update section with imported data
    if (driveLink) section.driveLink = driveLink;
    if (driveFolderId) section.driveFolderId = driveFolderId;

    // Add files (flat list for easy access)
    if (files && files.length > 0) {
      section.files.push(
        ...files.map((f, i) => ({
          driveFileId: f.driveFileId,
          name: f.name,
          path: f.path || "",
          mimeType: f.mimeType || "",
          fileType: f.fileType || "other",
          size: f.size || null,
          order: section.files.length + i,
        })),
      );
    }

    // Add folder structure
    if (folders && folders.length > 0) {
      section.folders.push(...folders);
    }

    await section.save();

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name avatar",
    );

    res.json({
      message: `Imported ${files?.length || 0} files`,
      section: populated,
    });
  } catch (error) {
    console.error("Import to section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a custom section
// @route   PUT /api/sections/:id
const updateSection = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const isOwner = section.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name, description, icon, color, bannerImage, visibility, publishMode } =
      req.body;
    if (name) section.name = name;
    if (description !== undefined) section.description = description;
    if (icon) section.icon = icon;
    if (color) section.color = color;
    if (bannerImage !== undefined) section.bannerImage = bannerImage;
    // Admin can directly set visibility; owner or admin can set publishMode
    if (isAdmin && visibility && ["public", "private"].includes(visibility)) {
      section.visibility = visibility;
    }
    if (
      (isAdmin || isOwner) &&
      publishMode &&
      ["with_data", "without_data"].includes(publishMode)
    ) {
      section.publishMode = publishMode;
    }

    await section.save();

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name avatar",
    );

    res.json({ section: populated });
  } catch (error) {
    console.error("Update section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a custom section
// @route   DELETE /api/sections/:id
const deleteSection = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }
    if (
      req.user.role !== "admin" &&
      section.addedBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this section" });
    }

    await SubSection.deleteMany({ sectionId: section._id });
    await section.deleteOne();
    res.json({ message: "Section deleted" });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Remove a file from a section
// @route   DELETE /api/sections/:id/files/:fileId
const removeFile = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const isOwner = section.addedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    section.files = section.files.filter(
      (f) => f._id.toString() !== req.params.fileId,
    );

    await section.save();
    res.json({ message: "File removed", section });
  } catch (error) {
    console.error("Remove file error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Clone a published section into the current user's library
// @route   POST /api/sections/:id/clone
const cloneSection = async (req, res) => {
  try {
    const original = await CustomSection.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Only allow cloning public sections
    if (original.visibility !== "public") {
      return res.status(403).json({ message: "Section is not public" });
    }

    // Prevent cloning own section
    if (original.addedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You already own this section" });
    }

    // Prevent duplicate clones
    const existingClone = await CustomSection.findOne({
      clonedFrom: original._id,
      addedBy: req.user._id,
    });
    if (existingClone) {
      return res
        .status(400)
        .json({ message: "You already cloned this section" });
    }

    // Create the cloned section (always private for the new user)
    const cloned = await CustomSection.create({
      name: original.name,
      description: original.description,
      icon: original.icon,
      color: original.color,
      bannerImage: original.bannerImage || "",
      addedBy: req.user._id,
      visibility: "private",
      clonedFrom: original._id,
    });

    // Clone sub-sections (blocks)
    const originalBlocks = await SubSection.find({
      sectionId: original._id,
    }).sort({ order: 1 });

    const isWithData = original.publishMode === "with_data";

    for (const block of originalBlocks) {
      const clonedBlock = {
        sectionId: cloned._id,
        name: block.name,
        type: block.type,
        order: block.order,
        addedBy: req.user._id,
      };

      if (isWithData) {
        // Copy all data
        clonedBlock.content = block.content;
        clonedBlock.todos = block.todos;
        clonedBlock.boardColumns = block.boardColumns;
        clonedBlock.boardItems = block.boardItems;
        clonedBlock.links = block.links;
        clonedBlock.code = block.code;
        clonedBlock.language = block.language;
        clonedBlock.imageUrl = block.imageUrl;
        clonedBlock.imageCaption = block.imageCaption;
      } else {
        // Template only — copy structure with placeholder/empty data
        clonedBlock.content = "";
        clonedBlock.todos = [];
        clonedBlock.boardColumns = block.boardColumns; // Keep column structure
        clonedBlock.boardItems = [];
        clonedBlock.links = [];
        clonedBlock.code = block.code
          ? `// Template: fill in your ${block.language || "code"} here`
          : "";
        clonedBlock.language = block.language;
        clonedBlock.imageUrl = "";
        clonedBlock.imageCaption = block.imageCaption || "";
      }

      await SubSection.create(clonedBlock);
    }

    const populated = await CustomSection.findById(cloned._id).populate(
      "addedBy",
      "name avatar",
    );

    res.status(201).json({
      message: isWithData
        ? "Section cloned with data"
        : "Section cloned as template",
      section: populated,
    });
  } catch (error) {
    console.error("Clone section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Upload an image for custom section / pasted blocks
// @route   POST /api/sections/:id/upload-image
const uploadSectionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const { section, permissions } = await checkSectionAccess(req.params.id, req.user);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    if (!permissions.canEdit) {
      return res.status(403).json({ message: "Not authorized to upload to this section" });
    }

    const fileId = await uploadToGridFS(
      req.file.buffer,
      req.file.originalname || `section_img_${Date.now()}.png`,
      req.file.mimetype || "image/png",
      "image",
    );

    const imageUrl = `/api/images/${fileId}`;
    res.json({ imageUrl, fileId: fileId.toString() });
  } catch (error) {
    console.error("Upload section image error:", error);
    res.status(500).json({ message: "Server error uploading image" });
  }
};

// @desc    Update section banner (via web URL, file upload, or Pexels re-query)
// @route   PATCH /api/sections/:id/banner
const updateSectionBanner = async (req, res) => {
  try {
    const { section, permissions } = await checkSectionAccess(req.params.id, req.user);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    if (!permissions.canManage) {
      return res.status(403).json({ message: "Only the section owner or admin can update banner" });
    }

    const { bannerImage, query, autoFetch } = req.body || {};

    if (req.file) {
      const fileId = await uploadToGridFS(
        req.file.buffer,
        req.file.originalname || `banner_${Date.now()}.jpg`,
        req.file.mimetype,
        "image",
      );
      section.bannerImage = `/api/images/${fileId}`;
    } else if (autoFetch || query) {
      const pexelsUrl = await fetchPexelsBanner(query || section.name);
      if (!pexelsUrl) {
        return res.status(404).json({
          message: process.env.PEXELS_API_KEY
            ? "No landscape image found for this search"
            : "Pexels API key not configured in server .env",
        });
      }
      section.bannerImage = pexelsUrl;
    } else if (bannerImage !== undefined) {
      section.bannerImage = bannerImage;
    }

    await section.save();

    const populated = await CustomSection.findById(section._id).populate(
      "addedBy",
      "name avatar",
    );

    broadcastToSection(section._id.toString(), "section_updated", { section: populated });
    broadcastActivity(section._id.toString(), {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "updated_banner",
    });

    res.json({ section: populated });
  } catch (error) {
    console.error("Update section banner error:", error);
    res.status(500).json({ message: "Server error updating banner" });
  }
};

// ── Team Collaboration & Invites ─────────────────────────────────────────────

// @desc    Create invite for a section (Owner/Admin only)
// @route   POST /api/sections/:id/invites
const createInvite = async (req, res) => {
  try {
    const { section, permissions } = await checkSectionAccess(req.params.id, req.user);
    if (!section) return res.status(404).json({ message: "Section not found" });
    if (!permissions.canManage) {
      return res.status(403).json({ message: "Only the section owner or admin can invite members" });
    }

    const { email, role = "editor" } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Check if inviting owner themselves
    const ownerEmail = section.addedBy?.email?.toLowerCase();
    if (ownerEmail && ownerEmail === cleanEmail) {
      return res.status(400).json({ message: "You are already the owner of this section" });
    }

    // Check if user is already a collaborator
    const isAlreadyCollab = section.collaborators?.some(
      (c) => c.user?.email?.toLowerCase() === cleanEmail,
    );
    if (isAlreadyCollab) {
      return res.status(400).json({ message: "User is already a collaborator on this section" });
    }

    // Check if existing active pending invite exists
    let existingInvite = await SectionInvite.findOne({
      sectionId: section._id,
      invitedEmail: cleanEmail,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return res.json({
        invite: existingInvite,
        inviteUrl: `/invite/${existingInvite.token}`,
        message: "An active invitation for this email already exists",
      });
    }

    // Find if user already exists in OrganizeUp DB
    const existingUser = await User.findOne({ email: cleanEmail }).select("_id name email");

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newInvite = await SectionInvite.create({
      sectionId: section._id,
      invitedEmail: cleanEmail,
      invitedUser: existingUser ? existingUser._id : null,
      invitedBy: req.user._id,
      role: role === "viewer" ? "viewer" : "editor",
      token,
      expiresAt,
    });

    res.status(201).json({
      invite: newInvite,
      inviteUrl: `/invite/${token}`,
      isRegistered: !!existingUser,
      message: existingUser
        ? `Invitation created for ${existingUser.name}`
        : `Invitation created for ${cleanEmail} (will auto-bind upon signup)`,
    });
  } catch (error) {
    console.error("Create invite error:", error);
    res.status(500).json({ message: "Server error creating invitation" });
  }
};

// @desc    Get public sanitized info about an invite
// @route   GET /api/sections/invites/public/:token
const getPublicInviteInfo = async (req, res) => {
  try {
    const invite = await SectionInvite.findOne({ token: req.params.token })
      .populate("sectionId", "name color icon description bannerImage")
      .populate("invitedBy", "name avatar");

    if (!invite || !invite.sectionId) {
      return res.status(404).json({ message: "Invitation not found or section has been deleted" });
    }

    const isExpired = invite.expiresAt < new Date();

    res.json({
      sectionId: invite.sectionId._id,
      sectionName: invite.sectionId.name,
      sectionColor: invite.sectionId.color,
      sectionIcon: invite.sectionId.icon,
      sectionDescription: invite.sectionId.description,
      bannerImage: invite.sectionId.bannerImage,
      invitedBy: {
        name: invite.invitedBy?.name || "A team member",
        avatar: invite.invitedBy?.avatar || "",
      },
      invitedEmail: invite.invitedEmail,
      role: invite.role,
      status: invite.status,
      isExpired,
    });
  } catch (error) {
    console.error("Get public invite info error:", error);
    res.status(500).json({ message: "Server error fetching invitation" });
  }
};

// @desc    Accept invite (User must be logged in with matching email)
// @route   POST /api/sections/invites/:token/accept
const acceptInvite = async (req, res) => {
  try {
    const invite = await SectionInvite.findOne({ token: req.params.token });
    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invite.status === "accepted") {
      return res.json({
        message: "You have already accepted this invitation",
        sectionId: invite.sectionId,
      });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: `Invitation is no longer valid (${invite.status})` });
    }

    if (invite.expiresAt < new Date()) {
      invite.status = "revoked";
      await invite.save();
      return res.status(400).json({ message: "Invitation has expired" });
    }

    // Security check: Active user's email must match invitedEmail
    if (req.user.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
      return res.status(403).json({
        message: `Account mismatch: You are logged in as ${req.user.email}, but this invite was sent to ${invite.invitedEmail}`,
        currentEmail: req.user.email,
        invitedEmail: invite.invitedEmail,
      });
    }

    const section = await CustomSection.findById(invite.sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section no longer exists" });
    }

    // Check if user is owner
    const isOwner = String(section.addedBy) === String(req.user._id);
    if (!isOwner) {
      // Add user to collaborators if not already present
      const alreadyIn = section.collaborators?.some(
        (c) => String(c.user) === String(req.user._id),
      );
      if (!alreadyIn) {
        if (!section.collaborators) section.collaborators = [];
        section.collaborators.push({
          user: req.user._id,
          role: invite.role || "editor",
          invitedBy: invite.invitedBy,
          joinedAt: new Date(),
        });
        await section.save();
      }
    }

    invite.status = "accepted";
    invite.invitedUser = req.user._id;
    await invite.save();

    res.json({
      message: "Invitation accepted successfully",
      sectionId: section._id,
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({ message: "Server error accepting invitation" });
  }
};

// @desc    Decline invite
// @route   POST /api/sections/invites/:token/decline
const declineInvite = async (req, res) => {
  try {
    const invite = await SectionInvite.findOne({ token: req.params.token });
    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (req.user.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
      return res.status(403).json({ message: "Not authorized to decline this invite" });
    }

    invite.status = "declined";
    await invite.save();

    res.json({ message: "Invitation declined" });
  } catch (error) {
    console.error("Decline invite error:", error);
    res.status(500).json({ message: "Server error declining invitation" });
  }
};

// @desc    Get pending invites for current user
// @route   GET /api/sections/invites/pending
const getPendingInvites = async (req, res) => {
  try {
    const invites = await SectionInvite.find({
      invitedEmail: req.user.email.toLowerCase(),
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("sectionId", "name color icon bannerImage description")
      .populate("invitedBy", "name avatar email")
      .sort({ createdAt: -1 });

    // Filter out if section was deleted
    const validInvites = invites.filter((inv) => inv.sectionId);

    res.json({ invites: validInvites });
  } catch (error) {
    console.error("Get pending invites error:", error);
    res.status(500).json({ message: "Server error fetching invites" });
  }
};

// @desc    Get all members of a section (Collaborators + Owner)
// @route   GET /api/sections/:id/members
const getSectionMembers = async (req, res) => {
  try {
    const { section, permissions } = await checkSectionAccess(req.params.id, req.user);
    if (!section) return res.status(404).json({ message: "Section not found" });
    if (!permissions.canView) {
      return res.status(403).json({ message: "Not authorized" });
    }

    let pendingInvites = [];
    if (permissions.canManage) {
      pendingInvites = await SectionInvite.find({
        sectionId: section._id,
        status: "pending",
        expiresAt: { $gt: new Date() },
      })
        .populate("invitedUser", "name avatar email")
        .populate("invitedBy", "name")
        .sort({ createdAt: -1 });
    }

    res.json({
      owner: section.addedBy,
      collaborators: section.collaborators || [],
      pendingInvites,
      canManage: permissions.canManage,
    });
  } catch (error) {
    console.error("Get section members error:", error);
    res.status(500).json({ message: "Server error fetching members" });
  }
};

// @desc    Update collaborator role (Owner only)
// @route   PATCH /api/sections/:id/members/:userId
const updateCollaboratorRole = async (req, res) => {
  try {
    const { section, permissions } = await checkSectionAccess(req.params.id, req.user);
    if (!section) return res.status(404).json({ message: "Section not found" });
    if (!permissions.canManage) {
      return res.status(403).json({ message: "Only the owner can modify member roles" });
    }

    const { role } = req.body;
    if (!["editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Role must be 'editor' or 'viewer'" });
    }

    const collab = section.collaborators?.find(
      (c) => String(c.user?._id || c.user) === String(req.params.userId),
    );

    if (!collab) {
      return res.status(404).json({ message: "Collaborator not found in this section" });
    }

    collab.role = role;
    await section.save();

    const updated = await CustomSection.findById(section._id)
      .populate("addedBy", "name email avatar")
      .populate("collaborators.user", "name email avatar");

    broadcastToSection(section._id.toString(), "collaborator_changed", {
      collaborators: updated.collaborators,
    });
    broadcastActivity(section._id.toString(), {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: "role_changed",
    });

    res.json({ message: "Role updated", collaborators: updated.collaborators });
  } catch (error) {
    console.error("Update collaborator role error:", error);
    res.status(500).json({ message: "Server error updating role" });
  }
};

// @desc    Remove collaborator (Owner removing member, or member leaving section)
// @route   DELETE /api/sections/:id/members/:userId
const removeCollaborator = async (req, res) => {
  try {
    const { section, permissions } = await checkSectionAccess(req.params.id, req.user);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const isSelfLeaving = String(req.user._id) === String(req.params.userId);
    if (!isSelfLeaving && !permissions.canManage) {
      return res.status(403).json({ message: "Only the section owner can remove members" });
    }

    const initialCount = section.collaborators?.length || 0;
    section.collaborators = (section.collaborators || []).filter(
      (c) => String(c.user?._id || c.user) !== String(req.params.userId),
    );

    if (section.collaborators.length === initialCount) {
      return res.status(404).json({ message: "User is not a collaborator in this section" });
    }

    await section.save();

    // Revoke any pending invites for that user if owner removed them
    if (permissions.canManage && !isSelfLeaving) {
      await SectionInvite.updateMany(
        { sectionId: section._id, invitedUser: req.params.userId, status: "pending" },
        { status: "revoked" },
      );
    }

    broadcastToSection(section._id.toString(), "collaborator_changed", {
      removedUserId: req.params.userId,
    });
    broadcastActivity(section._id.toString(), {
      user: { name: req.user.name, avatar: req.user.avatar },
      action: isSelfLeaving ? "left_section" : "removed_collaborator",
    });

    res.json({
      message: isSelfLeaving ? "You left the section" : "Collaborator removed",
      userId: req.params.userId,
    });
  } catch (error) {
    console.error("Remove collaborator error:", error);
    res.status(500).json({ message: "Server error removing member" });
  }
};

module.exports = {
  getSections,
  getSection,
  createSection,
  importToSection,
  updateSection,
  deleteSection,
  removeFile,
  cloneSection,
  uploadSectionImage,
  updateSectionBanner,
  createInvite,
  getPublicInviteInfo,
  acceptInvite,
  declineInvite,
  getPendingInvites,
  getSectionMembers,
  updateCollaboratorRole,
  removeCollaborator,
};
