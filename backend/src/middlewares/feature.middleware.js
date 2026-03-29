const prisma = require("../prisma/client");
const { hasFeature } = require("../config/features");

const requireFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const campusId = req.campusId;

      if (!campusId) {
        return res.status(400).json({ message: "Campus context missing" });
      }

      const campus = await prisma.campus.findUnique({
        where: { id: campusId },
        select: { plan: true },
      });

      if (!campus) {
        return res.status(404).json({ message: "Campus not found" });
      }

      if (!hasFeature(campus.plan, feature)) {
        return res.status(403).json({
          message: "This feature is not available in your current plan",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireFeature };
