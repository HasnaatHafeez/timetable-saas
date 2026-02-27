const prisma = require("../prisma/client");

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const normalizeDayName = (value = "") => {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const sortByWeekOrder = (days = []) => {
  return [...days].sort((a, b) => {
    const indexA = DAY_ORDER.indexOf(String(a.dayName || "").toLowerCase());
    const indexB = DAY_ORDER.indexOf(String(b.dayName || "").toLowerCase());
    const safeA = indexA === -1 ? 999 : indexA;
    const safeB = indexB === -1 ? 999 : indexB;
    if (safeA !== safeB) return safeA - safeB;
    return String(a.dayName || "").localeCompare(String(b.dayName || ""));
  });
};

exports.getWorkingDays = async (req, res) => {
  try {
    const { campusId } = req.query;

    const days = await prisma.workingDay.findMany({
      where: campusId ? { campusId } : undefined,
    });

    res.json(sortByWeekOrder(days));
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

    if (!campusId || !dayName) {
      return res.status(400).json({ message: "campusId and dayName are required" });
    }

    const normalizedDayName = normalizeDayName(dayName);

    const day = await prisma.workingDay.create({
      data: {
        campusId,
        dayName: normalizedDayName,
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
        ...(dayName !== undefined ? { dayName: normalizeDayName(dayName) } : {}),
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

exports.getHolidays = async (req, res) => {
  try {
    const { campusId } = req.query;
    const holidays = await prisma.holiday.findMany({
      where: campusId ? { campusId } : undefined,
      orderBy: { date: "asc" },
    });
    res.json(holidays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch holidays" });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { campusId, date, name } = req.body;
    if (!campusId || !date || !name) {
      return res.status(400).json({ message: "campusId, date and name are required" });
    }

    const holiday = await prisma.holiday.create({
      data: {
        campusId,
        date: new Date(date),
        name: String(name).trim(),
      },
    });

    res.status(201).json({ message: "Holiday created successfully", holiday });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create holiday" });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name } = req.body;

    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(date !== undefined ? { date: new Date(date) } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
      },
    });

    res.json({ message: "Holiday updated successfully", holiday });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update holiday" });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    await prisma.holiday.delete({ where: { id } });
    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete holiday" });
  }
};