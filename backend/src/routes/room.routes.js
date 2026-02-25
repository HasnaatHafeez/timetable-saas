const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/room.controller");

const router = express.Router();

router.get("/", auth, getRooms);
router.get("/:id", auth, getRoomById);
router.post("/", auth, createRoom);
router.put("/:id", auth, updateRoom);
router.delete("/:id", auth, deleteRoom);

module.exports = router;