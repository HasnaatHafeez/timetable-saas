const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
const {
  getAcademicLevels,
  getAcademicLevelById,
  createAcademicLevel,
  updateAcademicLevel,
  deleteAcademicLevel,
} = require("../controllers/academic.controller");

const router = express.Router();

router.get("/", auth, tenant, getAcademicLevels);
router.get("/:id", auth, tenant, getAcademicLevelById);

router.post(
  "/",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createAcademicLevel
);

router.post(
  "/create",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createAcademicLevel
);

router.put(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateAcademicLevel
);

router.delete(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteAcademicLevel
);

module.exports = router;
