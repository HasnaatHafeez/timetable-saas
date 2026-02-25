const prisma = require("../prisma/client");

exports.getAllInstitutions = async (req, res) => {
  try {
    const institutions = await prisma.institution.findMany({ include: { campuses: true } });
    res.json(institutions.map(inst => ({
      id: inst.id,
      name: inst.name,
      type: inst.type,
      ownerId: inst.ownerId,
      campuses: inst.campuses || [],
      createdAt: inst.createdAt,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch institutions" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query; // optional filter by Role enum string
    const where = role ? { role } : {};
    const users = await prisma.user.findMany({ where });
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive, name, email } = req.body;
    const data = {};
    if (role) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (name) data.name = name;
    if (email) data.email = email;

    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update user" });
  }
};

exports.deleteInstitution = async (req, res) => {
  try {
    const { id } = req.params;
    const inst = await prisma.institution.findUnique({ where: { id } });
    if (!inst) return res.status(404).json({ message: "Institution not found" });
    await prisma.institution.delete({ where: { id } });
    res.json({ message: "Institution deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete institution" });
  }
};
