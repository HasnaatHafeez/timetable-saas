const prisma = require("../prisma/client");

exports.createSection = async (req, res) => {
  try {
    const { academicLevelId, name } = req.body;

    const section = await prisma.section.create({
      data: {
        academicLevelId,
        name,
      },
    });

    res.status(201).json({
      message: "Section created successfully",
      section,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create section" });
  }
};
