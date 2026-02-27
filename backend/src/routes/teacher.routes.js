const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacher.controller");

const router = express.Router();

router.get("/", auth, getTeachers);
router.get("/:id", auth, getTeacherById);
router.post("/", auth, role(["INSTITUTION_OWNER"]), createTeacher);
router.put("/:id", auth, role(["INSTITUTION_OWNER"]), updateTeacher);
router.delete("/:id", auth, role(["INSTITUTION_OWNER"]), deleteTeacher);

module.exports = router;
