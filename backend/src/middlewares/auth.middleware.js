const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (decoded.role === "STAFF_ADMIN") {
      const staff = await prisma.staff.findFirst({
        where: { userId: decoded.id },
        select: {
          id: true,
          institutionId: true,
          campusId: true,
          campusLinks: { select: { campusId: true } },
        },
      });

      if (!staff) {
        return res.status(403).json({ message: "Staff access is not configured" });
      }

      const staffCampusIds = Array.from(
        new Set([
          ...(staff.campusLinks || []).map((item) => item.campusId),
          ...(staff.campusId ? [staff.campusId] : []),
        ].filter(Boolean))
      );

      req.staffCampusIds = staffCampusIds;
      req.staffInstitutionId = staff.institutionId;

      if (!req.user.campusId && staffCampusIds.length === 1) {
        req.user.campusId = staffCampusIds[0];
      }

      const requestedInstitutionId = req.body?.institutionId ?? req.query?.institutionId;
      if (requestedInstitutionId && requestedInstitutionId !== staff.institutionId) {
        return res.status(403).json({ message: "Access denied for this institution" });
      }

      const requestedCampusIds = [];
      if (req.query?.campusId) requestedCampusIds.push(String(req.query.campusId));
      if (req.body?.campusId) requestedCampusIds.push(String(req.body.campusId));
      if (Array.isArray(req.body?.campusIds)) {
        requestedCampusIds.push(...req.body.campusIds.map((item) => String(item)));
      }

      const invalidCampusId = requestedCampusIds
        .map((item) => item.trim())
        .filter(Boolean)
        .find((item) => !staffCampusIds.includes(item));

      if (invalidCampusId) {
        return res.status(403).json({ message: "Access denied for selected campus" });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
