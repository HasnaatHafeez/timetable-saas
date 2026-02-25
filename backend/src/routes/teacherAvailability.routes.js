const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { setTeacherAvailability } = require("../controllers/teacherAvailability.controller");

const router = express.Router();

router.post(
  "/set",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  setTeacherAvailability
);

module.exports = router;