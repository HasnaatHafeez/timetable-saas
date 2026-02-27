const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");

const normalizeCampusIds = (campusIds, campusId) => {
  const list = Array.isArray(campusIds) ? campusIds : (campusId ? [campusId] : []);
  return [...new Set(list.map((id) => String(id || "").trim()).filter(Boolean))];
};

const getStaffCampusIds = (staffRecord) => {
  const fromLinks = (staffRecord?.campusLinks || []).map((item) => item.campusId).filter(Boolean);
  return [...new Set([...fromLinks, ...(staffRecord?.campusId ? [staffRecord.campusId] : [])])];
};

exports.getStaffByInstitution = async (req, res) => {
  try {
    const { institutionId } = req.query;
    if (!institutionId) return res.status(400).json({ message: "institutionId is required" });

    const where = { institutionId };
    if (req.user?.role === "STAFF_ADMIN") {
      where.OR = [
        { campusId: { in: req.staffCampusIds || [] } },
        { campusLinks: { some: { campusId: { in: req.staffCampusIds || [] } } } },
      ];
    }

    const staff = await prisma.staff.findMany({
      where,
      include: {
        user: true,
        campus: true,
        campusLinks: {
          include: { campus: true },
        },
      },
    });

    const nonStaffRoleUserIds = staff
      .filter((item) => item.user && item.user.role !== "STAFF_ADMIN")
      .map((item) => item.userId);

    if (nonStaffRoleUserIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: nonStaffRoleUserIds } },
        data: { role: "STAFF_ADMIN" },
      });
    }

    res.json(staff.map(s => ({
      id: s.id,
      userId: s.userId,
      name: s.user?.name || "",
      email: s.user?.email || "",
      campusId: s.campusId || null,
      campusIds: s.campusLinks?.map((item) => item.campusId) || (s.campusId ? [s.campusId] : []),
      campuses: (s.campusLinks || []).map((item) => ({
        id: item.campusId,
        name: item.campus?.name || "",
        location: item.campus?.location || "",
      })),
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch staff" });
  }
};

exports.createStaffWithUser = async (req, res) => {
  try {
    const { name, email, password, institutionId, campusId, campusIds } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !institutionId) {
      return res.status(400).json({ message: "name, email and institutionId are required" });
    }

    const rawPassword = String(password || "");
    if (!rawPassword || rawPassword.length < 6) {
      return res.status(400).json({ message: "Password is required and must be at least 6 characters" });
    }

    const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      return res.status(400).json({ message: "Invalid institutionId" });
    }

    const normalizedCampusIds = normalizeCampusIds(campusIds, campusId);
    if (normalizedCampusIds.length > 0) {
      const campuses = await prisma.campus.findMany({
        where: { id: { in: normalizedCampusIds } },
        select: { id: true, institutionId: true },
      });

      if (campuses.length !== normalizedCampusIds.length || campuses.some((item) => item.institutionId !== institutionId)) {
        return res.status(400).json({ message: "Invalid campus selection for this institution" });
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "STAFF_ADMIN",
      },
    });

    const staff = await prisma.staff.create({
      data: {
        userId: user.id,
        institutionId,
        campusId: normalizedCampusIds[0] || null,
      },
    });

    if (normalizedCampusIds.length > 0) {
      await prisma.staffCampus.createMany({
        data: normalizedCampusIds.map((item) => ({ staffId: staff.id, campusId: item })),
        skipDuplicates: true,
      });
    }

    res.status(201).json({ message: "Staff created", user: { id: user.id, name: user.name, email: user.email, role: user.role }, staff });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create staff" });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, campusId, campusIds } = req.body;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: true,
        campusLinks: { select: { campusId: true } },
      },
    });
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    if (req.user?.role === "STAFF_ADMIN") {
      const targetCampusIds = getStaffCampusIds(staff);
      const canAccessTarget = targetCampusIds.length === 0
        ? false
        : targetCampusIds.some((item) => (req.staffCampusIds || []).includes(item));

      if (!canAccessTarget) {
        return res.status(403).json({ message: "Access denied for this staff" });
      }
    }

    const normalizedEmail = email === undefined ? undefined : String(email).trim().toLowerCase();

    if (normalizedEmail !== undefined && !normalizedEmail) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }

    if (normalizedEmail !== undefined) {
      const existing = await prisma.user.findFirst({
        where: {
          id: { not: staff.userId },
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const campusIdsProvided = campusIds !== undefined || campusId !== undefined;
    const normalizedCampusIds = campusIdsProvided
      ? normalizeCampusIds(campusIds, campusId)
      : (staff.campusLinks?.map((item) => item.campusId) || (staff.campusId ? [staff.campusId] : []));

    if (campusIdsProvided && normalizedCampusIds.length > 0) {
      const campuses = await prisma.campus.findMany({
        where: { id: { in: normalizedCampusIds } },
        select: { id: true, institutionId: true },
      });

      if (campuses.length !== normalizedCampusIds.length || campuses.some((item) => item.institutionId !== staff.institutionId)) {
        return res.status(400).json({ message: "Invalid campus selection for this institution" });
      }
    }

    await prisma.staff.update({
      where: { id },
      data: {
        campusId: campusIdsProvided ? (normalizedCampusIds[0] || null) : staff.campusId,
        user: {
          update: {
            name: name === undefined ? staff.user.name : name,
            email: normalizedEmail === undefined ? staff.user.email : normalizedEmail,
            role: "STAFF_ADMIN",
          },
        },
      },
    });

    if (campusIdsProvided) {
      await prisma.staffCampus.deleteMany({ where: { staffId: id } });
      if (normalizedCampusIds.length > 0) {
        await prisma.staffCampus.createMany({
          data: normalizedCampusIds.map((item) => ({ staffId: id, campusId: item })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: true,
        campusLinks: {
          include: { campus: true },
        },
      },
    });

    res.json({
      id: updated.id,
      name: updated.user?.name,
      email: updated.user?.email,
      campusId: updated.campusId,
      campusIds: updated.campusLinks?.map((item) => item.campusId) || (updated.campusId ? [updated.campusId] : []),
      campuses: (updated.campusLinks || []).map((item) => ({
        id: item.campusId,
        name: item.campus?.name || "",
        location: item.campus?.location || "",
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update staff" });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        campusLinks: { select: { campusId: true } },
      },
    });
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    if (req.user?.role === "STAFF_ADMIN") {
      const targetCampusIds = getStaffCampusIds(staff);
      const canAccessTarget = targetCampusIds.length === 0
        ? false
        : targetCampusIds.some((item) => (req.staffCampusIds || []).includes(item));

      if (!canAccessTarget) {
        return res.status(403).json({ message: "Access denied for this staff" });
      }
    }

    await prisma.staffCampus.deleteMany({ where: { staffId: id } });

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
