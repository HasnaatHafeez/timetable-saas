const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const {
  getStaffByInstitution,
  createStaffWithUser,
  updateStaff,
  deleteStaff,
} = require("../controllers/staff.controller");

const router = express.Router();

// Query by institutionId: /api/staff?institutionId=...
router.get("/", auth, role(["INSTITUTION_OWNER"]), getStaffByInstitution);

// Create staff and user
router.post("/create-with-user", auth, role(["INSTITUTION_OWNER"]), createStaffWithUser);

router.put("/:id", auth, role(["INSTITUTION_OWNER"]), updateStaff);
router.delete("/:id", auth, role(["INSTITUTION_OWNER"]), deleteStaff);

module.exports = router;
