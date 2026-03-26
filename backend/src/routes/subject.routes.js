const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} = require("../controllers/subject.controller");

const router = express.Router();

router.get("/", auth, tenant, getSubjects);
router.get("/:id", auth, tenant, getSubjectById);
router.post("/", auth, tenant, createSubject);
router.put("/:id", auth, tenant, updateSubject);
router.delete("/:id", auth, tenant, deleteSubject);

module.exports = router;
