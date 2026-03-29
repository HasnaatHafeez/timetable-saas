const express = require("express");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/tenant.middleware");
const { createCheckoutSession, handleStripeWebhook } = require("../controllers/billing.controller");

const router = express.Router();

// Protected: Requires authentication and tenant context
router.post("/checkout-session", auth, tenant, createCheckoutSession);

// Public: Stripe webhook (signature verification pending)
router.post("/webhook", handleStripeWebhook);

module.exports = router;
