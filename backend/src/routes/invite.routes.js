const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
	createInvite,
	acceptInvite,
	listPendingInvites,
	revokeInvite,
	resendInvite,
} = require("../controllers/invite.controller");

const router = express.Router();

router.get("/", auth, requirePermission(PERMISSIONS.INVITE_MANAGE), listPendingInvites);
router.post("/", auth, requirePermission(PERMISSIONS.INVITE_MANAGE), createInvite);
router.delete("/:id", auth, requirePermission(PERMISSIONS.INVITE_MANAGE), revokeInvite);
router.post("/resend", auth, requirePermission(PERMISSIONS.INVITE_MANAGE), resendInvite);
router.post("/accept", auth, acceptInvite);

module.exports = router;
