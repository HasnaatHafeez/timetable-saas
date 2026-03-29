const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
	getAllInstitutions,
	getAllUsers,
	updateUser,
	deleteInstitution,
	getAdminOverview,
	getAdminCampuses,
	getAdminCampusById,
	updateCampusSubscription,
} = require("../controllers/admin.controller");

const router = express.Router();

router.get("/overview", auth, requirePermission(PERMISSIONS.ADMIN_ACCESS), getAdminOverview);
router.get("/institutions", auth, requirePermission(PERMISSIONS.ADMIN_ACCESS), getAdminCampuses);
router.get("/institutions/:id", auth, requirePermission(PERMISSIONS.ADMIN_ACCESS), getAdminCampusById);
router.patch("/subscription", auth, requirePermission(PERMISSIONS.ADMIN_ACCESS), updateCampusSubscription);

router.get("/legacy-institutions", auth, requirePermission(PERMISSIONS.ADMIN_MANAGE), getAllInstitutions);
router.get("/users", auth, requirePermission(PERMISSIONS.ADMIN_MANAGE), getAllUsers);
router.put("/users/:id", auth, requirePermission(PERMISSIONS.ADMIN_MANAGE), updateUser);
router.delete("/institutions/:id", auth, requirePermission(PERMISSIONS.ADMIN_MANAGE), deleteInstitution);

module.exports = router;
