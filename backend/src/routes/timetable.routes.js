const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { generateTimetable, getTimetable } = require("../controllers/timetable.controller");

const router = express.Router();

router.get("/", auth, getTimetable);

router.post(
  "/generate",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  generateTimetable
);

module.exports = router;