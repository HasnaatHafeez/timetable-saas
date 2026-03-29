const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const { assignSubjectToTeacher } = require("../controllers/teacherSubject.controller");

const router = express.Router();

router.post(
  "/assign",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TEACHER_SUBJECT_ASSIGN),
  assignSubjectToTeacher
);

module.exports = router;
