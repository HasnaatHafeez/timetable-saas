const prisma = require("../prisma/client");

exports.getWorkingDays = async (req, res) => {
  try {
    const { campusId } = req.query;

    const days = await prisma.workingDay.findMany({
      where: campusId ? { campusId } : undefined,
      orderBy: { dayName: "asc" },
    });

    res.json(days);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch working days" });
  }
};

exports.getWorkingDayById = async (req, res) => {
  try {
    const { id } = req.params;
    const day = await prisma.workingDay.findUnique({ where: { id } });

    if (!day) {
      return res.status(404).json({ message: "Working day not found" });
    }

    res.json(day);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch working day" });
  }
};

exports.createWorkingDay = async (req, res) => {
  try {
    const { campusId, dayName } = req.body;

    const day = await prisma.workingDay.create({
      data: {
        campusId,
        dayName,
      },
    });

    res.status(201).json({
      message: "Working day created successfully",
      day,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create working day" });
  }
};

exports.updateWorkingDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { dayName, campusId } = req.body;

    const existing = await prisma.workingDay.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Working day not found" });
    }

    const updated = await prisma.workingDay.update({
      where: { id },
      data: {
        ...(dayName !== undefined ? { dayName } : {}),
        ...(campusId !== undefined ? { campusId } : {}),
      },
    });

    res.json({
      message: "Working day updated successfully",
      day: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update working day" });
  }
};

exports.deleteWorkingDay = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.workingDay.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Working day not found" });
    }

    await prisma.workingDay.delete({ where: { id } });
    res.json({ message: "Working day deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete working day" });
  }
};