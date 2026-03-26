const prisma = require("../prisma/client");
const { runWithTenantContext } = require("../tenant/context");

const toCleanString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const getRequestedCampusId = (req) => {
  const headerCampusId = toCleanString(req.headers["x-campus-id"]);
  const queryCampusId = toCleanString(req.query?.campusId);
  const bodyCampusId = toCleanString(req.body?.campusId);

  const candidates = [headerCampusId, queryCampusId, bodyCampusId].filter(Boolean);
  if (candidates.length === 0) return "";

  const [first] = candidates;
  const mismatch = candidates.some((item) => item !== first);
  return mismatch ? null : first;
};

const validateCampusAccess = async (req, campusId) => {
  const role = req.user?.role;

  if (role === "SYSTEM_ADMIN") {
    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      select: { id: true },
    });
    return !!campus;
  }

  if (role === "STAFF_ADMIN") {
    const staffCampusIds = Array.isArray(req.staffCampusIds) ? req.staffCampusIds : [];
    return staffCampusIds.includes(campusId);
  }

  if (role === "INSTITUTION_OWNER") {
    const campus = await prisma.campus.findFirst({
      where: {
        id: campusId,
        institution: {
          ownerId: req.user?.id,
        },
      },
      select: { id: true },
    });

    return !!campus;
  }

  if (role === "TEACHER") {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { email: true },
    });

    const email = toCleanString(user?.email).toLowerCase();
    if (!email) return false;

    const teacher = await prisma.teacher.findFirst({
      where: {
        campusId,
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    return !!teacher;
  }

  return false;
};

module.exports = async (req, res, next) => {
  try {
    const tokenCampusId = toCleanString(req.user?.campusId || req.user?.activeCampusId);
    const requestedCampusId = getRequestedCampusId(req);

    if (requestedCampusId === null) {
      return res.status(400).json({ message: "Conflicting campusId values in request" });
    }

    const campusId = tokenCampusId || requestedCampusId;
    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    if (tokenCampusId && requestedCampusId && tokenCampusId !== requestedCampusId) {
      return res.status(403).json({ message: "Access denied for selected campus" });
    }

    const requestId = toCleanString(req.headers["x-request-id"]) || null;

    return runWithTenantContext(
      {
        campusId,
        userId: req.user?.id || null,
        role: req.user?.role || null,
        requestId,
      },
      async () => {
        const hasAccess = await validateCampusAccess(req, campusId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied for selected campus" });
        }

        req.campusId = campusId;

        if (req.query && !req.query.campusId) {
          req.query.campusId = campusId;
        }

        if (req.body && typeof req.body === "object" && !Array.isArray(req.body) && !req.body.campusId) {
          req.body.campusId = campusId;
        }

        return next();
      }
    );
  } catch (error) {
    return next(error);
  }
};
