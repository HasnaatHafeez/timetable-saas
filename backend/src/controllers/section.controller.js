const prisma = require("../prisma/client");

const resolveAcademicLevelId = async ({ academicLevelId, campusId }) => {
  if (academicLevelId) return academicLevelId;
  if (!campusId) return null;

  const existingLevel = await prisma.academicLevel.findFirst({
    where: { campusId },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  if (existingLevel) return existingLevel.id;

  const createdLevel = await prisma.academicLevel.create({
    data: {
      campusId,
      name: "General",
    },
    select: { id: true },
  });

  return createdLevel.id;
};

const mapSectionToClass = async (section) => {
  const level = section.academicLevel || await prisma.academicLevel.findUnique({
    where: { id: section.academicLevelId },
  });

  const sectionSubjects = section.sectionSubjects || await prisma.sectionSubject.findMany({
    where: { sectionId: section.id },
    select: { subjectId: true },
  });

  return {
    id: section.id,
    name: section.name,
    semester: level?.name || "",
    section: section.sectionCode || section.name,
    subjects: sectionSubjects.map((item) => item.subjectId),
    academicLevelId: section.academicLevelId,
  };
};

const syncSubjectsToSiblingSections = async ({ sectionId, className, academicLevelId, subjects }) => {
  if (!Array.isArray(subjects)) return 0;

  const uniqueSubjectIds = [...new Set(subjects.filter(Boolean))];
  const normalizedClassName = (className || "").trim().toLowerCase();
  if (!normalizedClassName || !academicLevelId) return 0;

  const siblingSections = await prisma.section.findMany({
    where: {
      id: { not: sectionId },
      academicLevelId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const matchingSiblingIds = siblingSections
    .filter((item) => (item.name || "").trim().toLowerCase() === normalizedClassName)
    .map((item) => item.id);

  if (matchingSiblingIds.length === 0) return 0;

  await prisma.sectionSubject.deleteMany({
    where: { sectionId: { in: matchingSiblingIds } },
  });

  if (uniqueSubjectIds.length === 0) return matchingSiblingIds.length;

  await prisma.sectionSubject.createMany({
    data: matchingSiblingIds.flatMap((siblingId) =>
      uniqueSubjectIds.map((subjectId) => ({ sectionId: siblingId, subjectId }))
    ),
    skipDuplicates: true,
  });

  return matchingSiblingIds.length;
};

exports.getSections = async (req, res) => {
  try {
    const { campusId, academicLevelId } = req.query;
    let levelIds = [];

    if (academicLevelId) {
      levelIds = [academicLevelId];
    } else if (campusId) {
      const levels = await prisma.academicLevel.findMany({
        where: { campusId },
        select: { id: true },
      });
      levelIds = levels.map((level) => level.id);
    }

    const sections = await prisma.section.findMany({
      where: levelIds.length > 0 ? { academicLevelId: { in: levelIds } } : undefined,
      include: {
        academicLevel: true,
        sectionSubjects: {
          select: { subjectId: true },
        },
      },
    });

    const mapped = await Promise.all(sections.map(mapSectionToClass));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch sections" });
  }
};

exports.getSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        academicLevel: true,
        sectionSubjects: {
          select: { subjectId: true },
        },
      },
    });
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }
    res.json(await mapSectionToClass(section));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch section" });
  }
};

exports.createSection = async (req, res) => {
  try {
    const { name, section, subjects, academicLevelId, campusId } = req.body;
    const resolvedName = (name || section || "").trim();
    const resolvedSection = (section || name || "").trim();

    if (!resolvedName) {
      return res.status(400).json({ message: "Class name is required" });
    }

    const resolvedAcademicLevelId = await resolveAcademicLevelId({
      academicLevelId,
      campusId,
    });

    if (!resolvedAcademicLevelId) {
      return res.status(400).json({ message: "academicLevelId or campusId is required" });
    }

    const created = await prisma.section.create({
      data: {
        name: resolvedName,
        sectionCode: resolvedSection,
        academicLevelId: resolvedAcademicLevelId,
      },
      include: {
        academicLevel: true,
        sectionSubjects: {
          select: { subjectId: true },
        },
      },
    });

    let syncedSectionsCount = 0;
    if (Array.isArray(subjects)) {
      const uniqueSubjectIds = [...new Set(subjects.filter(Boolean))];
      if (uniqueSubjectIds.length > 0) {
        await prisma.sectionSubject.createMany({
          data: uniqueSubjectIds.map((subjectId) => ({ sectionId: created.id, subjectId })),
          skipDuplicates: true,
        });
      }

      syncedSectionsCount = await syncSubjectsToSiblingSections({
        sectionId: created.id,
        className: resolvedName,
        academicLevelId: resolvedAcademicLevelId,
        subjects: uniqueSubjectIds,
      });
    }

    const mapped = await mapSectionToClass(created);
    res.status(201).json({ ...mapped, _id: mapped.id, syncedSectionsCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create section" });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, section, subjects, academicLevelId, campusId } = req.body;
    const resolvedName = name !== undefined || section !== undefined ? (name || section || "").trim() : null;
    const resolvedSection = section !== undefined || name !== undefined ? (section || name || "").trim() : null;

    const sectionRecord = await prisma.section.findUnique({
      where: { id },
    });

    if (!sectionRecord) {
      return res.status(404).json({ message: "Section not found" });
    }

    const resolvedAcademicLevelId = await resolveAcademicLevelId({
      academicLevelId,
      campusId,
    });

    const updated = await prisma.section.update({
      where: { id },
      data: {
        ...(resolvedName !== null ? { name: resolvedName } : {}),
        ...(resolvedSection !== null ? { sectionCode: resolvedSection } : {}),
        ...(resolvedAcademicLevelId ? { academicLevelId: resolvedAcademicLevelId } : {}),
      },
      include: {
        academicLevel: true,
        sectionSubjects: {
          select: { subjectId: true },
        },
      },
    });

    let syncedSectionsCount = 0;
    if (Array.isArray(subjects)) {
      const uniqueSubjectIds = [...new Set(subjects.filter(Boolean))];
      await prisma.sectionSubject.deleteMany({ where: { sectionId: id } });
      if (uniqueSubjectIds.length > 0) {
        await prisma.sectionSubject.createMany({
          data: uniqueSubjectIds.map((subjectId) => ({ sectionId: id, subjectId })),
          skipDuplicates: true,
        });
      }

      const targetClassName = resolvedName !== null ? resolvedName : sectionRecord.name;
      const targetAcademicLevelId = resolvedAcademicLevelId || sectionRecord.academicLevelId;

      syncedSectionsCount = await syncSubjectsToSiblingSections({
        sectionId: id,
        className: targetClassName,
        academicLevelId: targetAcademicLevelId,
        subjects: uniqueSubjectIds,
      });
    }

    const mapped = await mapSectionToClass(updated);
    res.json({ ...mapped, _id: mapped.id, syncedSectionsCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update section" });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
    });

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    await prisma.section.delete({
      where: { id },
    });

    res.json({ message: "Section deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete section" });
  }
};
