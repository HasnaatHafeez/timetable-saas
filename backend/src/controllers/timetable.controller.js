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
    const { campusId, academicLevelId, sectionId } = req.body;

 // 1️⃣ Get departments of this campus
const departments = await prisma.department.findMany({
  where: { campusId },
});

// Extract department IDs
const departmentIds = departments.map(d => d.id);

// 2️⃣ Get subjects of those departments
const subjects = await prisma.subject.findMany({
  where: {
    departmentId: {
      in: departmentIds,
    },
  },
});

    const teachers = await prisma.teacher.findMany({
      where: { campusId },
      include: { teacherSubjects: true },
    });

    const rooms = await prisma.room.findMany({
      where: { campusId },
    });

    const days = await prisma.workingDay.findMany({
      where: { campusId },
    });

    const timeSlots = await prisma.timeSlot.findMany({
      where: {
        campusId,
        isBreak: false,
      },
    });

    // Clear old draft timetable
    await prisma.timetable.deleteMany({
      where: {
        campusId,
        academicLevelId,
        sectionId,
        status: "DRAFT",
      },
    });

    let scheduled = [];

    for (const subject of subjects) {
      let remainingHours = subject.weeklyHours;

      while (remainingHours > 0) {
        let placed = false;

        for (const day of days) {
          for (const slot of timeSlots) {

            // Check if slot already used for this section
            const clash = scheduled.find(
              (t) =>
                t.dayId === day.id &&
                t.timeSlotId === slot.id
            );
            if (clash) continue;

            // Find eligible teacher
            const teacher = teachers.find((t) =>
              t.teacherSubjects.some(
                (ts) => ts.subjectId === subject.id
              )
            );

            if (!teacher) continue;

            // Find room
            const room = rooms.find(
              (r) =>
                subject.type === "LAB"
                  ? r.type === "LAB"
                  : r.type === "CLASSROOM"
            );

            if (!room) continue;
            const availability = await prisma.teacherAvailability.findFirst({
               where: {
               teacherId: teacher.id,
               dayId: day.id,
               timeSlotId: slot.id,
               isAvailable: true
              }
            });

if (!availability) continue;
// 🚫 Prevent teacher double booking
const teacherClash = await prisma.timetable.findFirst({
  where: {
    teacherId: teacher.id,
    dayId: day.id,
    timeSlotId: slot.id,
    status: "DRAFT"
  }
});

if (teacherClash) continue;
// 🚫 Prevent room clash
const roomClash = await prisma.timetable.findFirst({
  where: {
    roomId: room.id,
    dayId: day.id,
    timeSlotId: slot.id,
    status: "DRAFT"
  }
});

if (roomClash) continue;

// 📊 Count teacher's lectures for this day
const teacherDayCount = await prisma.timetable.count({
  where: {
    teacherId: teacher.id,
    dayId: day.id,
    status: "DRAFT"
  }
});

if (teacherDayCount >= teacher.maxPerDay) continue;

// 📊 Count teacher's weekly load
const teacherWeekCount = await prisma.timetable.count({
  where: {
    teacherId: teacher.id,
    status: "DRAFT"
  }
});

if (teacherWeekCount >= teacher.maxPerWeek) continue;
            // Create timetable entry
            const entry = await prisma.timetable.create({
              data: {
                campusId,
                academicLevelId,
                sectionId,
                subjectId: subject.id,
                teacherId: teacher.id,
                roomId: room.id,
                dayId: day.id,
                timeSlotId: slot.id,
                status: "DRAFT",
              },
            });

            scheduled.push(entry);
            remainingHours--;
            placed = true;
            break;
          }
          if (placed) break;
        }

        if (!placed) break;
      }
    }

    res.json({
      message: "Timetable generated (basic version)",
      totalEntries: scheduled.length,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to generate timetable",
      error: error.message,
    });
  }
};