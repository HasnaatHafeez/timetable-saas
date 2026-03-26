const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
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
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  getTimetableGenerationSettings
);

router.post(
  "/settings",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  saveTimetableGenerationSettings
);

router.post(
  "/generate",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  generateTimetable
);

router.put(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateTimetableEntry
);

router.delete(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteTimetableEntry
);

module.exports = router;