const prisma = require("../prisma/client");

exports.createSubject = async (req, res) => {
  try {
    const { departmentId, name, type, weeklyHours } = req.body;

    const subject = await prisma.subject.create({
      data: {
        departmentId,
        name,
        type,
        weeklyHours,
      },
    });

    res.status(201).json({
      message: "Subject created successfully",
      subject,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create subject" });
  }
};
