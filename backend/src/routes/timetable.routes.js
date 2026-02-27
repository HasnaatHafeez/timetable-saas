const express = require("express");
const auth = require("../middlewares/auth.middleware");
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

router.get("/", auth, getTimetable);
router.get("/history", auth, getTimetableHistory);
router.get(
  "/settings",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  getTimetableGenerationSettings
);

router.post(
  "/settings",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  saveTimetableGenerationSettings
);

router.post(
  "/generate",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  generateTimetable
);

router.put(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateTimetableEntry
);

router.delete(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteTimetableEntry
);

module.exports = router;