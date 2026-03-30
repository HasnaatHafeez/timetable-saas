const prisma = require("../prisma/client");
exports.switchCampus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const campusId = String(req.body?.campusId || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      select: { id: true },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const isGlobalRole = ["SYSTEM_ADMIN", "INSTITUTION_OWNER"].includes(role);

    if (!isGlobalRole) {
      const membership = await prisma.userCampus.findUnique({
        where: {
          userId_campusId: {
            userId,
            campusId,
          },
        },
        select: { id: true },
      });

      if (!membership) {
        return res.status(403).json({ message: "Access denied for selected campus" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { activeCampusId: campusId },
      select: {
        id: true,
        role: true,
        activeCampusId: true,
      },
    });

    return res.json({
      message: "Active campus switched successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to switch campus" });
  }
};

exports.getSession = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        backendRole: req.user.role,
        campusId: req.user.campusId || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load session" });
  }
};
