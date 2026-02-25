const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { signup, login, register, forgotPassword, changePassword } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/signup", signup);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.put("/change-password", auth, changePassword);

module.exports = router;
