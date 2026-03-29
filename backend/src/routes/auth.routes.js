const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
	signup,
	login,
	register,
	forgotPassword,
	resetPassword,
	changePassword,
	switchCampus,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/signup", signup);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/change-password", auth, changePassword);
router.post("/switch-campus", auth, switchCampus);

module.exports = router;
