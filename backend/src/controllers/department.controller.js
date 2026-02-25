const prisma = require("../prisma/client");

exports.getDepartments = async (req, res) => {
  try {
    const { campusId } = req.query;
    const departments = await prisma.department.findMany({
      where: campusId ? { campusId } : undefined,
      orderBy: { name: "asc" },
    });

    res.json(departments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await prisma.department.findUnique({ where: { id } });

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch department" });
  }
};

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

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, campusId } = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Department not found" });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(campusId !== undefined ? { campusId } : {}),
      },
    });

    res.json({
      message: "Department updated successfully",
      department: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update department" });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Department not found" });
    }

    await prisma.department.delete({ where: { id } });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete department" });
  }
};
