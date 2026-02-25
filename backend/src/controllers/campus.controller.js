const prisma = require("../prisma/client");

exports.getCampuses = async (req, res) => {
  try {
    const { institutionId } = req.query;

    let where = {};
    if (institutionId) {
      where.institutionId = institutionId;
    }

    const campuses = await prisma.campus.findMany({
      where,
    });

    res.json(campuses.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      institutionId: c.institutionId,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch campuses" });
  }
};

exports.getCampusById = async (req, res) => {
  try {
    const { id } = req.params;

    const campus = await prisma.campus.findUnique({
      where: { id },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    res.json({
      id: campus.id,
      name: campus.name,
      location: campus.location,
      institutionId: campus.institutionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch campus" });
  }
};

exports.createCampus = async (req, res) => {
  try {
    const { institutionId, name, location } = req.body;

    const campus = await prisma.campus.create({
      data: {
        institutionId,
        name,
        location: location || "",
      },
    });

    res.status(201).json({
      id: campus.id,
      name: campus.name,
      location: campus.location,
      institutionId: campus.institutionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create campus" });
  }
};

exports.updateCampus = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;

    const campus = await prisma.campus.findUnique({
      where: { id },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const updated = await prisma.campus.update({
      where: { id },
      data: { name, location },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      location: updated.location,
      institutionId: updated.institutionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update campus" });
  }
};

exports.deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;

    const campus = await prisma.campus.findUnique({
      where: { id },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    await prisma.campus.delete({
      where: { id },
    });

    res.json({ message: "Campus deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete campus" });
  }
};

exports.getAcademicLevels = async (req, res) => {
  try {
    const { campusId } = req.query;

    const levels = await prisma.academicLevel.findMany({
      where: campusId ? { campusId } : {},
    });

    res.json(levels.map(l => ({
      id: l.id,
      name: l.name,
      campusId: l.campusId,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch academic levels" });
  }
};

exports.createAcademicLevel = async (req, res) => {
  try {
    const { campusId, name } = req.body;

    const level = await prisma.academicLevel.create({
      data: {
        campusId,
        name,
      },
    });

    res.status(201).json({
      id: level.id,
      name: level.name,
      campusId: level.campusId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create academic level" });
  }
};
