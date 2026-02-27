const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");

const getTeacherTimeSlotIds = async (teacherId) => {
  const availability = await prisma.teacherAvailability.findMany({
    where: { teacherId, isAvailable: true },
    select: { timeSlotId: true },
  });

  return [...new Set(availability.map((item) => item.timeSlotId))];
};

const getTeacherAvailabilityByDay = async (teacherId) => {
  const availability = await prisma.teacherAvailability.findMany({
    where: { teacherId, isAvailable: true },
    select: { dayId: true, timeSlotId: true },
  });

  return availability.reduce((acc, item) => {
    if (!acc[item.dayId]) acc[item.dayId] = [];
    acc[item.dayId].push(item.timeSlotId);
    return acc;
  }, {});
};

const saveTeacherTimeSlotAvailability = async (teacherId, campusId, timeSlotIds) => {
  if (!Array.isArray(timeSlotIds)) return;

  const uniqueTimeSlotIds = [...new Set(timeSlotIds.filter(Boolean))];

  await prisma.teacherAvailability.deleteMany({ where: { teacherId } });

  if (uniqueTimeSlotIds.length === 0) return;

  const workingDays = await prisma.workingDay.findMany({
    where: { campusId },
    select: { id: true },
  });

  if (workingDays.length === 0) return;

  const data = [];
  for (const day of workingDays) {
    for (const timeSlotId of uniqueTimeSlotIds) {
      data.push({
        teacherId,
        dayId: day.id,
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
};

const saveTeacherAvailabilityByDay = async (teacherId, availabilityByDay) => {
  if (!availabilityByDay || typeof availabilityByDay !== "object") return;

  await prisma.teacherAvailability.deleteMany({ where: { teacherId } });

  const data = [];
  for (const [dayId, slotIds] of Object.entries(availabilityByDay)) {
    if (!Array.isArray(slotIds)) continue;
    const uniqueSlotIds = [...new Set(slotIds.filter(Boolean))];
    for (const timeSlotId of uniqueSlotIds) {
      data.push({
        teacherId,
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
};

exports.getTeachers = async (req, res) => {
  try {
    const { campusId } = req.query;
    const teachers = await prisma.teacher.findMany({
      where: campusId ? { campusId } : undefined,
    });

    let subjectsByTeacherId = {};
    try {
      const subjectLinks = await prisma.teacherSubject.findMany({
        where: { teacherId: { in: teachers.map((t) => t.id) } },
      });
      subjectsByTeacherId = subjectLinks.reduce((acc, item) => {
        if (!acc[item.teacherId]) acc[item.teacherId] = [];
        acc[item.teacherId].push(item.subjectId);
        return acc;
      }, {});
    } catch (error) {
      subjectsByTeacherId = {};
    }

    const mapped = await Promise.all(
      teachers.map(async (t) => {
        const timeSlotIds = await getTeacherTimeSlotIds(t.id);
        const availabilityByDay = await getTeacherAvailabilityByDay(t.id);
        return {
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone || "",
          subjects: subjectsByTeacherId[t.id] || [],
          availability: "",
          timeSlotIds,
          availabilityByDay,
          campusId: t.campusId,
          maxPerDay: t.maxPerDay,
          maxPerWeek: t.maxPerWeek,
        };
      })
    );

    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    let subjects = [];
    try {
      const links = await prisma.teacherSubject.findMany({ where: { teacherId: id } });
      subjects = links.map((item) => item.subjectId);
    } catch (error) {
      subjects = [];
    }

    let timeSlotIds = [];
    try {
      timeSlotIds = await getTeacherTimeSlotIds(id);
    } catch (error) {
      timeSlotIds = [];
    }

    let availabilityByDay = {};
    try {
      availabilityByDay = await getTeacherAvailabilityByDay(id);
    } catch (error) {
      availabilityByDay = {};
    }

    res.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || "",
      subjects,
      availability: "",
      timeSlotIds,
      availabilityByDay,
      campusId: teacher.campusId,
      maxPerDay: teacher.maxPerDay,
      maxPerWeek: teacher.maxPerWeek,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch teacher" });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password, phone, subjects, timeSlotIds, availabilityByDay, campusId, maxPerDay, maxPerWeek } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!name || !normalizedEmail) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus) {
      return res.status(400).json({ message: "Invalid campusId" });
    }

    const rawPassword = password === undefined ? "" : String(password || "");
    if (rawPassword && rawPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (rawPassword) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already exists as a user" });
      }
    }

    const teacher = await prisma.teacher.create({
      data: {
        name,
        email: normalizedEmail,
        phone: phone || "",
        campusId,
        maxPerDay: Number(maxPerDay) || 6,
        maxPerWeek: Number(maxPerWeek) || 30,
      },
    });

    if (rawPassword) {
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: "TEACHER",
        },
      });
    }

    if (Array.isArray(subjects) && subjects.length > 0) {
      try {
        await prisma.teacherSubject.createMany({
          data: subjects.map((subjectId) => ({ teacherId: teacher.id, subjectId })),
          skipDuplicates: true,
        });
      } catch (error) {
        console.error("Subject link creation failed (non-critical):", error.message);
      }
    }

    try {
      if (availabilityByDay && typeof availabilityByDay === "object") {
        await saveTeacherAvailabilityByDay(teacher.id, availabilityByDay);
      } else {
        await saveTeacherTimeSlotAvailability(teacher.id, campusId, timeSlotIds);
      }
    } catch (error) {
      console.error("Time slot availability save failed (non-critical):", error.message);
    }

    let savedAvailabilityByDay = {};
    try {
      savedAvailabilityByDay = await getTeacherAvailabilityByDay(teacher.id);
    } catch (error) {
      savedAvailabilityByDay = {};
    }

    res.status(201).json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || "",
      subjects: Array.isArray(subjects) ? subjects : [],
      availability: "",
      timeSlotIds: Array.isArray(timeSlotIds) ? [...new Set(timeSlotIds)] : [],
      availabilityByDay: savedAvailabilityByDay,
      campusId: teacher.campusId,
      maxPerDay: teacher.maxPerDay,
      maxPerWeek: teacher.maxPerWeek,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create teacher" });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, subjects, timeSlotIds, availabilityByDay, campusId, maxPerDay, maxPerWeek } = req.body;
    const normalizedEmail = email === undefined ? undefined : String(email || "").trim().toLowerCase();

    if (normalizedEmail !== undefined && !normalizedEmail) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }

    const rawPassword = password === undefined ? "" : String(password || "");
    if (rawPassword && rawPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (campusId) {
      const campus = await prisma.campus.findUnique({ where: { id: campusId } });
      if (!campus) {
        return res.status(400).json({ message: "Invalid campusId" });
      }
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(campusId ? { campusId } : {}),
        ...(maxPerDay !== undefined ? { maxPerDay: Number(maxPerDay) } : {}),
        ...(maxPerWeek !== undefined ? { maxPerWeek: Number(maxPerWeek) } : {}),
      },
    });

    const previousEmail = String(teacher.email || "").trim().toLowerCase();
    const currentEmail = normalizedEmail !== undefined ? normalizedEmail : previousEmail;
    const displayName = name !== undefined ? name : teacher.name;

    const userByOldEmail = previousEmail
      ? await prisma.user.findFirst({
          where: {
            email: {
              equals: previousEmail,
              mode: "insensitive",
            },
          },
        })
      : null;

    const userByCurrentEmail = currentEmail
      ? await prisma.user.findFirst({
          where: {
            email: {
              equals: currentEmail,
              mode: "insensitive",
            },
          },
        })
      : null;

    const linkedUser = userByOldEmail || userByCurrentEmail;

    if (rawPassword) {
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      if (linkedUser) {
        const conflictingUser = await prisma.user.findFirst({
          where: {
            id: { not: linkedUser.id },
            email: {
              equals: currentEmail,
              mode: "insensitive",
            },
          },
          select: { id: true },
        });

        if (conflictingUser) {
          return res.status(400).json({ message: "Email already exists" });
        }

        await prisma.user.update({
          where: { id: linkedUser.id },
          data: {
            name: displayName,
            email: currentEmail,
            password: hashedPassword,
            role: "TEACHER",
          },
        });
      } else {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: {
              equals: currentEmail,
              mode: "insensitive",
            },
          },
          select: { id: true },
        });

        if (existingUser) {
          return res.status(400).json({ message: "Email already exists" });
        }

        await prisma.user.create({
          data: {
            name: displayName,
            email: currentEmail,
            password: hashedPassword,
            role: "TEACHER",
          },
        });
      }
    } else if (linkedUser && (name !== undefined || normalizedEmail !== undefined || linkedUser.role !== "TEACHER")) {
      const conflictingUser = normalizedEmail !== undefined
        ? await prisma.user.findFirst({
            where: {
              id: { not: linkedUser.id },
              email: {
                equals: currentEmail,
                mode: "insensitive",
              },
            },
            select: { id: true },
          })
        : null;

      if (conflictingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      await prisma.user.update({
        where: { id: linkedUser.id },
        data: {
          ...(name !== undefined ? { name: displayName } : {}),
          ...(normalizedEmail !== undefined ? { email: currentEmail } : {}),
          role: "TEACHER",
        },
      });
    }

    let currentSubjects = [];
    if (Array.isArray(subjects)) {
      try {
        await prisma.teacherSubject.deleteMany({ where: { teacherId: id } });
        if (subjects.length > 0) {
          await prisma.teacherSubject.createMany({
            data: subjects.map((subjectId) => ({ teacherId: id, subjectId })),
            skipDuplicates: true,
          });
        }
      } catch (error) {
        console.error("Subject link update failed (non-critical):", error.message);
      }
    }

    if (!Array.isArray(subjects)) {
      try {
        const links = await prisma.teacherSubject.findMany({ where: { teacherId: id } });
        currentSubjects = links.map((item) => item.subjectId);
      } catch (error) {
        currentSubjects = [];
      }
    }

    try {
      if (availabilityByDay && typeof availabilityByDay === "object") {
        await saveTeacherAvailabilityByDay(updated.id, availabilityByDay);
      } else {
        await saveTeacherTimeSlotAvailability(updated.id, updated.campusId, timeSlotIds);
      }
    } catch (error) {
      console.error("Time slot availability update failed (non-critical):", error.message);
    }

    let currentTimeSlotIds = [];
    try {
      currentTimeSlotIds = await getTeacherTimeSlotIds(updated.id);
    } catch (error) {
      currentTimeSlotIds = [];
    }

    let currentAvailabilityByDay = {};
    try {
      currentAvailabilityByDay = await getTeacherAvailabilityByDay(updated.id);
    } catch (error) {
      currentAvailabilityByDay = {};
    }

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone || "",
      subjects: Array.isArray(subjects) ? subjects : currentSubjects,
      availability: "",
      timeSlotIds: Array.isArray(timeSlotIds) ? [...new Set(timeSlotIds)] : currentTimeSlotIds,
      availabilityByDay: currentAvailabilityByDay,
      campusId: updated.campusId,
      maxPerDay: updated.maxPerDay,
      maxPerWeek: updated.maxPerWeek,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update teacher" });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    
    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    await prisma.teacher.delete({
      where: { id },
    });

    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete teacher" });
  }
};
