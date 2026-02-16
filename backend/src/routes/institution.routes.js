const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { createInstitution } = require("../controllers/institution.controller");

const router = express.Router();

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER"]),
  createInstitution
);

module.exports = router;
