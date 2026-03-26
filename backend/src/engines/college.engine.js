const prisma = require("../prisma/client");

const generateCollegeTimetable = async (req, res, campusId, helpers = {}) => {
  const { sortDaysMondayFirst, sortTimeSlotsChronologically } = helpers;

  const {
    sectionId,
    generationScope = "CLASS",
    changeRoomEveryLecture = false,
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

  let targetSections = [];
  const normalizedScope = String(generationScope || "CLASS").toUpperCase();

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

    const sectionScheduled = [];
    const fixedRoomBySubject = new Map();
    const roomRotationCursorBySubject = new Map();

    for (const subject of sectionSubjects) {
      const overrideHours = Number(subjectWeeklyLectures?.[subject.id]);
      const plannedLectures = Number.isFinite(overrideHours)
        ? Math.max(0, Math.floor(overrideHours))
        : Number(subject.weeklyHours) || 0;
      let remainingHours = plannedLectures;
      const subjectKey = `${section.id}:${subject.id}`;

      if (remainingHours <= 0) {
        continue;
      }

      while (remainingHours > 0) {
        let placed = false;

        for (const day of days) {
          for (const slot of timeSlots) {
            const sectionSlotKey = toScheduleKey(section.id, day.id, slot.id);
            if (sectionScheduleMap.has(sectionSlotKey)) continue;

            const sectionClash = sectionScheduled.find(
              (item) => item.dayId === day.id && item.timeSlotId === slot.id
            );
            if (sectionClash) continue;

            const sameSubjectSameDay = sectionScheduled.find(
              (item) => item.dayId === day.id && item.subjectId === subject.id
            );
            if (sameSubjectSameDay) continue;

            const teacherCandidates = subjectTeacherMap.get(subject.id) || [];
            const teacher = teacherCandidates.find((item) => {
              const availabilityKey = toAvailabilityKey(item.id, day.id, slot.id);
              if (!availabilityMap.get(availabilityKey)) return false;

              const teacherSchedule = ensureTeacherSchedule(item.id);
              const teacherSlotKey = toScheduleKey(item.id, day.id, slot.id);
              if (teacherSchedule.slotSet.has(teacherSlotKey)) return false;

              const teacherDayCount = teacherSchedule.dayCountMap.get(day.id) || 0;
              if (teacherDayCount >= item.maxPerDay) return false;

              if (teacherSchedule.weekCount >= item.maxPerWeek) return false;

              return true;
            });
            if (!teacher) continue;

            const roomCandidates = rooms.filter((room) =>
              subject.type === "LAB" ? room.type === "LAB" : room.type === "CLASSROOM"
            );
            if (roomCandidates.length === 0) continue;

            let selectedRoom = null;

            if (changeRoomEveryLecture) {
              const startCursor = roomRotationCursorBySubject.get(subjectKey) || 0;
              for (let offset = 0; offset < roomCandidates.length; offset++) {
                const idx = (startCursor + offset) % roomCandidates.length;
                const candidate = roomCandidates[idx];

                const roomSlotKey = toScheduleKey(candidate.id, day.id, slot.id);
                if (!roomScheduleMap.has(roomSlotKey)) {
                  selectedRoom = candidate;
                  roomRotationCursorBySubject.set(subjectKey, (idx + 1) % roomCandidates.length);
                  break;
                }
              }
            } else {
              const fixedRoomId = fixedRoomBySubject.get(subjectKey);
              if (fixedRoomId) {
                const fixedRoomSlotKey = toScheduleKey(fixedRoomId, day.id, slot.id);
                if (!roomScheduleMap.has(fixedRoomSlotKey)) {
                  selectedRoom = roomCandidates.find((room) => room.id === fixedRoomId) || null;
                }
              }

              if (!selectedRoom) {
                for (const candidate of roomCandidates) {
                  const roomSlotKey = toScheduleKey(candidate.id, day.id, slot.id);
                  if (!roomScheduleMap.has(roomSlotKey)) {
                    selectedRoom = candidate;
                    fixedRoomBySubject.set(subjectKey, candidate.id);
                    break;
                  }
                }
              }
            }

            if (!selectedRoom) continue;

            const entry = await prisma.timetable.create({
              data: {
                campusId,
                academicLevelId: section.academicLevelId,
                sectionId: section.id,
                subjectId: subject.id,
                teacherId: teacher.id,
                roomId: selectedRoom.id,
                dayId: day.id,
                timeSlotId: slot.id,
                status: "DRAFT",
                createdAt: batchCreatedAt,
              },
            });

            sectionScheduled.push(entry);
            const teacherSchedule = ensureTeacherSchedule(teacher.id);
            const teacherSlotKey = toScheduleKey(teacher.id, day.id, slot.id);
            teacherSchedule.slotSet.add(teacherSlotKey);
            teacherSchedule.weekCount += 1;
            teacherSchedule.dayCountMap.set(
              day.id,
              (teacherSchedule.dayCountMap.get(day.id) || 0) + 1
            );

            const roomSlotKey = toScheduleKey(selectedRoom.id, day.id, slot.id);
            roomScheduleMap.add(roomSlotKey);
            sectionScheduleMap.add(sectionSlotKey);

            totalEntries++;
            remainingHours--;
            placed = true;
            break;
          }
          if (placed) break;
        }

        if (!placed) break;
      }
    }
  }

  return res.json({
    message: "Timetable generated",
    scope: normalizedScope,
    totalEntries,
    changeRoomEveryLecture: !!changeRoomEveryLecture,
  });
};

module.exports = {
  generateCollegeTimetable,
};