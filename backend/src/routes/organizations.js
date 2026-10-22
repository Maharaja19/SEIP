const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { USER_ROLES } = require("../utils/roles");
const { isSuperAdmin } = require("../utils/roles");
const Organization = require("../models/organization");
const Membership = require("../models/membership");
const User = require("../models/user");
const Wallet = require("../models/wallet");
const APIResponse = require("../utils/apiResponse");
const CustomError = require("../utils/CustomError");
const { logAudit } = require("../services/auditService");

// Create Organization (onboarding / creation)
router.post(
  "/",
  authenticateToken,
  async (req, res, next) => {
    try {
      const {
        name,
        legalName,
        displayName,
        type = "CLUB",
        description,
        industry,
        email,
        phone,
        website,
        logo,
        address,
        currency = "INR",
        timezone = "Asia/Kolkata",
        settings
      } = req.body;
      
      if (!name || !name.trim()) {
        throw new CustomError("Organization name is required.", 400);
      }

      // Check if user already belongs to an organization (unless super admin)
      if (req.user.organizationId && !isSuperAdmin(req.user.role)) {
        throw new CustomError("User already belongs to an organization.", 400);
      }

      // Create organization
      const org = await Organization.create({
        name: name.trim(),
        legalName: legalName?.trim(),
        displayName: displayName?.trim() || name.trim(),
        type,
        description: description?.trim(),
        industry: industry?.trim(),
        email: email?.trim(),
        phone: phone?.trim(),
        website: website?.trim(),
        logo,
        address: address || {},
        currency,
        timezone,
        owner: req.user._id,
        createdBy: req.user._id,
        status: "active",
        settings: settings || {
          theme: "system",
          accentColor: "#0f172a",
          allowMemberSubmission: true,
          currency: currency || "INR",
          fiscalYearStartMonth: 4
        }
      });

      // Update user role to Organization Admin
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { 
          organizationId: org._id,
          role: USER_ROLES.ORGANIZATION_ADMIN
        },
        { new: true }
      );

      // Create formal membership record for the owner/admin
      await Membership.create({
        user: req.user._id,
        organization: org._id,
        role: USER_ROLES.ORGANIZATION_ADMIN,
        status: "active",
        title: "Owner & Admin",
        department: "Executive"
      });

      // Create default organization wallet
      await Wallet.create({
        owner: req.user._id,
        organization: org._id,
        currency: currency || "INR",
        balance: 0,
        status: "active"
      });

      // Log audit
      await logAudit({
        action: "ORGANIZATION_CREATED",
        entityType: "ORGANIZATION",
        entityId: org._id,
        organization: org._id,
        performedBy: req.user._id,
        details: { name: org.name, type: org.type },
        req
      });

      return res.status(201).json(
        APIResponse.success(
          { organization: org, user: updatedUser }, 
          "Organization created successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

// Get current user's active organization details
router.get(
  "/me",
  authenticateToken,
  async (req, res, next) => {
    try {
      const orgId = req.organizationId || req.user.organizationId;
      if (!orgId) {
        return res.status(404).json(
          APIResponse.error("User does not belong to any organization", "NOT_FOUND")
        );
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        throw new CustomError("Organization not found.", 404);
      }

      return res.status(200).json(
        APIResponse.success(org, "Organization profile retrieved")
      );
    } catch (err) {
      next(err);
    }
  }
);

// Update organization details (only Organization Admin or Super Admin)
router.put(
  "/me",
  authenticateToken,
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res, next) => {
    try {
      const orgId = req.organizationId || req.user.organizationId;
      if (!orgId) {
        throw new CustomError("Organization context missing", 400);
      }

      const allowedUpdates = [
        "name", "legalName", "displayName", "description", "industry",
        "email", "phone", "website", "logo", "address", "currency",
        "timezone", "settings", "type"
      ];

      const updatePayload = {};
      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          updatePayload[key] = req.body[key];
        }
      }

      const updatedOrg = await Organization.findByIdAndUpdate(
        orgId,
        { $set: updatePayload },
        { new: true, runValidators: true }
      );

      if (!updatedOrg) {
        throw new CustomError("Organization not found", 404);
      }

      // Log audit
      await logAudit({
        action: "ORGANIZATION_UPDATED",
        entityType: "ORGANIZATION",
        entityId: updatedOrg._id,
        organization: updatedOrg._id,
        performedBy: req.user._id,
        details: { updatedFields: Object.keys(updatePayload) },
        req
      });

      return res.status(200).json(
        APIResponse.success(updatedOrg, "Organization updated successfully")
      );
    } catch (err) {
      next(err);
    }
  }
);

// List organizations (Super Admin only)
router.get(
  "/",
  authenticateToken,
  authorizeRole([USER_ROLES.SUPER_ADMIN]),
  async (req, res, next) => {
    try {
      const organizations = await Organization.find().sort({ createdAt: -1 });
      return res.status(200).json(APIResponse.success(organizations));
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
