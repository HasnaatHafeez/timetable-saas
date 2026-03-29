const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
  getStaffByInstitution,
  createStaffWithUser,
  updateStaff,
  deleteStaff,
} = require("../controllers/staff.controller");

const router = express.Router();

// Query by institutionId: /api/staff?institutionId=...
router.get("/", auth, requirePermission([PERMISSIONS.STAFF_READ_ALL, PERMISSIONS.STAFF_READ_OWN]), getStaffByInstitution);

// Create staff and user
router.post("/create-with-user", auth, requirePermission(PERMISSIONS.STAFF_CREATE), createStaffWithUser);

router.put("/:id", auth, requirePermission(PERMISSIONS.STAFF_UPDATE), updateStaff);
router.delete("/:id", auth, requirePermission(PERMISSIONS.STAFF_DELETE), deleteStaff);

module.exports = router;
