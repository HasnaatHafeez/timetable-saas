const prisma = require("../prisma/client");

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
