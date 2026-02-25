const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { getAllInstitutions, getAllUsers, updateUser, deleteInstitution } = require("../controllers/admin.controller");

const router = express.Router();

router.get("/institutions", auth, role(["SYSTEM_ADMIN"]), getAllInstitutions);
router.get("/users", auth, role(["SYSTEM_ADMIN"]), getAllUsers);
router.put("/users/:id", auth, role(["SYSTEM_ADMIN"]), updateUser);
router.delete("/institutions/:id", auth, role(["SYSTEM_ADMIN"]), deleteInstitution);

module.exports = router;
