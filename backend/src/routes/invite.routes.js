const express = require("express");
const auth = require("../middlewares/auth.middleware");
const { createInvite, acceptInvite } = require("../controllers/invite.controller");

const router = express.Router();

router.post("/", auth, createInvite);
router.post("/accept", auth, acceptInvite);

module.exports = router;
