const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { createSubject } = require("../controllers/subject.controller");

const router = express.Router();

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createSubject
);

module.exports = router;
