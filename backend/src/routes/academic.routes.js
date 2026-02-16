const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { createAcademicLevel } = require("../controllers/academic.controller");

const router = express.Router();

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createAcademicLevel
);

module.exports = router;
