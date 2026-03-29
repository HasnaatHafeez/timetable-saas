const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
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
  requirePermission(PERMISSIONS.DEPARTMENT_CREATE),
  createDepartment
);

router.post(
  "/create",
  auth,
  tenant,
  requirePermission(PERMISSIONS.DEPARTMENT_CREATE),
  createDepartment
);

router.put(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.DEPARTMENT_UPDATE),
  updateDepartment
);

router.delete(
  "/:id",
  auth,
  tenant,
  requirePermission(PERMISSIONS.DEPARTMENT_DELETE),
  deleteDepartment
);

module.exports = router;

