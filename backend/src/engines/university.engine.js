const prisma = require("../prisma/client");

const WEEK_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEK_LOAD_WEIGHT = 0.6;
const DAY_LOAD_WEIGHT = 0.4;
const CONSECUTIVE_SLOT_PENALTY = 0.75;
const SLOT_DAY_LOAD_WEIGHT = 1;
const SLOT_SUBJECT_DAY_WEIGHT = 1;
const SLOT_AVAILABILITY_DENSITY_WEIGHT = 1;
const SLOT_CONSECUTIVE_RISK_WEIGHT = 1;

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

const shuffleArray = (items = []) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [result[i], result[randomIndex]] = [result[randomIndex], result[i]];
  }
  return result;
};

const generateUniversityTimetable = async (req, res, campusId) => {
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
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));

  const rooms = await prisma.room.findMany({ where: { campusId } });
  const rawDays = await prisma.workingDay.findMany({ where: { campusId } });
  const rawTimeSlots = await prisma.timeSlot.findMany({ where: { campusId, isBreak: false } });
  const days = sortDaysMondayFirst(rawDays);
  const timeSlots = sortTimeSlotsChronologically(rawTimeSlots);
  const slotIndexById = new Map(timeSlots.map((slot, index) => [slot.id, index]));

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

  const sectionAcademicLevelMap = new Map(
    targetSections.map((section) => [section.id, section.academicLevelId])
  );

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
    availabilityMap.set(
      toAvailabilityKey(record.teacherId, record.dayId, record.timeSlotId),
      !!record.isAvailable
    );
  }

  const teacherScheduleMap = new Map();
  const roomScheduleMap = new Set();
  const sectionScheduleMap = new Set();
  const dayLoadMap = new Map();
  const subjectDayCountMap = new Map();
  const assignmentMap = new Map();
  const sectionSlotAssignmentMap = new Map();
  const swapAttemptMap = new Map();
  let assignmentSequence = 0;

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

  const canUseTeacher = (teacher, dayId, slotIds = []) => {
    const teacherSchedule = ensureTeacherSchedule(teacher.id);
    const teacherDayCount = teacherSchedule.dayCountMap.get(dayId) || 0;
    const requestedSlots = slotIds.length;

    if ((teacherDayCount + requestedSlots) > teacher.maxPerDay) return false;
    if ((teacherSchedule.weekCount + requestedSlots) > teacher.maxPerWeek) return false;

    for (const slotId of slotIds) {
      const availabilityKey = toAvailabilityKey(teacher.id, dayId, slotId);
      if (!availabilityMap.get(availabilityKey)) return false;

      const teacherSlotKey = toScheduleKey(teacher.id, dayId, slotId);
      if (teacherSchedule.slotSet.has(teacherSlotKey)) return false;
    }

    return true;
  };

  const canUseRoom = (roomId, dayId, slotIds = []) => {
    for (const slotId of slotIds) {
      const roomSlotKey = toScheduleKey(roomId, dayId, slotId);
      if (roomScheduleMap.has(roomSlotKey)) return false;
    }
    return true;
  };

  const canUseSection = (sectionIdValue, dayId, slotIds = []) => {
    for (const slotId of slotIds) {
      const sectionSlotKey = toScheduleKey(sectionIdValue, dayId, slotId);
      if (sectionScheduleMap.has(sectionSlotKey)) return false;
    }
    return true;
  };

  const getTeacherConsecutivePenalty = (teacherId, dayId, slotIds = []) => {
    const teacherSchedule = ensureTeacherSchedule(teacherId);
    const hasConsecutivePreviousSlot = slotIds.some((slotId) => {
      const slotIndex = slotIndexById.get(slotId);
      if (slotIndex === undefined || slotIndex <= 0) return false;

      const previousSlotId = timeSlots[slotIndex - 1]?.id;
      if (!previousSlotId) return false;

      const previousTeacherSlotKey = toScheduleKey(teacherId, dayId, previousSlotId);
      return teacherSchedule.slotSet.has(previousTeacherSlotKey);
    });

    return hasConsecutivePreviousSlot ? CONSECUTIVE_SLOT_PENALTY : 0;
  };

  const selectBestScoredTeacher = (teacherCandidates = [], dayId, slotIds = []) => {
    let selected = null;
    let lowestScore = Number.POSITIVE_INFINITY;

    for (const candidate of teacherCandidates) {
      if (!canUseTeacher(candidate, dayId, slotIds)) continue;

      const teacherSchedule = ensureTeacherSchedule(candidate.id);
      const weekLoad = teacherSchedule.weekCount;
      const dayLoad = teacherSchedule.dayCountMap.get(dayId) || 0;
      const availabilityPreference = slotIds.every((slotId) =>
        availabilityMap.get(toAvailabilityKey(candidate.id, dayId, slotId))
      ) ? 0 : 1;
      const consecutivePenalty = getTeacherConsecutivePenalty(candidate.id, dayId, slotIds);

      const score =
        (weekLoad * WEEK_LOAD_WEIGHT) +
        (dayLoad * DAY_LOAD_WEIGHT) +
        availabilityPreference +
        consecutivePenalty;

      if (score < lowestScore) {
        lowestScore = score;
        selected = {
          teacher: candidate,
          score,
          consecutivePenalty,
        };
      }
    }

    return selected;
  };

  const selectAlternativeValidTeacher = (teacherCandidates = [], dayId, slotIds = []) => {
    const randomizedCandidates = shuffleArray(teacherCandidates);

    for (const candidate of randomizedCandidates) {
      if (canUseTeacher(candidate, dayId, slotIds)) {
        return candidate;
      }
    }

    return null;
  };

  const toDayLoadKey = (sectionIdValue, dayId) => `${sectionIdValue}_${dayId}`;
  const toSubjectDayKey = (sectionIdValue, subjectId, dayId) => `${sectionIdValue}_${subjectId}_${dayId}`;

  const getDayLoad = (sectionIdValue, dayId) => dayLoadMap.get(toDayLoadKey(sectionIdValue, dayId)) || 0;
  const getSubjectDayCount = (sectionIdValue, subjectId, dayId) =>
    subjectDayCountMap.get(toSubjectDayKey(sectionIdValue, subjectId, dayId)) || 0;

  const incrementDayLoad = (sectionIdValue, dayId, byValue = 1) => {
    const key = toDayLoadKey(sectionIdValue, dayId);
    dayLoadMap.set(key, (dayLoadMap.get(key) || 0) + byValue);
  };

  const incrementSubjectDayCount = (sectionIdValue, subjectId, dayId, byValue = 1) => {
    const key = toSubjectDayKey(sectionIdValue, subjectId, dayId);
    subjectDayCountMap.set(key, (subjectDayCountMap.get(key) || 0) + byValue);
  };

  const decrementDayLoad = (sectionIdValue, dayId, byValue = 1) => {
    const key = toDayLoadKey(sectionIdValue, dayId);
    const nextValue = Math.max(0, (dayLoadMap.get(key) || 0) - byValue);
    if (nextValue === 0) {
      dayLoadMap.delete(key);
      return;
    }
    dayLoadMap.set(key, nextValue);
  };

  const decrementSubjectDayCount = (sectionIdValue, subjectId, dayId, byValue = 1) => {
    const key = toSubjectDayKey(sectionIdValue, subjectId, dayId);
    const nextValue = Math.max(0, (subjectDayCountMap.get(key) || 0) - byValue);
    if (nextValue === 0) {
      subjectDayCountMap.delete(key);
      return;
    }
    subjectDayCountMap.set(key, nextValue);
  };

  const getSortedDaysForPlacement = (sectionIdValue, subjectId) => {
    return [...days].sort((dayA, dayB) => {
      const dayLoadA = getDayLoad(sectionIdValue, dayA.id);
      const dayLoadB = getDayLoad(sectionIdValue, dayB.id);
      if (dayLoadA !== dayLoadB) return dayLoadA - dayLoadB;

      const subjectCountA = getSubjectDayCount(sectionIdValue, subjectId, dayA.id);
      const subjectCountB = getSubjectDayCount(sectionIdValue, subjectId, dayB.id);
      if (subjectCountA !== subjectCountB) return subjectCountA - subjectCountB;

      return 0;
    });
  };

  const getAvailabilityDensity = (teacherCandidates = [], dayId, slotIds = []) => {
    if (teacherCandidates.length === 0) return 0;

    let availableCount = 0;
    for (const candidate of teacherCandidates) {
      const isAvailableForAllSlots = slotIds.every((slotId) =>
        availabilityMap.get(toAvailabilityKey(candidate.id, dayId, slotId))
      );
      if (isAvailableForAllSlots) {
        availableCount += 1;
      }
    }

    return availableCount / teacherCandidates.length;
  };

  const getConsecutiveRisk = (teacherCandidates = [], dayId, slotIds = []) => {
    if (teacherCandidates.length === 0) return 1;

    let consecutiveRiskCount = 0;
    for (const candidate of teacherCandidates) {
      if (getTeacherConsecutivePenalty(candidate.id, dayId, slotIds) > 0) {
        consecutiveRiskCount += 1;
      }
    }

    return consecutiveRiskCount / teacherCandidates.length;
  };

  const computeSlotScore = ({
    sectionIdValue,
    subjectId,
    teacherCandidates,
    dayId,
    slotIds,
    selectedTeacher,
    selectedTeacherScore = 0,
  }) => {
    const dayLoad = getDayLoad(sectionIdValue, dayId);
    const subjectDayCount = getSubjectDayCount(sectionIdValue, subjectId, dayId);
    const availabilityDensity = getAvailabilityDensity(teacherCandidates, dayId, slotIds);
    const consecutiveRisk = getConsecutiveRisk(teacherCandidates, dayId, slotIds);

    return (
      (dayLoad * SLOT_DAY_LOAD_WEIGHT) +
      (subjectDayCount * SLOT_SUBJECT_DAY_WEIGHT) +
      ((1 - availabilityDensity) * SLOT_AVAILABILITY_DENSITY_WEIGHT) +
      (consecutiveRisk * SLOT_CONSECUTIVE_RISK_WEIGHT) +
      selectedTeacherScore +
      getTeacherConsecutivePenalty(selectedTeacher.id, dayId, slotIds)
    );
  };

  const selectBestSlotOption = ({
    sectionIdValue,
    subjectId,
    teacherCandidates,
    roomCandidates,
    slotGroups,
    useAlternativeTeacher = false,
  }) => {
    let bestOption = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const slotGroup of slotGroups) {
      const { day, slotIds } = slotGroup;

      if (!canUseSection(sectionIdValue, day.id, slotIds)) continue;

      let selectedTeacher = null;
      let selectedTeacherScore = 0;

      if (useAlternativeTeacher) {
        selectedTeacher = selectAlternativeValidTeacher(teacherCandidates, day.id, slotIds);
      } else {
        const teacherSelection = selectBestScoredTeacher(teacherCandidates, day.id, slotIds);
        selectedTeacher = teacherSelection?.teacher || null;
        selectedTeacherScore = teacherSelection?.score || 0;
      }

      if (!selectedTeacher) continue;

      const selectedRoom = roomCandidates.find((room) => canUseRoom(room.id, day.id, slotIds));
      if (!selectedRoom) continue;

      const optionScore = computeSlotScore({
        sectionIdValue,
        subjectId,
        teacherCandidates,
        dayId: day.id,
        slotIds,
        selectedTeacher,
        selectedTeacherScore,
      });

      if (optionScore < bestScore) {
        bestScore = optionScore;
        bestOption = {
          day,
          slotIds,
          teacher: selectedTeacher,
          room: selectedRoom,
        };
      }
    }

    return bestOption;
  };

  const markTeacher = (teacherId, dayId, slotId) => {
    const teacherSchedule = ensureTeacherSchedule(teacherId);
    const teacherSlotKey = toScheduleKey(teacherId, dayId, slotId);
    teacherSchedule.slotSet.add(teacherSlotKey);
    teacherSchedule.weekCount += 1;
    teacherSchedule.dayCountMap.set(
      dayId,
      (teacherSchedule.dayCountMap.get(dayId) || 0) + 1
    );
  };

  const markRoom = (roomId, dayId, slotId) => {
    roomScheduleMap.add(toScheduleKey(roomId, dayId, slotId));
  };

  const markSection = (sectionIdValue, dayId, slotId) => {
    sectionScheduleMap.add(toScheduleKey(sectionIdValue, dayId, slotId));
  };

  const unmarkTeacher = (teacherId, dayId, slotId) => {
    const teacherSchedule = ensureTeacherSchedule(teacherId);
    const teacherSlotKey = toScheduleKey(teacherId, dayId, slotId);
    teacherSchedule.slotSet.delete(teacherSlotKey);
    teacherSchedule.weekCount = Math.max(0, teacherSchedule.weekCount - 1);

    const nextDayCount = Math.max(0, (teacherSchedule.dayCountMap.get(dayId) || 0) - 1);
    if (nextDayCount === 0) {
      teacherSchedule.dayCountMap.delete(dayId);
    } else {
      teacherSchedule.dayCountMap.set(dayId, nextDayCount);
    }
  };

  const unmarkRoom = (roomId, dayId, slotId) => {
    roomScheduleMap.delete(toScheduleKey(roomId, dayId, slotId));
  };

  const unmarkSection = (sectionIdValue, dayId, slotId) => {
    sectionScheduleMap.delete(toScheduleKey(sectionIdValue, dayId, slotId));
  };

  const applyAssignmentToMaps = (assignment) => {
    for (const slotId of assignment.slotIds) {
      markTeacher(assignment.teacherId, assignment.dayId, slotId);
      markRoom(assignment.roomId, assignment.dayId, slotId);
      markSection(assignment.sectionId, assignment.dayId, slotId);
      sectionSlotAssignmentMap.set(
        toScheduleKey(assignment.sectionId, assignment.dayId, slotId),
        assignment.id
      );
    }

    incrementDayLoad(assignment.sectionId, assignment.dayId, assignment.slotIds.length);
    incrementSubjectDayCount(
      assignment.sectionId,
      assignment.subjectId,
      assignment.dayId,
      assignment.slotIds.length
    );
  };

  const removeAssignmentFromMaps = (assignment) => {
    for (const slotId of assignment.slotIds) {
      unmarkTeacher(assignment.teacherId, assignment.dayId, slotId);
      unmarkRoom(assignment.roomId, assignment.dayId, slotId);
      unmarkSection(assignment.sectionId, assignment.dayId, slotId);
      sectionSlotAssignmentMap.delete(
        toScheduleKey(assignment.sectionId, assignment.dayId, slotId)
      );
    }

    decrementDayLoad(assignment.sectionId, assignment.dayId, assignment.slotIds.length);
    decrementSubjectDayCount(
      assignment.sectionId,
      assignment.subjectId,
      assignment.dayId,
      assignment.slotIds.length
    );
  };

  const persistAndRegisterAssignment = async ({
    sectionIdValue,
    academicLevelId,
    subject,
    bestOption,
    createdAt,
  }) => {
    const rows = [];
    for (const slotId of bestOption.slotIds) {
      const row = await prisma.timetable.create({
        data: {
          campusId,
          academicLevelId,
          sectionId: sectionIdValue,
          subjectId: subject.id,
          teacherId: bestOption.teacher.id,
          roomId: bestOption.room.id,
          dayId: bestOption.day.id,
          timeSlotId: slotId,
          status: "DRAFT",
          createdAt,
        },
      });
      rows.push(row);
      totalEntries++;
    }

    const assignmentId = `asg_${++assignmentSequence}`;
    const assignment = {
      id: assignmentId,
      sectionId: sectionIdValue,
      subjectId: subject.id,
      subjectType: subject.type,
      teacherId: bestOption.teacher.id,
      roomId: bestOption.room.id,
      dayId: bestOption.day.id,
      slotIds: [...bestOption.slotIds],
      rowIds: rows.map((row) => row.id),
    };

    assignmentMap.set(assignmentId, assignment);
    applyAssignmentToMaps(assignment);

    return assignment;
  };

  const getSlotGroupsForSubject = (subjectType, candidateDays, candidateTimeSlots) => {
    const slotGroups = [];

    if (subjectType === "LAB") {
      for (const day of candidateDays) {
        for (let slotIndex = 0; slotIndex < candidateTimeSlots.length - 1; slotIndex++) {
          const slotA = candidateTimeSlots[slotIndex];
          const slotB = candidateTimeSlots[slotIndex + 1];
          slotGroups.push({
            day,
            slotIds: [slotA.id, slotB.id],
          });
        }
      }
      return slotGroups;
    }

    for (const day of candidateDays) {
      for (const slot of candidateTimeSlots) {
        slotGroups.push({
          day,
          slotIds: [slot.id],
        });
      }
    }

    return slotGroups;
  };

  const getSwapAttemptKey = (sectionIdValue, subjectId) => `${sectionIdValue}_${subjectId}`;

  const tryLocalSwapForFailedPlacement = async ({
    sectionIdValue,
    subject,
    teacherCandidates,
    roomCandidates,
    slotGroups,
    useAlternativeTeacher = false,
  }) => {
    const attemptKey = getSwapAttemptKey(sectionIdValue, subject.id);
    const currentAttempts = swapAttemptMap.get(attemptKey) || 0;
    if (currentAttempts >= 3) return null;
    swapAttemptMap.set(attemptKey, currentAttempts + 1);

    for (const targetGroup of slotGroups) {
      const conflictingAssignmentIds = new Set();

      for (const slotId of targetGroup.slotIds) {
        const assignmentId = sectionSlotAssignmentMap.get(
          toScheduleKey(sectionIdValue, targetGroup.day.id, slotId)
        );
        if (assignmentId) {
          conflictingAssignmentIds.add(assignmentId);
        }
      }

      if (conflictingAssignmentIds.size === 0) continue;

      for (const assignmentId of conflictingAssignmentIds) {
        const conflictingAssignment = assignmentMap.get(assignmentId);
        if (!conflictingAssignment) continue;

        const conflictingSubject = subjectById.get(conflictingAssignment.subjectId);
        if (!conflictingSubject) continue;

        const conflictingTeacherCandidates = subjectTeacherMap.get(conflictingSubject.id) || [];
        const conflictingTeacher = teacherById.get(conflictingAssignment.teacherId);
        if (!conflictingTeacher) continue;

        const currentConflictingScore = computeSlotScore({
          sectionIdValue: conflictingAssignment.sectionId,
          subjectId: conflictingAssignment.subjectId,
          teacherCandidates: conflictingTeacherCandidates,
          dayId: conflictingAssignment.dayId,
          slotIds: conflictingAssignment.slotIds,
          selectedTeacher: conflictingTeacher,
          selectedTeacherScore: 0,
        });

        removeAssignmentFromMaps(conflictingAssignment);

        const relocationDays = getSortedDaysForPlacement(
          conflictingAssignment.sectionId,
          conflictingAssignment.subjectId
        );
        const relocationSlotGroups = getSlotGroupsForSubject(
          conflictingSubject.type,
          relocationDays,
          timeSlots
        ).filter((group) => {
          if (group.day.id === conflictingAssignment.dayId) {
            const sameSlots =
              group.slotIds.length === conflictingAssignment.slotIds.length &&
              group.slotIds.every((slotId, index) => slotId === conflictingAssignment.slotIds[index]);
            if (sameSlots) return false;
          }

          if (group.day.id !== targetGroup.day.id) return true;
          if (group.slotIds.length !== targetGroup.slotIds.length) return true;
          return !group.slotIds.every((slotId, index) => slotId === targetGroup.slotIds[index]);
        });

        const relocationRooms = rooms.filter((room) =>
          conflictingSubject.type === "LAB" ? room.type === "LAB" : room.type === "CLASSROOM"
        );

        const relocationOption = selectBestSlotOption({
          sectionIdValue: conflictingAssignment.sectionId,
          subjectId: conflictingAssignment.subjectId,
          teacherCandidates: conflictingTeacherCandidates,
          roomCandidates: relocationRooms,
          slotGroups: relocationSlotGroups,
          useAlternativeTeacher,
        });

        if (!relocationOption) {
          applyAssignmentToMaps(conflictingAssignment);
          continue;
        }

        const pendingOption = selectBestSlotOption({
          sectionIdValue,
          subjectId: subject.id,
          teacherCandidates,
          roomCandidates,
          slotGroups: [targetGroup],
          useAlternativeTeacher,
        });

        if (!pendingOption) {
          applyAssignmentToMaps(conflictingAssignment);
          continue;
        }

        const relocationScore = computeSlotScore({
          sectionIdValue: conflictingAssignment.sectionId,
          subjectId: conflictingAssignment.subjectId,
          teacherCandidates: conflictingTeacherCandidates,
          dayId: relocationOption.day.id,
          slotIds: relocationOption.slotIds,
          selectedTeacher: relocationOption.teacher,
          selectedTeacherScore: 0,
        });

        if (relocationScore >= currentConflictingScore) {
          applyAssignmentToMaps(conflictingAssignment);
          continue;
        }

        for (let rowIndex = 0; rowIndex < conflictingAssignment.rowIds.length; rowIndex++) {
          await prisma.timetable.update({
            where: { id: conflictingAssignment.rowIds[rowIndex] },
            data: {
              teacherId: relocationOption.teacher.id,
              roomId: relocationOption.room.id,
              dayId: relocationOption.day.id,
              timeSlotId: relocationOption.slotIds[rowIndex],
            },
          });
        }

        conflictingAssignment.teacherId = relocationOption.teacher.id;
        conflictingAssignment.roomId = relocationOption.room.id;
        conflictingAssignment.dayId = relocationOption.day.id;
        conflictingAssignment.slotIds = [...relocationOption.slotIds];

        applyAssignmentToMaps(conflictingAssignment);

        return pendingOption;
      }
    }

    return null;
  };

  const subjectTrackingMap = new Map();
  const ensureSubjectTracking = (sectionIdValue, subjectId, subjectType) => {
    const key = `${sectionIdValue}_${subjectId}`;
    if (!subjectTrackingMap.has(key)) {
      subjectTrackingMap.set(key, {
        sectionId: sectionIdValue,
        subjectId,
        subjectType,
        required: 0,
        scheduled: 0,
      });
    }
    const tracking = subjectTrackingMap.get(key);
    if (!tracking.subjectType && subjectType) {
      tracking.subjectType = subjectType;
    }
    return tracking;
  };

  const getPlannedSessionsForSubject = (subject) => {
    const overrideHours = Number(subjectWeeklyLectures?.[subject.id]);
    return Number.isFinite(overrideHours)
      ? Math.max(0, Math.floor(overrideHours))
      : Number(subject.weeklyHours) || 0;
  };

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

    const labSessions = [];
    const theorySessions = [];

    const orderedSectionSubjects = [...sectionSubjects].sort((subjectA, subjectB) => {
      const teacherCountA = (subjectTeacherMap.get(subjectA.id) || []).length;
      const teacherCountB = (subjectTeacherMap.get(subjectB.id) || []).length;
      if (teacherCountA !== teacherCountB) return teacherCountA - teacherCountB;

      const plannedSessionsA = getPlannedSessionsForSubject(subjectA);
      const plannedSessionsB = getPlannedSessionsForSubject(subjectB);
      if (plannedSessionsA !== plannedSessionsB) return plannedSessionsB - plannedSessionsA;

      const labPriorityA = subjectA.type === "LAB" ? 0 : 1;
      const labPriorityB = subjectB.type === "LAB" ? 0 : 1;
      if (labPriorityA !== labPriorityB) return labPriorityA - labPriorityB;

      return String(subjectA.id).localeCompare(String(subjectB.id));
    });

    for (const subject of orderedSectionSubjects) {
      const plannedSessions = getPlannedSessionsForSubject(subject);

      if (plannedSessions <= 0) continue;

      const target = subject.type === "LAB" ? labSessions : theorySessions;
      for (let i = 0; i < plannedSessions; i++) {
        target.push(subject);
      }

      const tracking = ensureSubjectTracking(section.id, subject.id, subject.type);
      tracking.required += subject.type === "LAB" ? (plannedSessions * 2) : plannedSessions;
    }

    for (let labIndex = 0; labIndex < labSessions.length; labIndex++) {
      const subject = labSessions[labIndex];
      const teacherCandidates = subjectTeacherMap.get(subject.id) || [];
      if (teacherCandidates.length === 0) continue;

      const roomCandidates = rooms.filter((room) => room.type === "LAB");
      if (roomCandidates.length === 0) continue;
      const sortedDays = getSortedDaysForPlacement(section.id, subject.id);

      const slotGroups = getSlotGroupsForSubject(subject.type, sortedDays, timeSlots);

      let bestOption = selectBestSlotOption({
        sectionIdValue: section.id,
        subjectId: subject.id,
        teacherCandidates,
        roomCandidates,
        slotGroups,
        useAlternativeTeacher: false,
      });

      if (!bestOption) {
        bestOption = await tryLocalSwapForFailedPlacement({
          sectionIdValue: section.id,
          subject,
          teacherCandidates,
          roomCandidates,
          slotGroups,
          useAlternativeTeacher: false,
        });
      }

      if (!bestOption) continue;

      await persistAndRegisterAssignment({
        sectionIdValue: section.id,
        academicLevelId: section.academicLevelId,
        subject,
        bestOption,
        createdAt: batchCreatedAt,
      });

      const tracking = ensureSubjectTracking(section.id, subject.id, subject.type);
      tracking.scheduled += 2;
    }

    for (let theoryIndex = 0; theoryIndex < theorySessions.length; theoryIndex++) {
      const subject = theorySessions[theoryIndex];
      const teacherCandidates = subjectTeacherMap.get(subject.id) || [];
      if (teacherCandidates.length === 0) continue;

      const roomCandidates = rooms.filter((room) => room.type === "CLASSROOM");
      if (roomCandidates.length === 0) continue;
      const sortedDays = getSortedDaysForPlacement(section.id, subject.id);

      const slotGroups = getSlotGroupsForSubject(subject.type, sortedDays, timeSlots);

      let bestOption = selectBestSlotOption({
        sectionIdValue: section.id,
        subjectId: subject.id,
        teacherCandidates,
        roomCandidates,
        slotGroups,
        useAlternativeTeacher: false,
      });

      if (!bestOption) {
        bestOption = await tryLocalSwapForFailedPlacement({
          sectionIdValue: section.id,
          subject,
          teacherCandidates,
          roomCandidates,
          slotGroups,
          useAlternativeTeacher: false,
        });
      }

      if (!bestOption) continue;

      await persistAndRegisterAssignment({
        sectionIdValue: section.id,
        academicLevelId: section.academicLevelId,
        subject,
        bestOption,
        createdAt: batchCreatedAt,
      });

      const tracking = ensureSubjectTracking(section.id, subject.id, subject.type);
      tracking.scheduled += 1;
    }
  }

  const maxRetries = 2;
  let retryAttempts = 0;

  for (let retryIndex = 0; retryIndex < maxRetries; retryIndex++) {
    const pendingTrackings = [...subjectTrackingMap.values()].filter(
      (tracking) => tracking.scheduled < tracking.required
    );

    if (pendingTrackings.length === 0) break;

    retryAttempts += 1;
    const retryTimeSlots = shuffleArray(timeSlots);

    for (const tracking of pendingTrackings) {
      const subject = subjectById.get(tracking.subjectId);
      if (!subject) continue;

      const remaining = tracking.required - tracking.scheduled;
      if (remaining <= 0) continue;

      const teacherCandidates = subjectTeacherMap.get(tracking.subjectId) || [];
      if (teacherCandidates.length === 0) continue;

      const roomCandidates = rooms.filter((room) =>
        subject.type === "LAB" ? room.type === "LAB" : room.type === "CLASSROOM"
      );
      if (roomCandidates.length === 0) continue;

      const retryDays = [...getSortedDaysForPlacement(tracking.sectionId, tracking.subjectId)].reverse();

      if (subject.type === "LAB") {
        let remainingLabSlots = remaining;

        while (remainingLabSlots >= 2) {
          const slotGroups = getSlotGroupsForSubject(subject.type, retryDays, retryTimeSlots);

          let bestOption = selectBestSlotOption({
            sectionIdValue: tracking.sectionId,
            subjectId: tracking.subjectId,
            teacherCandidates,
            roomCandidates,
            slotGroups,
            useAlternativeTeacher: true,
          });

          if (!bestOption) {
            bestOption = await tryLocalSwapForFailedPlacement({
              sectionIdValue: tracking.sectionId,
              subject,
              teacherCandidates,
              roomCandidates,
              slotGroups,
              useAlternativeTeacher: true,
            });
          }

          if (!bestOption) break;

          await persistAndRegisterAssignment({
            sectionIdValue: tracking.sectionId,
            academicLevelId: sectionAcademicLevelMap.get(tracking.sectionId) || null,
            subject,
            bestOption,
            createdAt: batchCreatedAt,
          });

          tracking.scheduled += 2;
          remainingLabSlots -= 2;
        }
      } else {
        let remainingTheorySlots = remaining;

        while (remainingTheorySlots > 0) {
          const slotGroups = getSlotGroupsForSubject(subject.type, retryDays, retryTimeSlots);

          let bestOption = selectBestSlotOption({
            sectionIdValue: tracking.sectionId,
            subjectId: tracking.subjectId,
            teacherCandidates,
            roomCandidates,
            slotGroups,
            useAlternativeTeacher: true,
          });

          if (!bestOption) {
            bestOption = await tryLocalSwapForFailedPlacement({
              sectionIdValue: tracking.sectionId,
              subject,
              teacherCandidates,
              roomCandidates,
              slotGroups,
              useAlternativeTeacher: true,
            });
          }

          if (!bestOption) break;

          await persistAndRegisterAssignment({
            sectionIdValue: tracking.sectionId,
            academicLevelId: sectionAcademicLevelMap.get(tracking.sectionId) || null,
            subject,
            bestOption,
            createdAt: batchCreatedAt,
          });

          tracking.scheduled += 1;
          remainingTheorySlots -= 1;
        }
      }
    }
  }

  const failedSubjects = [];
  const partiallyScheduled = [];

  for (const tracking of subjectTrackingMap.values()) {
    if (tracking.required <= 0) continue;

    if (tracking.scheduled === 0) {
      failedSubjects.push({ subjectId: tracking.subjectId });
      continue;
    }

    if (tracking.scheduled < tracking.required) {
      partiallyScheduled.push({
        subjectId: tracking.subjectId,
        required: tracking.required,
        scheduled: tracking.scheduled,
      });
    }
  }

  return res.json({
    message: "University timetable generated",
    totalEntries,
    failedSubjects,
    partiallyScheduled,
    retryAttempts,
  });
};

module.exports = {
  generateUniversityTimetable,
};
