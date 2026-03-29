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

    // Ensure staff users are reflected as STAFF_ADMIN in the admin listing
    const staffRecords = await prisma.staff.findMany({ select: { userId: true } });
    const staffUserIds = new Set(staffRecords.map(s => s.userId));

    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: staffUserIds.has(u.id) ? "STAFF_ADMIN" : u.role,
      isActive: u.isActive,
    })));
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

exports.getAdminCampuses = async (req, res) => {
  try {
    const campuses = await prisma.campus.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(campuses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch campuses" });
  }
};

exports.getAdminOverview = async (req, res) => {
  try {
    const { range = "30d" } = req.query;
    const rangeMsMap = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    const rangeInMs = rangeMsMap[range] || rangeMsMap["30d"];
    const fromDate = new Date(Date.now() - rangeInMs);
    const previousFromDate = new Date(fromDate.getTime() - rangeInMs);

    const [
      totalCampuses,
      totalUsers,
      totalTeachers,
      activeSubscriptions,
      currentRangeSubscriptions,
      previousRangeSubscriptions,
      freeCount,
      proCount,
      enterpriseCount,
      timetableUsageAggregate,
      newCampuses,
      newSubscriptions,
      usageInRangeAggregate,
      cancelledInRangeCount,
    ] = await Promise.all([
      prisma.campus.count(),
      prisma.user.count(),
      prisma.teacher.count(),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        select: { plan: true },
      }),
      prisma.subscription.findMany({
        where: {
          createdAt: {
            gte: fromDate,
          },
        },
        select: { plan: true },
      }),
      prisma.subscription.findMany({
        where: {
          createdAt: {
            gte: previousFromDate,
            lt: fromDate,
          },
        },
        select: { plan: true },
      }),
      prisma.campus.count({ where: { plan: "FREE" } }),
      prisma.campus.count({ where: { plan: "PRO" } }),
      prisma.campus.count({ where: { plan: "ENTERPRISE" } }),
      prisma.usage.aggregate({
        where: { feature: "TIMETABLE_GENERATE_PER_MONTH" },
        _sum: { count: true },
      }),
      prisma.campus.count({
        where: { createdAt: { gte: fromDate } },
      }),
      prisma.subscription.count({
        where: { createdAt: { gte: fromDate } },
      }),
      prisma.usage.aggregate({
        where: {
          createdAt: { gte: fromDate },
          feature: "TIMETABLE_GENERATE_PER_MONTH",
        },
        _sum: { count: true },
      }),
      prisma.subscription.count({
        where: {
          status: "CANCELLED",
          endDate: { gte: fromDate },
        },
      }),
    ]);

    const PRICING = {
      FREE: 0,
      PRO: 20,
      ENTERPRISE: 100,
    };

    // Calculate totalRevenue from ALL ACTIVE subscriptions (MRR)
    let totalRevenue = 0;
    const revenueByPlan = {
      FREE: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };

    for (const sub of activeSubscriptions) {
      const price = PRICING[sub.plan] || 0;
      totalRevenue += price;

      if (Object.prototype.hasOwnProperty.call(revenueByPlan, sub.plan)) {
        revenueByPlan[sub.plan] += price;
      }
    }

    // Calculate range-based revenue for growth metrics
    let revenueCurrent = 0;
    for (const sub of currentRangeSubscriptions) {
      const price = PRICING[sub.plan] || 0;
      revenueCurrent += price;
    }

    let previousRevenue = 0;
    for (const sub of previousRangeSubscriptions) {
      const price = PRICING[sub.plan] || 0;
      previousRevenue += price;
    }

    const revenueChange = previousRevenue === 0
      ? 100
      : ((revenueCurrent - previousRevenue) / previousRevenue) * 100;

    const churnRate = activeSubscriptions.length === 0
      ? 0
      : (cancelledInRangeCount / activeSubscriptions.length) * 100;

    res.json({
      totalCampuses,
      totalUsers,
      totalTeachers,
      totalRevenue,
      revenue: {
        total: totalRevenue,
        byPlan: revenueByPlan,
        activeSubscriptions: activeSubscriptions.length,
      },
      planDistribution: {
        FREE: freeCount,
        PRO: proCount,
        ENTERPRISE: enterpriseCount,
      },
      usageSummary: {
        totalTimetableGenerations: timetableUsageAggregate._sum.count || 0,
      },
      growth: {
        newCampuses,
        newSubscriptions,
        usageInRange: usageInRangeAggregate._sum.count || 0,
        revenueCurrent,
        revenuePrevious: previousRevenue,
        revenueChange,
      },
      churn: {
        cancelledSubscriptions: cancelledInRangeCount,
        churnRate,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch admin overview" });
  }
};

exports.getAdminCampusById = async (req, res) => {
  try {
    const { id } = req.params;

    const campus = await prisma.campus.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        location: true,
        institutionId: true,
        plan: true,
        createdAt: true,
      },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const [usageStats, teachersCount, subjectsCount, currentSubscription, subscriptionHistory] = await Promise.all([
      prisma.usage.findMany({
        where: { campusId: id },
        select: {
          feature: true,
          count: true,
          month: true,
          year: true,
          updatedAt: true,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }, { feature: "asc" }],
      }),
      prisma.teacher.count({ where: { campusId: id } }),
      prisma.subject.count({ where: { campusId: id } }),
      prisma.subscription.findFirst({
        where: {
          campusId: id,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findMany({
        where: { campusId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      campus,
      usageStats,
      teacherCount: teachersCount,
      subjectCount: subjectsCount,
      currentSubscription,
      subscriptionHistory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch campus details" });
  }
};

exports.updateCampusSubscription = async (req, res) => {
  try {
    const { campusId, newPlan } = req.body;
    const validPlans = ["FREE", "PRO", "ENTERPRISE"];

    if (!campusId) {
      return res.status(400).json({ message: "Campus ID is required" });
    }

    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({
        message: `Invalid plan. Must be one of: ${validPlans.join(", ")}`,
      });
    }

    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const now = new Date();

    const result = await prisma.$transaction(async tx => {
      // Find current ACTIVE subscription to maintain history integrity.
      const activeSubscription = await tx.subscription.findFirst({
        where: {
          campusId,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      });

      // Cancel previous subscription if it exists
      if (activeSubscription) {
        await tx.subscription.update({
          where: { id: activeSubscription.id },
          data: {
            status: "CANCELLED",
            endDate: now,
          },
        });
      }

      // Verify no other ACTIVE subscription exists (safeguard against race conditions).
      const existingActive = await tx.subscription.count({
        where: {
          campusId,
          status: "ACTIVE",
        },
      });

      if (existingActive > 0) {
        throw new Error(`Campus ${campusId} already has an active subscription. Cannot create multiple active subscriptions.`);
      }

      // Create new ACTIVE subscription
      const newSubscription = await tx.subscription.create({
        data: {
          campusId,
          plan: newPlan,
          status: "ACTIVE",
          source: "MANUAL",
          startDate: now,
        },
      });

      // Update campus plan in same transaction
      const updatedCampus = await tx.campus.update({
        where: { id: campusId },
        data: { plan: newPlan },
        select: {
          id: true,
          name: true,
          plan: true,
          createdAt: true,
        },
      });

      return {
        campus: updatedCampus,
        subscription: newSubscription,
      };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update campus subscription" });
  }
};
