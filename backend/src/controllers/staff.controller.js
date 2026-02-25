const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");

exports.getStaffByInstitution = async (req, res) => {
  try {
    const { institutionId } = req.query;
    if (!institutionId) return res.status(400).json({ message: "institutionId is required" });

    const staff = await prisma.staff.findMany({
      where: { institutionId },
      include: { user: true },
    });

    res.json(staff.map(s => ({
      id: s.id,
      userId: s.userId,
      name: s.user?.name || "",
      email: s.user?.email || "",
      campusId: s.campusId || null,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
};

exports.createStaffWithUser = async (req, res) => {
  try {
    const { name, email, password, institutionId, campusId } = req.body;

    if (!name || !email || !institutionId) {
      return res.status(400).json({ message: "name, email and institutionId are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password || "temp123456", 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STAFF_ADMIN",
      },
    });

    const staff = await prisma.staff.create({
      data: {
        userId: user.id,
        institutionId,
        campusId: campusId || null,
      },
    });

    res.status(201).json({ message: "Staff created", user: { id: user.id, name: user.name, email: user.email }, staff });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create staff" });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, campusId } = req.body;

    const staff = await prisma.staff.findUnique({ where: { id }, include: { user: true } });
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        campusId: campusId === undefined ? staff.campusId : campusId,
        user: {
          update: {
            name: name === undefined ? staff.user.name : name,
            email: email === undefined ? staff.user.email : email,
          },
        },
      },
      include: { user: true },
    });

    res.json({ id: updated.id, name: updated.user?.name, email: updated.user?.email, campusId: updated.campusId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update staff" });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Delete staff record
    await prisma.staff.delete({ where: { id } });

    // Optionally delete user record
    if (staff.userId) {
      await prisma.user.delete({ where: { id: staff.userId } });
    }

    res.json({ message: "Staff deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete staff" });
  }
};
