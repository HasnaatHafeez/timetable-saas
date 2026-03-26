const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
const { assignSubjectToTeacher } = require("../controllers/teacherSubject.controller");

const router = express.Router();

router.post(
  "/assign",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  assignSubjectToTeacher
);

module.exports = router;
