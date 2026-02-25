const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} = require("../controllers/subject.controller");

const router = express.Router();

router.get("/", auth, getSubjects);
router.get("/:id", auth, getSubjectById);
router.post("/", auth, createSubject);
router.put("/:id", auth, updateSubject);
router.delete("/:id", auth, deleteSubject);

module.exports = router;
