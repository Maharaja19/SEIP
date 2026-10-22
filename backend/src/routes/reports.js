const express = require("express");
const router = express.Router();
const { authorizeRole } = require("../middleware/auth");
const { USER_ROLES } = require("../utils/constants");
const { listReports } = require("../controllers/reportsController");

router.get(
  "/",
  authorizeRole([USER_ROLES.ADMIN, USER_ROLES.TREASURER, USER_ROLES.STUDENT]),
  listReports
);

module.exports = router;
