const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
  getTimeSlots,
  getTimeSlotById,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} = require("../controllers/timeSlot.controller");

const router = express.Router();

router.get("/", auth, tenant, getTimeSlots);
router.get("/:id", auth, tenant, getTimeSlotById);

router.post(
  "/",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMESLOT_MANAGE),
  createTimeSlot
);

router.post(
  "/create",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMESLOT_MANAGE),
  createTimeSlot
);

router.put(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMESLOT_MANAGE),
  updateTimeSlot
);

router.delete(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.TIMESLOT_MANAGE),
  deleteTimeSlot
);

module.exports = router;