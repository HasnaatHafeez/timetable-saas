const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");

const router = express.Router();

router.get(
  "/owner-only",
  auth,
  requirePermission(PERMISSIONS.PROTECTED_OWNER_ONLY),
  (req, res) => {
    res.json({
      message: "Welcome Institution Owner",
      user: req.user,
    });
  }
);

module.exports = router;
