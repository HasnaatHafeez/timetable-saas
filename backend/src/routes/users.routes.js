const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { updateProfile } = require("../controllers/user.controller");

const router = express.Router();

router.put("/profile", auth, updateProfile);

module.exports = router;
