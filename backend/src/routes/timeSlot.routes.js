const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const role = require("../middlewares/role.middleware");
const {
  getTimeSlots,
  getTimeSlotById,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} = require("../controllers/timeSlot.controller");

const router = express.Router();

router.get("/", auth, tenant, getTimeSlots);
router.get("/:id", auth, tenant, getTimeSlotById);

router.post(
  "/",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createTimeSlot
);

router.post(
  "/create",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createTimeSlot
);

router.put(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateTimeSlot
);

router.delete(
  "/:id",
  auth,
  tenant,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteTimeSlot
);

module.exports = router;