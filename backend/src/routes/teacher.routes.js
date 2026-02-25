const express = require("express");
const auth = require("../middlewares/auth.middleware");
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
router.post("/", auth, createTeacher);
router.put("/:id", auth, updateTeacher);
router.delete("/:id", auth, deleteTeacher);

module.exports = router;
