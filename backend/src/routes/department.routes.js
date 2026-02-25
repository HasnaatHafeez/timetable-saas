const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");

const router = express.Router();

router.get("/", auth, getDepartments);
router.get("/:id", auth, getDepartmentById);

router.post(
  "/",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createDepartment
);

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createDepartment
);

router.put(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateDepartment
);

router.delete(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteDepartment
);

module.exports = router;

