const prisma = require("../prisma/client");

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

const generateSchoolTimetable = async (req, res, campusId) => {
  const {
    sectionId,
    generationScope = "CLASS",
    subjectWeeklyLectures = {},
  } = req.body || {};

  const departments = await prisma.department.findMany({
    where: { campusId },
    select: { id: true },
  });
  const departmentIds = departments.map((item) => item.id);

  const subjects = await prisma.subject.findMany({
    where: {
      departmentId: { in: departmentIds },
    },
  });
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  const teachers = await prisma.teacher.findMany({
    where: { campusId },
    include: { teacherSubjects: true },
  });
  const teacherIds = teachers.map((teacher) => teacher.id);

  const rooms = await prisma.room.findMany({ where: { campusId } });
  const rawDays = await prisma.workingDay.findMany({ where: { campusId } });
  const rawTimeSlots = await prisma.timeSlot.findMany({ where: { campusId, isBreak: false } });
  const days = sortDaysMondayFirst(rawDays);
  const timeSlots = sortTimeSlotsChronologically(rawTimeSlots);

  if (teachers.length === 0 || rooms.length === 0 || days.length === 0 || timeSlots.length === 0) {
    return res.status(400).json({ message: "Teachers, rooms, working days, and non-break timeslots are required" });
  }

  const normalizedScope = String(generationScope || "CLASS").toUpperCase();
  let targetSections = [];

  if (normalizedScope === "INSTITUTE") {
    const levels = await prisma.academicLevel.findMany({
      where: { campusId },
      select: { id: true },
    });
    const levelIds = levels.map((level) => level.id);

    targetSections = await prisma.section.findMany({
      where: { academicLevelId: { in: levelIds } },
      select: { id: true, academicLevelId: true },
    });

    if (targetSections.length === 0) {
      return res.status(400).json({ message: "No sections found for this campus" });
    }

    await prisma.timetable.deleteMany({
      where: { campusId, status: "DRAFT" },
    });
  } else {
    if (!sectionId) {
      return res.status(400).json({ message: "sectionId is required for class-wise generation" });
    }

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true, academicLevelId: true },
    });

    if (!section) {
      return res.status(400).json({ message: "Invalid sectionId" });
    }

    const level = await prisma.academicLevel.findUnique({ where: { id: section.academicLevelId } });
    if (!level || level.campusId !== campusId) {
      return res.status(400).json({ message: "sectionId does not belong to selected campus" });
    }

    targetSections = [section];

    await prisma.timetable.deleteMany({
      where: {
        campusId,
        sectionId: section.id,
        academicLevelId: section.academicLevelId,
        status: "DRAFT",
      },
    });
  }

  const teacherAvailabilityRecords = await prisma.teacherAvailability.findMany({
    where: {
      teacherId: { in: teacherIds },
    },
    select: {
      teacherId: true,
      dayId: true,
      timeSlotId: true,
      isAvailable: true,
    },
  });

  const existingDraftEntries = await prisma.timetable.findMany({
    where: {
      campusId,
      status: "DRAFT",
    },
    select: {
      teacherId: true,
      roomId: true,
      sectionId: true,
      dayId: true,
      timeSlotId: true,
    },
  });

  const toAvailabilityKey = (teacherId, dayId, timeSlotId) => `${teacherId}_${dayId}_${timeSlotId}`;
  const toScheduleKey = (entityId, dayId, timeSlotId) => `${entityId}_${dayId}_${timeSlotId}`;

  const availabilityMap = new Map();
  for (const record of teacherAvailabilityRecords) {
    const key = toAvailabilityKey(record.teacherId, record.dayId, record.timeSlotId);
    availabilityMap.set(key, !!record.isAvailable);
  }

  const teacherScheduleMap = new Map();
  const roomScheduleMap = new Set();
  const sectionScheduleMap = new Set();
  const subjectDayCountMap = new Map();

  const ensureTeacherSchedule = (teacherId) => {
    if (!teacherScheduleMap.has(teacherId)) {
      teacherScheduleMap.set(teacherId, {
        weekCount: 0,
        dayCountMap: new Map(),
        slotSet: new Set(),
      });
    }
    return teacherScheduleMap.get(teacherId);
  };

  const toSubjectDayKey = (sectionId, subjectId, dayId) => `${sectionId}_${subjectId}_${dayId}`;

  for (const entry of existingDraftEntries) {
    const teacherSchedule = ensureTeacherSchedule(entry.teacherId);
    teacherSchedule.weekCount += 1;
    teacherSchedule.dayCountMap.set(
      entry.dayId,
      (teacherSchedule.dayCountMap.get(entry.dayId) || 0) + 1
    );
    teacherSchedule.slotSet.add(toScheduleKey(entry.teacherId, entry.dayId, entry.timeSlotId));

    roomScheduleMap.add(toScheduleKey(entry.roomId, entry.dayId, entry.timeSlotId));
    sectionScheduleMap.add(toScheduleKey(entry.sectionId, entry.dayId, entry.timeSlotId));
  }

  const subjectTeacherMap = new Map();
  for (const teacher of teachers) {
    for (const link of teacher.teacherSubjects) {
      const subjectTeachers = subjectTeacherMap.get(link.subjectId) || [];
      subjectTeachers.push(teacher);
      subjectTeacherMap.set(link.subjectId, subjectTeachers);
    }
  }

  let totalEntries = 0;
  const batchCreatedAt = new Date();

  for (const section of targetSections) {
    const sectionSubjectLinks = await prisma.sectionSubject.findMany({
      where: { sectionId: section.id },
      select: { subjectId: true },
    });

    const sectionSubjects = sectionSubjectLinks
      .map((link) => subjectById.get(link.subjectId))
      .filter(Boolean);

    if (sectionSubjects.length === 0) {
      if (normalizedScope === "CLASS") {
        return res.status(400).json({ message: "No subjects assigned to selected class/section" });
      }
      continue;
    }

    const lectureQueue = [];
    for (const subject of sectionSubjects) {
      const overrideHours = Number(subjectWeeklyLectures?.[subject.id]);
      const plannedLectures = Number.isFinite(overrideHours)
        ? Math.max(0, Math.floor(overrideHours))
        : Number(subject.weeklyHours) || 0;

      for (let i = 0; i < plannedLectures; i++) {
        lectureQueue.push(subject);
      }
    }

    if (lectureQueue.length === 0) {
      continue;
    }

    for (const day of days) {
      for (const slot of timeSlots) {
        if (lectureQueue.length === 0) {
          break;
        }

        let selectedSubjectIndex = -1;
        let selectedTeacher = null;
        let selectedRoom = null;

        for (let queueIndex = 0; queueIndex < lectureQueue.length; queueIndex++) {
          const subject = lectureQueue[queueIndex];

          const subjectDayKey = toSubjectDayKey(section.id, subject.id, day.id);
          const subjectDayCount = subjectDayCountMap.get(subjectDayKey) || 0;
          if (subjectDayCount >= 2) continue;

          const teacherCandidates = subjectTeacherMap.get(subject.id) || [];
          if (teacherCandidates.length === 0) continue;

          const roomCandidates = rooms.filter((room) =>
            subject.type === "LAB" ? room.type === "LAB" : room.type === "CLASSROOM"
          );
          if (roomCandidates.length === 0) continue;

          let foundTeacher = null;
          for (const teacher of teacherCandidates) {
            const availabilityKey = toAvailabilityKey(teacher.id, day.id, slot.id);
            if (!availabilityMap.get(availabilityKey)) continue;

            const teacherSchedule = ensureTeacherSchedule(teacher.id);
            const teacherSlotKey = toScheduleKey(teacher.id, day.id, slot.id);
            if (teacherSchedule.slotSet.has(teacherSlotKey)) continue;

            const teacherDayCount = teacherSchedule.dayCountMap.get(day.id) || 0;
            if (teacherDayCount >= teacher.maxPerDay) continue;

            if (teacherSchedule.weekCount >= teacher.maxPerWeek) continue;

            foundTeacher = teacher;
            break;
          }

          if (!foundTeacher) continue;

          let foundRoom = null;
          for (const room of roomCandidates) {
            const roomSlotKey = toScheduleKey(room.id, day.id, slot.id);
            if (!roomScheduleMap.has(roomSlotKey)) {
              foundRoom = room;
              break;
            }
          }

          if (!foundRoom) continue;

          selectedSubjectIndex = queueIndex;
          selectedTeacher = foundTeacher;
          selectedRoom = foundRoom;
          break;
        }

        if (selectedSubjectIndex === -1 || !selectedTeacher || !selectedRoom) {
          continue;
        }

        const subject = lectureQueue[selectedSubjectIndex];

        const sectionSlotKey = toScheduleKey(section.id, day.id, slot.id);
        if (sectionScheduleMap.has(sectionSlotKey)) {
          continue;
        }

        await prisma.timetable.create({
          data: {
            campusId,
            academicLevelId: section.academicLevelId,
            sectionId: section.id,
            subjectId: subject.id,
            teacherId: selectedTeacher.id,
            roomId: selectedRoom.id,
            dayId: day.id,
            timeSlotId: slot.id,
            status: "DRAFT",
            createdAt: batchCreatedAt,
          },
        });

        const teacherSchedule = ensureTeacherSchedule(selectedTeacher.id);
        const teacherSlotKey = toScheduleKey(selectedTeacher.id, day.id, slot.id);
        teacherSchedule.slotSet.add(teacherSlotKey);
        teacherSchedule.weekCount += 1;
        teacherSchedule.dayCountMap.set(
          day.id,
          (teacherSchedule.dayCountMap.get(day.id) || 0) + 1
        );

        const roomSlotKey = toScheduleKey(selectedRoom.id, day.id, slot.id);
        roomScheduleMap.add(roomSlotKey);
        sectionScheduleMap.add(sectionSlotKey);

        const subjectDayKey = toSubjectDayKey(section.id, subject.id, day.id);
        subjectDayCountMap.set(subjectDayKey, (subjectDayCountMap.get(subjectDayKey) || 0) + 1);

        lectureQueue.splice(selectedSubjectIndex, 1);
        totalEntries++;
      }
    }
  }

  return res.json({
    message: "School timetable generated",
    totalEntries,
  });
};

module.exports = {
  generateSchoolTimetable,
};
