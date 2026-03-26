const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");

const router = express.Router();

router.get("/", auth, tenant, getDepartments);
router.get("/:id", auth, tenant, getDepartmentById);

router.post(
  "/",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createDepartment
);

router.post(
  "/create",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createDepartment
);

router.put(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateDepartment
);

router.delete(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteDepartment
);

module.exports = router;

