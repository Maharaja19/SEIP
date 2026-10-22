const express = require("express");
const router = express.Router();
const {
  listMembers,
  addMember,
  updateMemberRole,
  updateMemberStatus,
  removeMember
} = require("../controllers/memberController");
const { authorizeRole } = require("../middleware/auth");
const { USER_ROLES } = require("../utils/roles");

// Any authenticated member of the organization can list members
router.get("/", listMembers);

// Only Organization Admin or Super Admin can invite/add members
router.post(
  "/",
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.SUPER_ADMIN]),
  addMember
);

// Only Organization Admin or Super Admin can change member roles
router.put(
  "/:id/role",
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.SUPER_ADMIN]),
  updateMemberRole
);

// Only Organization Admin or Super Admin can activate/suspend members
router.put(
  "/:id/status",
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.SUPER_ADMIN]),
  updateMemberStatus
);

// Only Organization Admin or Super Admin can remove members
router.delete(
  "/:id",
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.SUPER_ADMIN]),
  removeMember
);

module.exports = router;
