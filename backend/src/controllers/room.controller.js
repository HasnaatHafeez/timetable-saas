const prisma = require("../prisma/client");

exports.getRooms = async (req, res) => {
  try {
    const { campusId } = req.query;
    const rooms = await prisma.room.findMany({
      where: campusId ? { campusId } : undefined,
    });
    res.json(rooms.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      capacity: r.capacity,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id },
    });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json({
      id: room.id,
      name: room.name,
      type: room.type,
      capacity: room.capacity,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch room" });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { name, type, capacity, campusId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const normalizedType = type === "LAB" || type === "Lab" ? "LAB" : "CLASSROOM";

    const room = await prisma.room.create({
      data: {
        name,
        type: normalizedType,
        capacity: Number(capacity) || 0,
        campusId,
      },
    });

    res.status(201).json({
      _id: room.id,
      id: room.id,
      name: room.name,
      type: room.type === "LAB" ? "Lab" : "Lecture",
      capacity: room.capacity,
      campusId: room.campusId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create room" });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, capacity, campusId } = req.body;

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const normalizedType = type === "LAB" || type === "Lab" ? "LAB" : type === undefined ? undefined : "CLASSROOM";

    const updated = await prisma.room.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(normalizedType ? { type: normalizedType } : {}),
        ...(capacity !== undefined ? { capacity: Number(capacity) || 0 } : {}),
        ...(campusId ? { campusId } : {}),
      },
    });

    res.json({
      _id: updated.id,
      id: updated.id,
      name: updated.name,
      type: updated.type === "LAB" ? "Lab" : "Lecture",
      capacity: updated.capacity,
      campusId: updated.campusId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update room" });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    await prisma.room.delete({
      where: { id },
    });

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete room" });
  }
};