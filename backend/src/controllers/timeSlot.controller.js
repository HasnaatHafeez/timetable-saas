const prisma = require("../prisma/client");

exports.getTimeSlots = async (req, res) => {
  try {
    const { campusId } = req.query;

    const slots = await prisma.timeSlot.findMany({
      where: campusId ? { campusId } : undefined,
      orderBy: [{ startTime: "asc" }, { endTime: "asc" }],
    });

    res.json(
      slots.map((slot) => ({
        id: slot.id,
        campusId: slot.campusId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBreak: slot.isBreak,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch time slots" });
  }
};

exports.createTimeSlot = async (req, res) => {
  try {
    const { campusId, startTime, endTime, isBreak } = req.body;

    const timeSlot = await prisma.timeSlot.create({
      data: {
        campusId,
        startTime,
        endTime,
        isBreak: isBreak || false,
      },
    });

    res.status(201).json({
      message: "Time slot created successfully",
      timeSlot,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create time slot" });
  }
};

exports.getTimeSlotById = async (req, res) => {
  try {
    const { id } = req.params;

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id },
    });

    if (!timeSlot) {
      return res.status(404).json({ message: "Time slot not found" });
    }

    res.json(timeSlot);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch time slot" });
  }
};

exports.updateTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, isBreak } = req.body;

    const existing = await prisma.timeSlot.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Time slot not found" });
    }

    const updated = await prisma.timeSlot.update({
      where: { id },
      data: {
        ...(startTime !== undefined ? { startTime } : {}),
        ...(endTime !== undefined ? { endTime } : {}),
        ...(isBreak !== undefined ? { isBreak: Boolean(isBreak) } : {}),
      },
    });

    res.json({
      message: "Time slot updated successfully",
      timeSlot: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update time slot" });
  }
};

exports.deleteTimeSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.timeSlot.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Time slot not found" });
    }

    await prisma.timeSlot.delete({ where: { id } });

    res.json({ message: "Time slot deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete time slot" });
  }
};