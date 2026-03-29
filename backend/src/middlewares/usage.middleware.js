const prisma = require("../prisma/client");
const { getPlanLimits } = require("../config/features");

const requireUsageLimit = (featureKey) => {
  return async (req, res, next) => {
    try {
      const campusId = req.campusId;

      if (!campusId) {
        return res.status(400).json({ message: "Campus context missing" });
      }

      // get campus plan
      const campus = await prisma.campus.findUnique({
        where: { id: campusId },
        select: { plan: true },
      });

      if (!campus) {
        return res.status(404).json({ message: "Campus not found" });
      }

      const limits = getPlanLimits(campus.plan);
      const limit = limits[featureKey];

      // no limit defined → allow
      if (limit === undefined) {
        return next();
      }

      // unlimited
      if (limit === -1) {
        return next();
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const usage = await prisma.usage.findUnique({
        where: {
          campusId_feature_month_year: {
            campusId,
            feature: featureKey,
            month,
            year,
          },
        },
      });

      const currentCount = usage?.count || 0;
      const remaining = limit === -1 ? -1 : Math.max(limit - currentCount, 0);

      if (currentCount >= limit) {
        return res.status(403).json({
          message: "Usage limit reached. Please upgrade your plan.",
          usage: {
            used: currentCount,
            limit,
            remaining: 0,
            plan: campus.plan,
            feature: featureKey,
          },
        });
      }

      // increment usage (safe upsert)
      await prisma.usage.upsert({
        where: {
          campusId_feature_month_year: {
            campusId,
            feature: featureKey,
            month,
            year,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          campusId,
          feature: featureKey,
          month,
          year,
          count: 1,
        },
      });

      // attach usage info to request for downstream handlers
      req.usage = {
        used: currentCount + 1,
        limit,
        remaining: limit === -1 ? -1 : Math.max(limit - (currentCount + 1), 0),
        plan: campus.plan,
        feature: featureKey,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { requireUsageLimit };
