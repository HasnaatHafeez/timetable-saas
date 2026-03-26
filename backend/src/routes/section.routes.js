const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/section.controller");

const router = express.Router();

router.get("/", auth, tenant, getSections);
router.get("/:id", auth, tenant, getSectionById);
router.post("/", auth, tenant, createSection);
router.put("/:id", auth, tenant, updateSection);
router.delete("/:id", auth, tenant, deleteSection);

module.exports = router;
