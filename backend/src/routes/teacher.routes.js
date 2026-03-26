const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
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
router.post("/", auth, tenant, role(["INSTITUTION_OWNER"]), createTeacher);
router.put("/:id", auth, tenant, role(["INSTITUTION_OWNER"]), updateTeacher);
router.delete("/:id", auth, tenant, role(["INSTITUTION_OWNER"]), deleteTeacher);

module.exports = router;
