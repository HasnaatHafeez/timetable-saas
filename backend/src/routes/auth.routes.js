const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
	switchCampus,
	getSession,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/switch-campus", auth, switchCampus);
router.get("/session", auth, getSession);

module.exports = router;
