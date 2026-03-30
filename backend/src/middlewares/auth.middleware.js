const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");

const shouldDebugAuth = process.env.AUTH_DEBUG === "true" || process.env.NODE_ENV !== "production";
const debugAuth = (message, data = {}) => {
  if (shouldDebugAuth) {
    console.debug("[AUTH]", message, data);
  }
};

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  debugAuth("Incoming request", {
    method: req.method,
    path: req.originalUrl || req.path,
    hasAuthorizationHeader: Boolean(authHeader),
  });

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  debugAuth("Extracted bearer token", {
    hasToken: Boolean(token),
    tokenPreview: token ? `${String(token).slice(0, 10)}...` : null,
  });

  try {
    // Verify token using Supabase JWT secret
    const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
    if (!supabaseSecret) {
      return res.status(500).json({ message: "Supabase JWT secret not configured" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      return res.status(500).json({ message: "Supabase URL not configured" });
    }

    const decoded = jwt.verify(token, supabaseSecret);
    const expectedIssuer = `${supabaseUrl}/auth/v1`;
    debugAuth("Decoded Supabase JWT", {
      iss: decoded.iss,
      aud: decoded.aud,
      sub: decoded.sub,
      exp: decoded.exp,
    });

    if (decoded.iss !== expectedIssuer || decoded.aud !== "authenticated") {
      debugAuth("Token claims rejected", {
        expectedIssuer,
        actualIssuer: decoded.iss,
        actualAudience: decoded.aud,
      });
      return res.status(401).json({ message: "Invalid token claims" });
    }

    const supabaseId = decoded.sub; // Supabase user ID
    const email = decoded.email;

    if (!supabaseId) {
      return res.status(401).json({ message: "Invalid token: missing user ID" });
    }

    // Find user in database using supabaseId
    let user = await prisma.user.findUnique({
      where: { supabaseId },
    });
    debugAuth("User lookup by supabaseId", {
      supabaseId,
      found: Boolean(user),
    });

    if (!user) {
      if (!email) {
        return res.status(401).json({ message: "Invalid token: missing email" });
      }

      const normalizedEmail = String(email).trim().toLowerCase();

      user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { supabaseId },
        });
        debugAuth("Linked existing user to supabaseId", {
          userId: user.id,
          email: user.email,
        });
      } else {
        const generatedName = normalizedEmail.split("@")[0] || "User";

        user = await prisma.user.create({
          data: {
            supabaseId,
            email: normalizedEmail,
            name: generatedName,
            password: "SUPABASE_AUTH_MANAGED",
            role: "TEACHER",
            isActive: true,
          },
        });
        debugAuth("Auto-created user from Supabase token", {
          userId: user.id,
          email: user.email,
          role: user.role,
        });
      }
    }

    if (user.activeCampusId) {
      const membership = await prisma.userCampus.findUnique({
        where: {
          userId_campusId: {
            userId: user.id,
            campusId: user.activeCampusId,
          },
        },
        select: { id: true },
      });

      if (!membership) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { activeCampusId: null },
        });
        debugAuth("Cleared invalid active campus assignment", {
          userId: user.id,
        });
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "User account is inactive" });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      supabaseId: user.supabaseId,
      campusId: user.activeCampusId || null,
      activeCampusId: user.activeCampusId || null,
    };

    if (user.role === "STAFF_ADMIN") {
      const staff = await prisma.staff.findFirst({
        where: { userId: user.id },
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

      const requestedInstitutionId = req.body?.institutionId ?? req.query?.institutionId;
      if (requestedInstitutionId && requestedInstitutionId !== staff.institutionId) {
        return res.status(403).json({ message: "Access denied for this institution" });
      }

      const requestedCampusIds = [];
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

    const isGlobalRole = ["SYSTEM_ADMIN", "INSTITUTION_OWNER"].includes(user.role);
    const requestPath = String(req.path || req.originalUrl || "");
    const isSwitchCampusRoute = req.method === "POST" && requestPath.endsWith("/switch-campus");
    const isAcceptInviteRoute = req.method === "POST" && requestPath.endsWith("/accept");

    if (!req.user.campusId && !isGlobalRole && !isSwitchCampusRoute && !isAcceptInviteRoute) {
      debugAuth("Rejected due to missing campus assignment", {
        userId: user.id,
        role: user.role,
      });
      return res.status(403).json({
        message: "User not assigned to any campus",
      });
    }

    debugAuth("Auth middleware success", {
      userId: req.user.id,
      role: req.user.role,
      campusId: req.user.campusId,
    });

    next();
  } catch (err) {
    debugAuth("Auth middleware error", {
      message: err?.message,
      name: err?.name,
    });
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

