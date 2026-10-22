const express = require("express");
const router = express.Router();
const { authorizeRole } = require("../middleware/auth");
const { USER_ROLES } = require("../utils/constants");
const { getRiskScore } = require("../controllers/riskController");

router.get(
  "/score",
  authorizeRole([USER_ROLES.ADMIN, USER_ROLES.TREASURER, USER_ROLES.STUDENT]),
  getRiskScore
);

module.exports = router;
