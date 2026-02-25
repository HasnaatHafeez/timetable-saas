const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const {
  getTimeSlots,
  getTimeSlotById,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
} = require("../controllers/timeSlot.controller");

const router = express.Router();

router.get("/", auth, getTimeSlots);
router.get("/:id", auth, getTimeSlotById);

router.post(
  "/",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createTimeSlot
);

router.post(
  "/create",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  createTimeSlot
);

router.put(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  updateTimeSlot
);

router.delete(
  "/:id",
  auth,
  role(["INSTITUTION_OWNER", "STAFF_ADMIN"]),
  deleteTimeSlot
);

module.exports = router;