const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { createTeacherWithUser } = require("../controllers/teacher.controller");

const router = express.Router();

router.post(
  "/create-with-user",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createTeacherWithUser
);

module.exports = router;
