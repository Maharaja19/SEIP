const express = require("express");
const router = express.Router();
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");
const { authorizeRole } = require("../middleware/auth");
const { USER_ROLES } = require("../utils/roles");

// All authenticated members can view categories
router.get("/", listCategories);

// Only Finance Managers or Org Admins can create/edit organization categories
router.post(
  "/",
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.FINANCE_MANAGER, USER_ROLES.SUPER_ADMIN]),
  createCategory
);

router.put(
  "/:id",
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.FINANCE_MANAGER, USER_ROLES.SUPER_ADMIN]),
  updateCategory
);

router.delete(
  "/:id",
  authorizeRole([USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.SUPER_ADMIN]),
  deleteCategory
);

module.exports = router;
