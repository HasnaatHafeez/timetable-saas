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