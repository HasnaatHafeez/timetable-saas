const prisma = require("../prisma/client");

exports.getAcademicLevels = async (req, res) => {
  try {
    const { campusId } = req.query;
    const levels = await prisma.academicLevel.findMany({
      where: campusId ? { campusId } : undefined,
      orderBy: { name: "asc" },
    });

    res.json(levels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch academic levels" });
  }
};

exports.getAcademicLevelById = async (req, res) => {
  try {
    const { id } = req.params;
    const academicLevel = await prisma.academicLevel.findUnique({ where: { id } });

    if (!academicLevel) {
      return res.status(404).json({ message: "Academic level not found" });
    }

    res.json(academicLevel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch academic level" });
  }
};

exports.createAcademicLevel = async (req, res) => {
  try {
    const { campusId, name } = req.body;

    const academicLevel = await prisma.academicLevel.create({
      data: {
        campusId,
        name,
      },
    });

    res.status(201).json({
      message: "Academic level created successfully",
      academicLevel,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create academic level" });
  }
};

exports.updateAcademicLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, campusId } = req.body;

    const existing = await prisma.academicLevel.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Academic level not found" });
    }

    const updated = await prisma.academicLevel.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(campusId !== undefined ? { campusId } : {}),
      },
    });

    res.json({
      message: "Academic level updated successfully",
      academicLevel: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update academic level" });
  }
};

exports.deleteAcademicLevel = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.academicLevel.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Academic level not found" });
    }

    await prisma.academicLevel.delete({ where: { id } });
    res.json({ message: "Academic level deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete academic level" });
  }
};
