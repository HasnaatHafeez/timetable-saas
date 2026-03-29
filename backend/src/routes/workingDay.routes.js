const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
  getWorkingDays,
  getWorkingDayById,
  createWorkingDay,
  updateWorkingDay,
  deleteWorkingDay,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} = require("../controllers/workingDay.controller");

const router = express.Router();

router.get("/", auth, tenant, getWorkingDays);
router.get("/holidays", auth, tenant, getHolidays);
router.get("/:id", auth, tenant, getWorkingDayById);

router.post(
  "/holidays",
  auth,
  tenant,
  requirePermission(PERMISSIONS.WORKINGDAY_MANAGE),
  createHoliday
);

router.put(
  "/holidays/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.WORKINGDAY_MANAGE),
  updateHoliday
);

router.delete(
  "/holidays/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.WORKINGDAY_MANAGE),
  deleteHoliday
);

router.post(
  "/",
  auth,
  tenant,
  requirePermission(PERMISSIONS.WORKINGDAY_MANAGE),
  createWorkingDay
);

router.post(
  "/create",
  auth,
  tenant,
  requirePermission(PERMISSIONS.WORKINGDAY_MANAGE),
  createWorkingDay
);

router.put(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.WORKINGDAY_MANAGE),
  updateWorkingDay
);

router.delete(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.WORKINGDAY_MANAGE),
  deleteWorkingDay
);

module.exports = router;