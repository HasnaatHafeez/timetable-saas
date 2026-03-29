const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  getInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  deleteInstitution,
} = require("../controllers/institution.controller");

const router = express.Router();

router.get("/", auth, getInstitutions);
router.get("/:id", auth, getInstitutionById);
router.post("/", auth, createInstitution);
router.put("/:id", auth, updateInstitution);
router.delete("/:id", auth, deleteInstitution);

module.exports = router;
