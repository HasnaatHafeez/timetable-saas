const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { createDepartment } = require("../controllers/department.controller");

const router = express.Router();

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createDepartment
);

module.exports = router;

