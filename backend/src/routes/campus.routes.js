const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const {
  getCampuses,
  getCampusById,
  createCampus,
  updateCampus,
  deleteCampus,
  getAcademicLevels,
  createAcademicLevel,
} = require("../controllers/campus.controller");

const router = express.Router();

// Campus routes
router.get("/", auth, getCampuses);
router.get("/:id", auth, getCampusById);
router.post("/", auth, createCampus);
router.put("/:id", auth, updateCampus);
router.delete("/:id", auth, deleteCampus);

// Academic levels
router.get("/levels/list", auth, tenant, getAcademicLevels);
router.post("/levels", auth, tenant, createAcademicLevel);

module.exports = router;
