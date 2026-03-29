const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const { setTeacherAvailability, setMyAvailability } = require("../controllers/teacherAvailability.controller");

const router = express.Router();

router.post(
  "/set",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TEACHER_AVAILABILITY_SET),
  setTeacherAvailability
);

router.post(
  "/self",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TEACHER_AVAILABILITY_SELF),
  setMyAvailability
);

module.exports = router;