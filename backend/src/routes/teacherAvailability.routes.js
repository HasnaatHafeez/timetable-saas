const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
const { setTeacherAvailability, setMyAvailability } = require("../controllers/teacherAvailability.controller");

const router = express.Router();

router.post(
  "/set",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  setTeacherAvailability
);

router.post(
  "/self",
  auth,
  tenant,
  role(["TEACHER"]),
  setMyAvailability
);

module.exports = router;