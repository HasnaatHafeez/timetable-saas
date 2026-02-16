const express = require("express");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/owner-only",
  auth,
  role(["INSTITUTION_OWNER"]),
  (req, res) => {
    res.json({
      message: "Welcome Institution Owner",
      user: req.user,
    });
  }
);

module.exports = router;
