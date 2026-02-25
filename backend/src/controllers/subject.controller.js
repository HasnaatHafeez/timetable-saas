const prisma = require("../prisma/client");

const assignTeacherToSubject = async (subjectId, teacherId) => {
  await prisma.teacherSubject.deleteMany({ where: { subjectId } });

  if (!teacherId) return;

  await prisma.teacherSubject.create({
    data: {
      teacherId,
      subjectId,
    },
  });
};

const getOrCreateDefaultDepartment = async (campusId) => {
  if (!campusId) return null;

  const existing = await prisma.department.findFirst({
    where: { campusId },
    orderBy: { name: "asc" },
  });

  if (existing) return existing;

  return prisma.department.create({
    data: {
      campusId,
      name: "General",
    },
  });
};

exports.getSubjects = async (req, res) => {
  try {
    const { campusId } = req.query;
    const subjects = await prisma.subject.findMany({
      where: campusId ? { department: { campusId } } : undefined,
      include: {
        department: true,
        teacherSubjects: {
          include: {
            teacher: true,
          },
          take: 1,
        },
      },
    });
    res.json(subjects.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      weeklyHours: s.weeklyHours,
      creditHours: s.weeklyHours,
      code: "",
      assignedTeacher: s.teacherSubjects?.[0]?.teacher?.name || "",
      assignedTeacherId: s.teacherSubjects?.[0]?.teacherId || "",
      departmentId: s.departmentId,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch subjects" });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        department: true,
        teacherSubjects: {
          include: {
            teacher: true,
          },
          take: 1,
        },
      },
    });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json({
      id: subject.id,
      name: subject.name,
      type: subject.type,
      weeklyHours: subject.weeklyHours,
      creditHours: subject.weeklyHours,
      code: "",
      assignedTeacher: subject.teacherSubjects?.[0]?.teacher?.name || "",
      assignedTeacherId: subject.teacherSubjects?.[0]?.teacherId || "",
      departmentId: subject.departmentId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch subject" });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { name, type, weeklyHours, creditHours, departmentId, campusId, teacherId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    let resolvedDepartmentId = departmentId;
    if (!resolvedDepartmentId) {
      const defaultDepartment = await getOrCreateDefaultDepartment(campusId);
      if (!defaultDepartment) {
        return res.status(400).json({ message: "departmentId or campusId is required" });
      }
      resolvedDepartmentId = defaultDepartment.id;
    }

    const resolvedType = type === "LAB" || type === "THEORY" ? type : "THEORY";
    const resolvedWeeklyHours = Number(weeklyHours ?? creditHours) || 0;

    const subject = await prisma.subject.create({
      data: {
        name,
        type: resolvedType,
        weeklyHours: resolvedWeeklyHours,
        departmentId: resolvedDepartmentId,
      },
    });

    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher) {
        return res.status(400).json({ message: "Invalid teacherId" });
      }
      await assignTeacherToSubject(subject.id, teacherId);
    }

    const assigned = teacherId
      ? await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true } })
      : null;

    res.status(201).json({
      _id: subject.id,
      id: subject.id,
      name: subject.name,
      type: subject.type,
      weeklyHours: subject.weeklyHours,
      creditHours: subject.weeklyHours,
      code: "",
      assignedTeacher: assigned?.name || "",
      assignedTeacherId: assigned?.id || "",
      departmentId: subject.departmentId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create subject" });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, weeklyHours, creditHours, departmentId, campusId, teacherId } = req.body;

    const subject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    let resolvedDepartmentId = departmentId;
    if (!resolvedDepartmentId && campusId) {
      const defaultDepartment = await getOrCreateDefaultDepartment(campusId);
      resolvedDepartmentId = defaultDepartment?.id;
    }

    const resolvedType = type === "LAB" || type === "THEORY" ? type : subject.type;
    const resolvedWeeklyHours = Number(weeklyHours ?? creditHours);

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(resolvedType ? { type: resolvedType } : {}),
        ...(Number.isFinite(resolvedWeeklyHours) ? { weeklyHours: resolvedWeeklyHours } : {}),
        ...(resolvedDepartmentId ? { departmentId: resolvedDepartmentId } : {}),
      },
    });

    if (teacherId !== undefined) {
      if (teacherId) {
        const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
        if (!teacher) {
          return res.status(400).json({ message: "Invalid teacherId" });
        }
      }

      await assignTeacherToSubject(id, teacherId || null);
    }

    const assignedLink = await prisma.teacherSubject.findFirst({
      where: { subjectId: id },
      include: { teacher: true },
    });

    res.json({
      _id: updated.id,
      id: updated.id,
      name: updated.name,
      type: updated.type,
      weeklyHours: updated.weeklyHours,
      creditHours: updated.weeklyHours,
      code: "",
      assignedTeacher: assignedLink?.teacher?.name || "",
      assignedTeacherId: assignedLink?.teacherId || "",
      departmentId: updated.departmentId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update subject" });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await prisma.subject.delete({
      where: { id },
    });

    res.json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete subject" });
  }
};
