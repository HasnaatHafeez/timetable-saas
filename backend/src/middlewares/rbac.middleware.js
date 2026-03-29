const RBAC_CONFIG = require("../config/rbac.config");
const { PERMISSIONS, PERMISSION_HIERARCHY } = require("../config/permissions");

const ALL_SCOPE = Object.freeze({ type: "ALL" });

const normalizeRequiredPermissions = (permission) => {
  if (Array.isArray(permission)) {
    return permission.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const normalized = String(permission || "").trim();
  return normalized ? [normalized] : [];
};

const getUserPermissions = (role) => {
  const permissions = RBAC_CONFIG[role];
  return Array.isArray(permissions) ? permissions : [];
};

const expandPermissionHierarchy = (permissions) => {
  const expanded = new Set(permissions);
  const queue = [...expanded];

  while (queue.length > 0) {
    const current = queue.shift();
    const children = PERMISSION_HIERARCHY[current] || [];

    for (const childPermission of children) {
      if (!expanded.has(childPermission)) {
        expanded.add(childPermission);
        queue.push(childPermission);
      }
    }
  }

  return Array.from(expanded);
};

const hasPermission = (userPermissions, requiredPermissions) => {
  if (userPermissions.includes(PERMISSIONS.WILDCARD)) {
    return {
      allowed: true,
      matchedPermission: requiredPermissions[0] || PERMISSIONS.WILDCARD,
      effectivePermissions: [PERMISSIONS.WILDCARD],
    };
  }

  const expandedPermissions = expandPermissionHierarchy(userPermissions);
  const matchedPermission = requiredPermissions.find((item) => expandedPermissions.includes(item));
  return {
    allowed: Boolean(matchedPermission),
    matchedPermission: matchedPermission || null,
    effectivePermissions: expandedPermissions,
  };
};

const resolveScope = (permission, req) => {
  switch (permission) {
    case PERMISSIONS.AUDIT_READ_OWN:
      return {
        type: "OWN",
        userId: req.user?.id || undefined,
      };
    case PERMISSIONS.CAMPUS_READ_OWN:
    case PERMISSIONS.ACADEMIC_LEVEL_READ_OWN:
    case PERMISSIONS.STAFF_READ_OWN:
      return {
        type: "OWN",
      };
    default:
      return ALL_SCOPE;
  }
};

const requirePermission = (permission) => {
  const requiredPermissions = normalizeRequiredPermissions(permission);

  if (requiredPermissions.length === 0) {
    throw new Error("requirePermission(permission) requires at least one permission");
  }

  return (req, res, next) => {
    const role = req.user?.role;
    const userPermissions = getUserPermissions(role);
    const { allowed, matchedPermission, effectivePermissions } = hasPermission(userPermissions, requiredPermissions);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[RBAC] permission_check", {
        role,
        requiredPermission: requiredPermissions.length === 1 ? requiredPermissions[0] : requiredPermissions,
        userPermissions: effectivePermissions,
      });
    }

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (requiredPermissions.length > 1 && !matchedPermission) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.scope = resolveScope(matchedPermission, req);
    return next();
  };
};

module.exports = {
  requirePermission,
  resolveScope,
};
