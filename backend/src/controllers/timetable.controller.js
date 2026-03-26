const prisma = require("../prisma/client");
const { generateCollegeTimetable } = require("../engines/college.engine");
const { generateSchoolTimetable } = require("../engines/school.engine");

const WEEK_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const parseTimeToMinutes = (timeValue = "") => {
  const normalized = String(timeValue || "").trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = (match[3] || "").toUpperCase();

  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  return (hours * 60) + minutes;
};

const sortDaysMondayFirst = (days = []) => {
  return [...days].sort((a, b) => {
    const indexA = WEEK_ORDER.indexOf(String(a.dayName || "").toLowerCase());
    const indexB = WEEK_ORDER.indexOf(String(b.dayName || "").toLowerCase());
    const safeA = indexA === -1 ? 999 : indexA;
    const safeB = indexB === -1 ? 999 : indexB;
    if (safeA !== safeB) return safeA - safeB;
    return String(a.dayName || "").localeCompare(String(b.dayName || ""));
  });
};

const sortTimeSlotsChronologically = (timeSlots = []) => {
  return [...timeSlots].sort((a, b) => {
    const minutesA = parseTimeToMinutes(a.startTime);
    const minutesB = parseTimeToMinutes(b.startTime);
    if (minutesA !== minutesB) return minutesA - minutesB;
    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
};

const sortFormattedTimetableEntries = (entries = []) => {
  return [...entries].sort((a, b) => {
    const dayA = WEEK_ORDER.indexOf(String(a.day || "").toLowerCase());
    const dayB = WEEK_ORDER.indexOf(String(b.day || "").toLowerCase());
    const safeDayA = dayA === -1 ? 999 : dayA;
    const safeDayB = dayB === -1 ? 999 : dayB;
    if (safeDayA !== safeDayB) return safeDayA - safeDayB;

    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    if (timeA !== timeB) return timeA - timeB;

    return String(a.subject || "").localeCompare(String(b.subject || ""));
  });
};

const formatTimetableEntries = async (timetableEntries) => {
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

  return timetableEntries.map((entry) => {
    const sectionRecord = sectionsById.get(entry.sectionId);
    const semester = sectionRecord ? (academicLevelsById.get(sectionRecord.academicLevelId) || "") : "";
    const sectionLabel = sectionRecord?.sectionCode || sectionRecord?.name || "";
    const classLabel = `${semester}${sectionLabel ? " • " + sectionLabel : ""}`.trim();

    return {
      id: entry.id,
      generationBatchId: `${entry.campusId}:${new Date(entry.createdAt).toISOString()}`,
      campusId: entry.campusId,
      academicLevelId: entry.academicLevelId,
      sectionId: entry.sectionId,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
      roomId: entry.roomId,
      dayId: entry.dayId,
      timeSlotId: entry.timeSlotId,
      status: entry.status,
      createdAt: entry.createdAt,
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
};

exports.getTimetable = async (req, res) => {
  try {
    const { campusId } = req.query;
    const timetableEntries = await prisma.timetable.findMany({
      where: {
        status: "DRAFT",
        ...(campusId ? { campusId } : {}),
      },
      include: {
        subject: true,
        teacher: true,
        room: true,
        day: true,
        timeSlot: true,
      },
    });

    const formatted = sortFormattedTimetableEntries(await formatTimetableEntries(timetableEntries));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch timetable" });
  }
};

exports.getTimetableHistory = async (req, res) => {
  try {
    const { campusId } = req.query;
    const timetableEntries = await prisma.timetable.findMany({
      where: {
        ...(campusId ? { campusId } : {}),
      },
      include: {
        subject: true,
        teacher: true,
        room: true,
        day: true,
        timeSlot: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = sortFormattedTimetableEntries(await formatTimetableEntries(timetableEntries));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch timetable history" });
  }
};

exports.updateTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, roomId, dayId, timeSlotId } = req.body || {};

    const existing = await prisma.timetable.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Timetable entry not found" });
    }

    const nextTeacherId = teacherId || existing.teacherId;
    const nextRoomId = roomId || existing.roomId;
    const nextDayId = dayId || existing.dayId;
    const nextTimeSlotId = timeSlotId || existing.timeSlotId;

    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher || teacher.campusId !== existing.campusId) {
        return res.status(400).json({ message: "Invalid teacherId for this campus" });
      }
    }

    if (roomId) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room || room.campusId !== existing.campusId) {
        return res.status(400).json({ message: "Invalid roomId for this campus" });
      }
    }

    if (dayId) {
      const day = await prisma.workingDay.findUnique({ where: { id: dayId } });
      if (!day || day.campusId !== existing.campusId) {
        return res.status(400).json({ message: "Invalid dayId for this campus" });
      }
    }

    if (timeSlotId) {
      const slot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } });
      if (!slot || slot.campusId !== existing.campusId) {
        return res.status(400).json({ message: "Invalid timeSlotId for this campus" });
      }
    }

    const availability = await prisma.teacherAvailability.findFirst({
      where: {
        teacherId: nextTeacherId,
        dayId: nextDayId,
        timeSlotId: nextTimeSlotId,
        isAvailable: true,
      },
    });
    if (!availability) {
      return res.status(400).json({ message: "Teacher is not available for selected day/time" });
    }

    const teacherClash = await prisma.timetable.findFirst({
      where: {
        id: { not: id },
        teacherId: nextTeacherId,
        dayId: nextDayId,
        timeSlotId: nextTimeSlotId,
        status: "DRAFT",
      },
    });
    if (teacherClash) {
      return res.status(400).json({ message: "Teacher already assigned at this time" });
    }

    const roomClash = await prisma.timetable.findFirst({
      where: {
        id: { not: id },
        roomId: nextRoomId,
        dayId: nextDayId,
        timeSlotId: nextTimeSlotId,
        status: "DRAFT",
      },
    });
    if (roomClash) {
      return res.status(400).json({ message: "Room already in use at this time" });
    }

    const sectionClash = await prisma.timetable.findFirst({
      where: {
        id: { not: id },
        sectionId: existing.sectionId,
        dayId: nextDayId,
        timeSlotId: nextTimeSlotId,
        status: "DRAFT",
      },
    });
    if (sectionClash) {
      return res.status(400).json({ message: "Class already has a lecture at this time" });
    }

    await prisma.timetable.update({
      where: { id },
      data: {
        teacherId: nextTeacherId,
        roomId: nextRoomId,
        dayId: nextDayId,
        timeSlotId: nextTimeSlotId,
      },
    });

    const updated = await prisma.timetable.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: true,
        room: true,
        day: true,
        timeSlot: true,
      },
    });

    const [formatted] = await formatTimetableEntries(updated ? [updated] : []);
    return res.json(formatted || { message: "Updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update timetable entry", error: error.message });
  }
};

