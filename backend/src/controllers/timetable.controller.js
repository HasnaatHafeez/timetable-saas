const prisma = require("../prisma/client");

exports.getTimetable = async (req, res) => {
  try {
    const timetableEntries = await prisma.timetable.findMany({
      where: { status: "DRAFT" },
      include: {
        subject: true,
        teacher: true,
        room: true,
        day: true,
        timeSlot: true,
      },
    });

    const sectionIds = [...new Set(timetableEntries.map((entry) => entry.sectionId).filter(Boolean))];
    const sections = await prisma.section.findMany({
      where: { id: { in: sectionIds } },
      select: {
        id: true,
        name: true,
        sectionCode: true,
        academicLevelId: true,
      },
    });

    const sectionsById = new Map(sections.map((section) => [section.id, section]));

    const academicLevelIds = [...new Set(sections.map((section) => section.academicLevelId).filter(Boolean))];
    const academicLevels = await prisma.academicLevel.findMany({
      where: { id: { in: academicLevelIds } },
      select: {
        id: true,
        name: true,
      },
    });

    const academicLevelsById = new Map(academicLevels.map((level) => [level.id, level.name]));

    const formatted = timetableEntries.map((entry) => {
      const sectionRecord = sectionsById.get(entry.sectionId);
      const semester = sectionRecord ? (academicLevelsById.get(sectionRecord.academicLevelId) || "") : "";
      const sectionLabel = sectionRecord?.sectionCode || sectionRecord?.name || "";
      const classLabel = `${semester}${sectionLabel ? " • " + sectionLabel : ""}`.trim();

      return {
      id: entry.id,
      day: entry.day?.dayName || "",
      time: entry.timeSlot?.startTime || "",
      subject: entry.subject?.name || "",
      teacher: entry.teacher?.name || "",
      room: entry.room?.name || "",
        className: sectionRecord?.name || "",
        semester,
        section: sectionLabel,
        class: classLabel,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch timetable" });
  }
};

exports.generateTimetable = async (req, res) => {
  try {
    // Temporary stubbed implementation to allow server startup while
    // the full generator is being refined. Returns a 501 with helpful info.
    const { campusId, academicLevelId, sectionId, scope = "section", roomShuffle = false } = req.body || {};

    return res.status(200).json({
      message: "Timetable generator temporarily disabled. Use /api/timetable/draft to view existing drafts.",
      received: { campusId, academicLevelId, sectionId, scope, roomShuffle },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to generate timetable", error: error.message });
  }
};