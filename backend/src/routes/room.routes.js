const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/room.controller");

const router = express.Router();

router.get("/", auth, tenant, getRooms);
router.get("/:id", auth, tenant, getRoomById);
router.post("/", auth, tenant, createRoom);
router.put("/:id", auth, tenant, updateRoom);
router.delete("/:id", auth, tenant, deleteRoom);

module.exports = router;