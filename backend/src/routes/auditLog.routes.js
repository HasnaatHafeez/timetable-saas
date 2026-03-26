const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { getAuditLogs } = require("../controllers/auditLog.controller");

const router = express.Router();

router.get("/", auth, tenant, getAuditLogs);

module.exports = router;
