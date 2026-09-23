const CustomSection = require("../models/CustomSection");

/**
 * Resolves user's role on a section.
 * @returns {'owner' | 'editor' | 'viewer' | 'none'}
 */
const resolveSectionRole = (section, user) => {
  if (!section || !user) return "none";

  // Admins have full owner capabilities
  if (user.role === "admin") return "owner";

  // Creator is owner
  const ownerId = section.addedBy?._id || section.addedBy;
  if (ownerId && String(ownerId) === String(user._id)) {
    return "owner";
  }

  // Collaborator role
  if (Array.isArray(section.collaborators)) {
    const match = section.collaborators.find((c) => {
      const cUserId = c.user?._id || c.user;
      return cUserId && String(cUserId) === String(user._id);
    });
    if (match) {
      return match.role; // 'editor' | 'viewer'
    }
  }

  return "none";
};

/**
 * Returns boolean permissions for a given role and section visibility
 */
const getSectionPermissions = (role, visibility) => {
  const isMember = ["owner", "editor", "viewer"].includes(role);
  return {
    canView: isMember || visibility === "public",
    canEdit: ["owner", "editor"].includes(role),
    canManage: role === "owner", // Invite, change roles, delete section, Drive sync, banners
    canLeave: ["editor", "viewer"].includes(role),
  };
};

/**
 * Loads a section and checks caller access
 */
const checkSectionAccess = async (sectionId, user) => {
  const section = await CustomSection.findById(sectionId)
    .populate("addedBy", "name email avatar")
    .populate("collaborators.user", "name email avatar")
    .populate("collaborators.invitedBy", "name email");

  if (!section) {
    return { error: "Section not found", status: 404, section: null };
  }

  const role = resolveSectionRole(section, user);
  const permissions = getSectionPermissions(role, section.visibility);

  if (!permissions.canView) {
    return { error: "Not authorized to access this section", status: 403, section, role, permissions };
  }

  return { section, role, permissions, error: null, status: 200 };
};

module.exports = {
  resolveSectionRole,
  getSectionPermissions,
  checkSectionAccess,
};
