const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { requireFeature } = require("../middlewares/feature.middleware");
const { requireUsageLimit } = require("../middlewares/usage.middleware");
const { PERMISSIONS } = require("../config/permissions");
const { FEATURES } = require("../config/features");
const {
  generateTimetable,
  getTimetable,
  getTimetableHistory,
  getTimetableGenerationSettings,
  saveTimetableGenerationSettings,
  updateTimetableEntry,
  deleteTimetableEntry,
} = require("../controllers/timetable.controller");

const router = express.Router();

router.get("/", auth, tenant, getTimetable);
router.get("/history", auth, tenant, getTimetableHistory);
router.get(
  "/settings",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  getTimetableGenerationSettings
);

router.post(
  "/settings",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  saveTimetableGenerationSettings
);

router.post(
  "/generate",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMETABLE_GENERATE),
  requireFeature(FEATURES.TIMETABLE_GENERATE),
  requireUsageLimit("TIMETABLE_GENERATE_PER_MONTH"),
  generateTimetable
);

router.put(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  updateTimetableEntry
);

router.delete(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMETABLE_MANAGE),
  deleteTimetableEntry
);

module.exports = router;