exports.deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.timetable.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Timetable entry not found" });
    }

    await prisma.timetable.delete({ where: { id } });
    return res.json({ message: "Timetable entry deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete timetable entry", error: error.message });
  }
};

exports.generateTimetable = async (req, res) => {
  try {
    const { campusId } = req.body || {};

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      include: { institution: true },
    });

    if (!campus) {
      return res.status(400).json({ message: "Invalid campusId" });
    }

    const institutionType = String(campus?.institution?.type || "").toUpperCase();

    if (institutionType === "COLLEGE") {
      return generateCollegeTimetable(req, res, campusId, {
        sortDaysMondayFirst,
        sortTimeSlotsChronologically,
      });
    }

    if (institutionType === "SCHOOL") {
      return generateSchoolTimetable(req, res, campusId);
    }

    if (institutionType === "UNIVERSITY") {
      return res.json({ message: "University engine not implemented yet" });
    }

    return res.status(400).json({ message: "Unsupported institution type" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to generate timetable", error: error.message });
  }
};

const sanitizeSubjectWeeklyLectures = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [subjectId, lectures]) => {
    const numericLectures = Number(lectures);
    acc[String(subjectId)] = Number.isFinite(numericLectures)
      ? Math.max(0, Math.floor(numericLectures))
      : 0;
    return acc;
  }, {});
};

exports.getTimetableGenerationSettings = async (req, res) => {
  try {
    const { campusId } = req.query || {};

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      include: { institution: true },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const setting = await prisma.timetableGenerationSetting.findUnique({
      where: {
        institutionId_institutionType: {
          institutionId: campus.institutionId,
          institutionType: campus.institution.type,
        },
      },
    });

    if (!setting) {
      return res.json({
        institutionId: campus.institutionId,
        institutionType: campus.institution.type,
        generationScope: "CLASS",
        changeRoomEveryLecture: false,
        selectedClassName: "",
        selectedAcademicLevelId: "",
        selectedSectionId: "",
        subjectWeeklyLectures: {},
      });
    }

    return res.json({
      institutionId: setting.institutionId,
      institutionType: setting.institutionType,
      generationScope: String(setting.generationScope || "CLASS").toUpperCase() === "INSTITUTE" ? "INSTITUTE" : "CLASS",
      changeRoomEveryLecture: !!setting.changeRoomEveryLecture,
      selectedClassName: setting.selectedClassName || "",
      selectedAcademicLevelId: setting.selectedAcademicLevelId || "",
      selectedSectionId: setting.selectedSectionId || "",
      subjectWeeklyLectures: sanitizeSubjectWeeklyLectures(setting.subjectWeeklyLectures),
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch timetable generation settings", error: error.message });
  }
};

exports.saveTimetableGenerationSettings = async (req, res) => {
  try {
    const {
      campusId,
      generationScope,
      changeRoomEveryLecture,
      selectedClassName,
      selectedAcademicLevelId,
      selectedSectionId,
      subjectWeeklyLectures,
    } = req.body || {};

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      include: { institution: true },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const normalizedScope = String(generationScope || "CLASS").toUpperCase() === "INSTITUTE" ? "INSTITUTE" : "CLASS";

    const upserted = await prisma.timetableGenerationSetting.upsert({
      where: {
        institutionId_institutionType: {
          institutionId: campus.institutionId,
          institutionType: campus.institution.type,
        },
      },
      create: {
        institutionId: campus.institutionId,
        institutionType: campus.institution.type,
        generationScope: normalizedScope,
        changeRoomEveryLecture: !!changeRoomEveryLecture,
        selectedClassName: selectedClassName || null,
        selectedAcademicLevelId: selectedAcademicLevelId || null,
        selectedSectionId: selectedSectionId || null,
        subjectWeeklyLectures: sanitizeSubjectWeeklyLectures(subjectWeeklyLectures),
        updatedByUserId: req.user?.id || null,
      },
      update: {
        generationScope: normalizedScope,
        changeRoomEveryLecture: !!changeRoomEveryLecture,
        selectedClassName: selectedClassName || null,
        selectedAcademicLevelId: selectedAcademicLevelId || null,
        selectedSectionId: selectedSectionId || null,
        subjectWeeklyLectures: sanitizeSubjectWeeklyLectures(subjectWeeklyLectures),
        updatedByUserId: req.user?.id || null,
      },
    });

    return res.json({
      message: "Timetable generation settings saved",
      institutionId: upserted.institutionId,
      institutionType: upserted.institutionType,
      updatedAt: upserted.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to save timetable generation settings", error: error.message });
  }
};