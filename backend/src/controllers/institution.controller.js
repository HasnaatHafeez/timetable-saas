const prisma = require("../prisma/client");

exports.createInstitution = async (req, res) => {
  try {
    const { name, type, campusName, location } = req.body;

    const institution = await prisma.institution.create({
      data: {
        name,
        type,
        ownerId: req.user.id,
      },
    });

    const campus = await prisma.campus.create({
      data: {
        institutionId: institution.id,
        name: campusName,
        location,
      },
    });

    res.status(201).json({
      message: "Institution and campus created successfully",
      institution,
      campus,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create institution" });
  }
};
