const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const { getAuditLogs } = require("../controllers/auditLog.controller");

const router = express.Router();

router.get(
	"/",
	auth,
	tenant,
	requirePermission([PERMISSIONS.AUDIT_READ_ALL, PERMISSIONS.AUDIT_READ_OWN]),
	getAuditLogs
);

module.exports = router;
