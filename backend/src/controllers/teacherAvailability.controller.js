const prisma = require("../prisma/client");

exports.setTeacherAvailability = async (req, res) => {
  try {
    const { teacherId, dayId, timeSlotId, isAvailable } = req.body;

    const availability = await prisma.teacherAvailability.upsert({
      where: {
        teacherId_dayId_timeSlotId: {
          teacherId,
          dayId,
          timeSlotId,
        },
      },
      update: {
        isAvailable,
      },
      create: {
        teacherId,
        dayId,
        timeSlotId,
        isAvailable,
      },
    });

    res.status(201).json({
      message: "Availability saved successfully",
      availability,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to set availability",
      error: error.message,
    });
  }
};

exports.setMyAvailability = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { availabilityByDay } = req.body || {};
    if (!availabilityByDay || typeof availabilityByDay !== "object") {
      return res.status(400).json({ message: "availabilityByDay is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) {
      return res.status(404).json({ message: "User not found" });
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        email: {
          equals: String(user.email || "").trim().toLowerCase(),
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    await prisma.teacherAvailability.deleteMany({ where: { teacherId: teacher.id } });

    const data = [];
    for (const [dayId, slotIds] of Object.entries(availabilityByDay)) {
      if (!Array.isArray(slotIds)) continue;
      const uniqueSlotIds = [...new Set(slotIds.filter(Boolean))];
      for (const timeSlotId of uniqueSlotIds) {
        data.push({
          teacherId: teacher.id,
          dayId,
          timeSlotId,
          isAvailable: true,
        });
      }
    }

    if (data.length > 0) {
      await prisma.teacherAvailability.createMany({
        data,
        skipDuplicates: true,
      });
    }

    return res.status(200).json({ message: "Availability updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to update availability",
      error: error.message,
    });
  }
};