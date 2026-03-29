const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
  getCampuses,
  getCampusById,
  createCampus,
  updateCampus,
  deleteCampus,
  getAcademicLevels,
  createAcademicLevel,
  upgradeCampusPlan,
} = require("../controllers/campus.controller");

const router = express.Router();

// Campus routes
router.get("/", auth, requirePermission([PERMISSIONS.CAMPUS_READ_ALL, PERMISSIONS.CAMPUS_READ_OWN]), getCampuses);
router.get("/:id", auth, requirePermission([PERMISSIONS.CAMPUS_READ_ALL, PERMISSIONS.CAMPUS_READ_OWN]), getCampusById);
router.post("/", auth, requirePermission(PERMISSIONS.CAMPUS_CREATE), createCampus);
router.put("/:id", auth, requirePermission(PERMISSIONS.CAMPUS_UPDATE), updateCampus);
router.delete("/:id", auth, requirePermission(PERMISSIONS.CAMPUS_DELETE), deleteCampus);
router.post("/upgrade", auth, tenant, upgradeCampusPlan);

// Academic levels
router.get(
  "/levels/list",
  auth,
  tenant,
  requirePermission([PERMISSIONS.ACADEMIC_LEVEL_READ_ALL, PERMISSIONS.ACADEMIC_LEVEL_READ_OWN]),
  getAcademicLevels
);
router.post(
  "/levels",
  auth,
  tenant,
  requirePermission(PERMISSIONS.ACADEMIC_LEVEL_CREATE),
  createAcademicLevel
);

module.exports = router;
