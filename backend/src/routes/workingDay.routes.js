const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
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
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createHoliday
);

router.put(
  "/holidays/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateHoliday
);

router.delete(
  "/holidays/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteHoliday
);

router.post(
  "/",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createWorkingDay
);

router.post(
  "/create",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createWorkingDay
);

router.put(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateWorkingDay
);

router.delete(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteWorkingDay
);

module.exports = router;