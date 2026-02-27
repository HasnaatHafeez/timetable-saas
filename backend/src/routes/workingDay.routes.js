const express = require("express");
const auth = require("../middlewares/auth.middleware");
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

router.get("/", auth, getWorkingDays);
router.get("/holidays", auth, getHolidays);
router.get("/:id", auth, getWorkingDayById);

router.post(
  "/holidays",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createHoliday
);

router.put(
  "/holidays/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateHoliday
);

router.delete(
  "/holidays/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteHoliday
);

router.post(
  "/",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createWorkingDay
);

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createWorkingDay
);

router.put(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateWorkingDay
);

router.delete(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteWorkingDay
);

module.exports = router;