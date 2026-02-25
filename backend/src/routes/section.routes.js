const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/section.controller");

const router = express.Router();

router.get("/", auth, getSections);
router.get("/:id", auth, getSectionById);
router.post("/", auth, createSection);
router.put("/:id", auth, updateSection);
router.delete("/:id", auth, deleteSection);

module.exports = router;
