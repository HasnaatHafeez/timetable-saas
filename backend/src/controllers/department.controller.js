const prisma = require("../prisma/client");

exports.createDepartment = async (req, res) => {
  try {
    const { campusId, name } = req.body;

    const department = await prisma.department.create({
      data: {
        campusId,
        name,
      },
    });

    res.status(201).json({
      message: "Department created successfully",
      department,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create department" });
  }
};
