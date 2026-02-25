const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const {
  getAcademicLevels,
  getAcademicLevelById,
  createAcademicLevel,
  updateAcademicLevel,
  deleteAcademicLevel,
} = require("../controllers/academic.controller");

const router = express.Router();

router.get("/", auth, getAcademicLevels);
router.get("/:id", auth, getAcademicLevelById);

router.post(
  "/",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createAcademicLevel
);

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createAcademicLevel
);

router.put(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateAcademicLevel
);

router.delete(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteAcademicLevel
);

module.exports = router;
