const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacher.controller");

const router = express.Router();

router.get("/", auth, tenant, getTeachers);
router.get("/:id", auth, tenant, getTeacherById);
router.post("/", auth, tenant, requirePermission(PERMISSIONS.TEACHER_CREATE), createTeacher);
router.put("/:id", auth, tenant, requirePermission(PERMISSIONS.TEACHER_UPDATE), updateTeacher);
router.delete("/:id", auth, tenant, requirePermission(PERMISSIONS.TEACHER_DELETE), deleteTeacher);

module.exports = router;
