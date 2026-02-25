const prisma = require("../prisma/client");

exports.getInstitutions = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    const institutions = await prisma.institution.findMany({
      where: { ownerId: userId },
      include: {
        campuses: true,
      },
    });

    res.json(institutions.map(inst => ({
      id: inst.id,
      name: inst.name,
      type: inst.type,
      ownerId: inst.ownerId,
      campuses: inst.campuses?.map(c => ({
        id: c.id,
        name: c.name,
        location: c.location,
        institutionId: c.institutionId,
      })) || [],
    })));
  } catch (error) {
    console.error("Error fetching institutions:", error);
    res.status(500).json({ message: "Failed to fetch institutions" });
  }
};

exports.getInstitutionById = async (req, res) => {
  try {
    const { id } = req.params;
    const institution = await prisma.institution.findUnique({
      where: { id },
      include: { campuses: true },
    });

    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    res.json({
      id: institution.id,
      name: institution.name,
      type: institution.type,
      ownerId: institution.ownerId,
      campuses: institution.campuses?.map(c => ({
        id: c.id,
        name: c.name,
        location: c.location,
        institutionId: c.institutionId,
      })) || [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch institution" });
  }
};

exports.createInstitution = async (req, res) => {
  try {
    const { name, type, campusName, location } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    const institution = await prisma.institution.create({
      data: {
        name,
        type,
        ownerId: userId,
      },
    });

    let campus = null;
    if (campusName) {
      campus = await prisma.campus.create({
        data: {
          institutionId: institution.id,
          name: campusName,
          location: location || "",
        },
      });
    }

    res.status(201).json({
      id: institution.id,
      name: institution.name,
      type: institution.type,
      ownerId: institution.ownerId,
      campuses: campus ? [{
        id: campus.id,
        name: campus.name,
        location: campus.location,
        institutionId: campus.institutionId,
      }] : [],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create institution" });
  }
};

exports.updateInstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    const updated = await prisma.institution.update({
      where: { id },
      data: { name, type },
      include: { campuses: true },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      ownerId: updated.ownerId,
      campuses: updated.campuses?.map(c => ({
        id: c.id,
        name: c.name,
        location: c.location,
        institutionId: c.institutionId,
      })) || [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update institution" });
  }
};

exports.deleteInstitution = async (req, res) => {
  try {
    const { id } = req.params;

    const institution = await prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      return res.status(404).json({ message: "Institution not found" });
    }

    await prisma.institution.delete({
      where: { id },
    });

    res.json({ message: "Institution deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete institution" });
  }
};
