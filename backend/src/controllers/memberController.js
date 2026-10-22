const Membership = require("../models/membership");
const User = require("../models/user");
const Organization = require("../models/organization");
const Wallet = require("../models/wallet");
const APIResponse = require("../utils/apiResponse");
const CustomError = require("../utils/CustomError");
const { USER_ROLES, normalizeRole } = require("../utils/roles");
const { logAudit } = require("../services/auditService");

// GET /api/members (list all members of the organization)
const listMembers = async (req, res, next) => {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    if (!orgId) {
      throw new CustomError("Organization context required", 400);
    }

    // Query memberships for this organization
    const memberships = await Membership.find({ organization: orgId })
      .populate("user", "name email role contactNo avatar profilePicture registerNumber createdAt isActive")
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    // Fallback: If no Membership docs yet (legacy migration), find Users with organizationId
    if (memberships.length === 0) {
      const users = await User.find({ organizationId: orgId })
        .select("name email role contactNo avatar profilePicture registerNumber createdAt isActive");

      const syntheticMembers = users.map(u => ({
        _id: u._id,
        user: u,
        organization: orgId,
        role: u.role,
        status: u.isActive ? "active" : "suspended",
        joinedAt: u.createdAt,
        department: "General"
      }));

      return res.status(200).json(
        APIResponse.success(syntheticMembers, "Organization members retrieved")
      );
    }

    return res.status(200).json(
      APIResponse.success(memberships, "Organization members retrieved")
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/members (add or invite member to organization)
const addMember = async (req, res, next) => {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    if (!orgId) {
      throw new CustomError("Organization context required", 400);
    }

    const { email, name, role = USER_ROLES.MEMBER, department = "General", title } = req.body;
    if (!email || !email.trim()) {
      throw new CustomError("Member email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resolvedRole = normalizeRole(role) || USER_ROLES.MEMBER;

    // Check if user exists
    let targetUser = await User.findOne({ email: normalizedEmail });
    if (!targetUser) {
      // Create user stub
      const sNoCount = await User.countDocuments();
      targetUser = await User.create({
        email: normalizedEmail,
        name: name?.trim() || normalizedEmail.split("@")[0],
        sNo: sNoCount + 1,
        role: resolvedRole,
        organizationId: orgId,
        isActive: true
      });

      // Create personal wallet
      await Wallet.create({
        owner: targetUser._id,
        organization: orgId,
        balance: 0
      });
    } else {
      // User exists - update organization if not already bound
      if (targetUser.organizationId && String(targetUser.organizationId) !== String(orgId)) {
        throw new CustomError("User already belongs to another organization", 409);
      }
      targetUser.organizationId = orgId;
      targetUser.role = resolvedRole;
      await targetUser.save();
    }

    // Create or update membership
    const membership = await Membership.findOneAndUpdate(
      { organization: orgId, user: targetUser._id },
      {
        organization: orgId,
        user: targetUser._id,
        role: resolvedRole,
        status: "active",
        department: department.trim(),
        title: title?.trim(),
        invitedBy: req.user._id
      },
      { upsert: true, new: true, runValidators: true }
    ).populate("user", "name email role contactNo avatar profilePicture registerNumber");

    // Audit log
    await logAudit({
      action: "MEMBER_ADDED",
      entityType: "MEMBERSHIP",
      entityId: membership._id,
      organization: orgId,
      performedBy: req.user._id,
      details: { memberEmail: normalizedEmail, assignedRole: resolvedRole },
      req
    });

    return res.status(201).json(
      APIResponse.success(membership, "Member added successfully")
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/members/:id/role (update member's role)
const updateMemberRole = async (req, res, next) => {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const { id } = req.params;
    const { role } = req.body;

    const resolvedRole = normalizeRole(role);
    if (!resolvedRole) {
      throw new CustomError("Invalid role specified", 400);
    }

    // ID can be membership ID or user ID
    let membership = await Membership.findOne({
      organization: orgId,
      $or: [{ _id: id }, { user: id }]
    });

    let targetUserId = membership ? membership.user : id;

    if (membership) {
      membership.role = resolvedRole;
      await membership.save();
    }

    await User.findByIdAndUpdate(targetUserId, { role: resolvedRole });

    // Audit log
    await logAudit({
      action: "MEMBER_ROLE_UPDATED",
      entityType: "MEMBERSHIP",
      entityId: membership?._id || targetUserId,
      organization: orgId,
      performedBy: req.user._id,
      details: { newRole: resolvedRole, targetUserId },
      req
    });

    return res.status(200).json(
      APIResponse.success({ role: resolvedRole }, "Member role updated successfully")
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/members/:id/status (activate / suspend member)
const updateMemberStatus = async (req, res, next) => {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended", "left"].includes(status)) {
      throw new CustomError("Invalid status value", 400);
    }

    const membership = await Membership.findOne({
      organization: orgId,
      $or: [{ _id: id }, { user: id }]
    });

    if (!membership) {
      throw new CustomError("Member not found", 404);
    }

    membership.status = status;
    await membership.save();

    // If suspended, also update user
    if (status === "suspended") {
      await User.findByIdAndUpdate(membership.user, { isActive: false });
    } else if (status === "active") {
      await User.findByIdAndUpdate(membership.user, { isActive: true });
    }

    // Audit log
    await logAudit({
      action: "MEMBER_STATUS_UPDATED",
      entityType: "MEMBERSHIP",
      entityId: membership._id,
      organization: orgId,
      performedBy: req.user._id,
      details: { newStatus: status, userId: membership.user },
      req
    });

    return res.status(200).json(
      APIResponse.success(membership, "Member status updated")
    );
  } catch (error) {
    next(error);
  }
};

// DELETE /api/members/:id (remove member from organization)
const removeMember = async (req, res, next) => {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const { id } = req.params;

    const membership = await Membership.findOne({
      organization: orgId,
      $or: [{ _id: id }, { user: id }]
    });

    if (!membership) {
      throw new CustomError("Member not found", 404);
    }

    const userId = membership.user;

    // Prevent owner from removing themselves
    const org = await Organization.findById(orgId);
    if (org && String(org.owner) === String(userId)) {
      throw new CustomError("Cannot remove the organization owner", 400);
    }

    // Delete membership and unlink user organizationId
    await Membership.findByIdAndDelete(membership._id);
    await User.findByIdAndUpdate(userId, { $unset: { organizationId: 1 } });

    // Audit log
    await logAudit({
      action: "MEMBER_REMOVED",
      entityType: "MEMBERSHIP",
      entityId: membership._id,
      organization: orgId,
      performedBy: req.user._id,
      details: { removedUserId: userId },
      req
    });

    return res.status(200).json(
      APIResponse.success(null, "Member removed from organization")
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMembers,
  addMember,
  updateMemberRole,
  updateMemberStatus,
  removeMember
};
