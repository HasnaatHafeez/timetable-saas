const crypto = require("crypto");
const prisma = require("../prisma/client");

const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS || 7);
const ALLOWED_INVITE_ROLES = new Set(["TEACHER", "STAFF_ADMIN"]);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const resolveCampusForInvite = async ({ role, userId, campusId, staffCampusIds }) => {
  if (!campusId) return null;

  if (role === "SYSTEM_ADMIN") {
    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      select: { id: true },
    });
    return campus ? campusId : null;
  }

  if (role === "INSTITUTION_OWNER") {
    const campus = await prisma.campus.findFirst({
      where: {
        id: campusId,
        institution: {
          ownerId: userId,
        },
      },
      select: { id: true },
    });
    return campus ? campusId : null;
  }

  if (role === "STAFF_ADMIN") {
    const allowedCampusIds = Array.isArray(staffCampusIds) ? staffCampusIds : [];
    return allowedCampusIds.includes(campusId) ? campusId : null;
  }

  return null;
};

exports.createInvite = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId || !requesterRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["SYSTEM_ADMIN", "INSTITUTION_OWNER", "STAFF_ADMIN"].includes(requesterRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const email = normalizeEmail(req.body?.email);
    const role = String(req.body?.role || "").trim();
    const campusId = String(req.body?.campusId || req.user?.campusId || "").trim();

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    if (!ALLOWED_INVITE_ROLES.has(role)) {
      return res.status(400).json({ message: "Invalid invite role" });
    }

    const authorizedCampusId = await resolveCampusForInvite({
      role: requesterRole,
      userId: requesterId,
      campusId,
      staffCampusIds: req.staffCampusIds,
    });

    if (!authorizedCampusId) {
      return res.status(403).json({ message: "Access denied for selected campus" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invite = await prisma.invite.create({
      data: {
        token,
        email,
        campusId: authorizedCampusId,
        role,
        expiresAt,
        invitedByUserId: requesterId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        campusId: true,
        status: true,
        expiresAt: true,
        token: true,
      },
    });

    const frontendBaseUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const inviteLink = frontendBaseUrl
      ? `${frontendBaseUrl}/accept-invite?token=${encodeURIComponent(invite.token)}`
      : null;

    return res.status(201).json({
      message: "Invitation created",
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        campusId: invite.campusId,
        status: invite.status,
        expiresAt: invite.expiresAt,
      },
      inviteToken: invite.token,
      inviteLink,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create invitation" });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const currentSupabaseId = req.user?.supabaseId;
    const currentEmail = normalizeEmail(req.user?.email);
    const token = String(req.body?.token || "").trim();

    if (!currentUserId || !currentSupabaseId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!token) {
      return res.status(400).json({ message: "token is required" });
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        email: true,
        role: true,
        campusId: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invite.status !== "PENDING") {
      return res.status(400).json({ message: "Invitation is no longer valid" });
    }

    if (invite.expiresAt <= new Date()) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
      return res.status(400).json({ message: "Invitation has expired" });
    }

    const inviteEmail = normalizeEmail(invite.email);
    if (!currentEmail || currentEmail !== inviteEmail) {
      return res.status(403).json({ message: "Invitation email does not match authenticated user" });
    }

    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findFirst({
        where: {
          email: {
            equals: inviteEmail,
            mode: "insensitive",
          },
        },
      });

      if (!user) {
        user = await tx.user.findUnique({ where: { id: currentUserId } });
      }

      if (!user) {
        throw new Error("User not found");
      }

      user = await tx.user.update({
        where: { id: user.id },
        data: {
          supabaseId: currentSupabaseId,
          role: invite.role,
          activeCampusId: invite.campusId,
        },
      });

      await tx.userCampus.upsert({
        where: {
          userId_campusId: {
            userId: user.id,
            campusId: invite.campusId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          campusId: invite.campusId,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      return {
        userId: user.id,
        role: user.role,
        activeCampusId: user.activeCampusId,
      };
    });

    return res.json({
      message: "Invitation accepted",
      user: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to accept invitation" });
  }
};
