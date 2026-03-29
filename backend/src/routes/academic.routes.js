const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
  getAcademicLevels,
  getAcademicLevelById,
  createAcademicLevel,
  updateAcademicLevel,
  deleteAcademicLevel,
} = require("../controllers/academic.controller");

const router = express.Router();

router.get("/", auth, tenant, getAcademicLevels);
router.get("/:id", auth, tenant, getAcademicLevelById);

router.post(
  "/",
  auth,
  tenant,
  requirePermission(PERMISSIONS.ACADEMIC_LEVEL_CREATE),
  createAcademicLevel
);

router.post(
  "/create",
  auth,
  tenant,
  requirePermission(PERMISSIONS.ACADEMIC_LEVEL_CREATE),
  createAcademicLevel
);

router.put(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.ACADEMIC_LEVEL_UPDATE),
  updateAcademicLevel
);

router.delete(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.ACADEMIC_LEVEL_DELETE),
  deleteAcademicLevel
);

module.exports = router;
