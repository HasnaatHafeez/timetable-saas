const prisma = require("../prisma/client");

const ALLOWED_TYPES = new Set(["USER_ACTION", "SECURITY", "SYSTEM", "ERROR"]);
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const parsePositiveInt = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const floored = Math.floor(numeric);
  return floored > 0 ? floored : fallback;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getAccessScope = (req) => {
  const role = req.user?.role;

  // SUPER_ADMIN equivalent in this backend: SYSTEM_ADMIN
  if (role === "SYSTEM_ADMIN") {
    return { canViewAllInCampus: true, restrictToUserId: null };
  }

  // ADMIN equivalent in this backend: INSTITUTION_OWNER
  if (role === "INSTITUTION_OWNER") {
    return { canViewAllInCampus: true, restrictToUserId: null };
  }

  // STAFF and teachers can only see their own logs.
  if (role === "STAFF_ADMIN" || role === "TEACHER") {
    return { canViewAllInCampus: false, restrictToUserId: req.user?.id || null };
  }

  return { canViewAllInCampus: false, restrictToUserId: null };
};

exports.getAuditLogs = async (req, res) => {
  try {
    const campusId = req.campusId;
    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const accessScope = getAccessScope(req);
    if (!accessScope.canViewAllInCampus && !accessScope.restrictToUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const page = parsePositiveInt(req.query?.page, 1);
    const requestedLimit = parsePositiveInt(req.query?.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const sortDirection = String(req.query?.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where = {
      campusId,
    };

    const typeFilter = String(req.query?.type || "").toUpperCase();
    if (typeFilter) {
      if (!ALLOWED_TYPES.has(typeFilter)) {
        return res.status(400).json({ message: "Invalid audit log type" });
      }
      where.type = typeFilter;
    }

    if (req.query?.model) {
      where.model = String(req.query.model).trim();
    }

    if (req.query?.action) {
      where.action = String(req.query.action).trim();
    }

    if (req.query?.userId) {
      const requestedUserId = String(req.query.userId).trim();
      if (!accessScope.canViewAllInCampus && requestedUserId !== accessScope.restrictToUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      where.userId = requestedUserId;
    }

    if (!accessScope.canViewAllInCampus && accessScope.restrictToUserId) {
      where.userId = accessScope.restrictToUserId;
    }

    const fromDate = parseDate(req.query?.fromDate);
    const toDate = parseDate(req.query?.toDate);
    if ((req.query?.fromDate && !fromDate) || (req.query?.toDate && !toDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    // Optional keyword support on core fields. Payload JSON search is intentionally conservative.
    const keyword = String(req.query?.keyword || "").trim();
    if (keyword) {
      where.OR = [
        { model: { contains: keyword, mode: "insensitive" } },
        { action: { contains: keyword, mode: "insensitive" } },
        { userId: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          userId: true,
          campusId: true,
          type: true,
          model: true,
          action: true,
          description: true,
          payload: true,
          createdAt: true,
        },
        orderBy: { createdAt: sortDirection },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};
