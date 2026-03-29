const prisma = require("../prisma/client");
// DO NOT add role-based checks here. Use RBAC middleware.

exports.getCampuses = async (req, res) => {
  try {
    const { institutionId } = req.query;
    const isOwnScope = req.scope?.type === "OWN";
    const staffCampusIds = Array.isArray(req.staffCampusIds) ? req.staffCampusIds : [];

    let where = {};
    if (institutionId) {
      where.institutionId = institutionId;
    }

    if (isOwnScope) {
      where.id = { in: staffCampusIds };
      if (req.staffInstitutionId) {
        where.institutionId = req.staffInstitutionId;
      }
    }

    const campuses = await prisma.campus.findMany({
      where,
    });

    res.json(campuses.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      institutionId: c.institutionId,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch campuses" });
  }
};

exports.getCampusById = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.scope?.type === "OWN") {
      const staffCampusIds = Array.isArray(req.staffCampusIds) ? req.staffCampusIds : [];
      if (!staffCampusIds.includes(id)) {
        return res.status(403).json({ message: "Access denied for this campus" });
      }
    }

    const campus = await prisma.campus.findUnique({
      where: { id },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    res.json({
      id: campus.id,
      name: campus.name,
      location: campus.location,
      institutionId: campus.institutionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch campus" });
  }
};

exports.createCampus = async (req, res) => {
  try {
    const { institutionId, name, location } = req.body;

    const campus = await prisma.campus.create({
      data: {
        institutionId,
        name,
        location: location || "",
        plan: "FREE",
      },
    });

    res.status(201).json({
      id: campus.id,
      name: campus.name,
      location: campus.location,
      institutionId: campus.institutionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create campus" });
  }
};

exports.updateCampus = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;

    const campus = await prisma.campus.findUnique({
      where: { id },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const updated = await prisma.campus.update({
      where: { id },
      data: { name, location },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      location: updated.location,
      institutionId: updated.institutionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update campus" });
  }
};

exports.deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;

    const campus = await prisma.campus.findUnique({
      where: { id },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    await prisma.campus.delete({
      where: { id },
    });

    res.json({ message: "Campus deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete campus" });
  }
};

exports.getAcademicLevels = async (req, res) => {
  try {
    const { campusId } = req.query;
    const isOwnScope = req.scope?.type === "OWN";
    const staffCampusIds = Array.isArray(req.staffCampusIds) ? req.staffCampusIds : [];

    const where = {};
    if (campusId) {
      where.campusId = campusId;
    }
    if (isOwnScope) {
      where.campusId = campusId ? campusId : { in: staffCampusIds };
    }

    const levels = await prisma.academicLevel.findMany({ where });

    res.json(levels.map(l => ({
      id: l.id,
      name: l.name,
      campusId: l.campusId,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch academic levels" });
  }
};

exports.createAcademicLevel = async (req, res) => {
  try {
    const { campusId, name } = req.body;

    const level = await prisma.academicLevel.create({
      data: {
        campusId,
        name,
      },
    });

    res.status(201).json({
      id: level.id,
      name: level.name,
      campusId: level.campusId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create academic level" });
  }
};

exports.upgradeCampusPlan = async (req, res) => {
  try {
    const role = req.user?.role;
    const { newPlan, campusId: requestCampusId } = req.body;
    const institutionId = req.user?.institutionId;
    const tenantCampusId = req.campus?.id;

    // Determine which campusId to use based on role
    let campusId;
    if (role === "SYSTEM_ADMIN") {
      // SYSTEM_ADMIN must provide campusId in request body
      if (!requestCampusId) {
        return res.status(400).json({ message: "Campus ID required for system administrators" });
      }
      campusId = requestCampusId;
    } else if (role === "INSTITUTION_OWNER") {
      // INSTITUTION_OWNER uses their tenant campus (ignore request campusId)
      if (!tenantCampusId) {
        return res.status(400).json({ message: "Campus ID not found in tenant context" });
      }
      campusId = tenantCampusId;
    } else {
      return res.status(403).json({ message: "Only institution owners and system administrators can upgrade plans" });
    }

    // Validate plan is one of the valid values
    const validPlans = ["FREE", "PRO", "ENTERPRISE"];
    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({ 
        message: `Invalid plan. Must be one of: ${validPlans.join(", ")}` 
      });
    }

    // Fetch campus
    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    // For INSTITUTION_OWNER, verify they own this campus's institution
    if (role === "INSTITUTION_OWNER" && campus.institutionId !== institutionId) {
      return res.status(403).json({ message: "You can only upgrade campuses in your institution" });
    }

    // Update the plan
    const updated = await prisma.campus.update({
      where: { id: campusId },
      data: { plan: newPlan },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      location: updated.location,
      institutionId: updated.institutionId,
      plan: updated.plan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to upgrade campus plan" });
  }
};
