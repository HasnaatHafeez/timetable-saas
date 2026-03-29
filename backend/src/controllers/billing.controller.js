const prisma = require("../prisma/client");

/**
 * POST /api/billing/checkout-session
 * Accepts plan and returns mock checkout URL for Stripe integration
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    const campusId = req.campus?.id;

    if (!campusId) {
      return res.status(400).json({ message: "Campus ID not found in request" });
    }

    const validPlans = ["FREE", "PRO", "ENTERPRISE"];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        message: `Invalid plan. Must be one of: ${validPlans.join(", ")}`,
      });
    }

    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    // TODO: Integrate with Stripe API to create real checkout session
    // For now, return mock checkout URL for testing
    const mockCheckoutUrl = `https://checkout.stripe.com/pay/mock_${plan}_${campusId}`;

    res.json({
      sessionId: `cs_mock_${Date.now()}`,
      url: mockCheckoutUrl,
      plan,
      campusId,
      metadata: {
        campusId,
        plan,
      },
      message: "Mock Stripe checkout session (real integration pending)",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events for subscription updates
 * Currently handles: checkout.session.completed
 * TODO: Validate Stripe signature with stripe-signature header
 * TODO: Add comprehensive error logging for all event types
 */
exports.handleStripeWebhook = async (req, res) => {
  try {
    const event = req.body;

    // TODO: Verify webhook signature with Stripe before processing
    // const sig = req.headers["stripe-signature"];
    // const stripeEvent = stripe.webhooks.constructEvent(
    //   rawBody,
    //   sig,
    //   process.env.STRIPE_WEBHOOK_SECRET
    // );

    console.log("Received Stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        // Extract metadata from Stripe checkout session
        const session = event.data.object;
        const { campusId, plan } = session.metadata || {};

        if (!campusId || !plan) {
          console.warn("Missing metadata in checkout.session.completed:", {
            campusId,
            plan,
          });
          return res.status(400).json({
            message: "Missing campusId or plan in webhook metadata",
          });
        }

        // Validate plan
        const validPlans = ["FREE", "PRO", "ENTERPRISE"];
        if (!validPlans.includes(plan)) {
          console.warn(`Invalid plan in webhook: ${plan}`);
          return res.status(400).json({ message: "Invalid plan in webhook" });
        }

        // Verify campus exists
        const campus = await prisma.campus.findUnique({
          where: { id: campusId },
        });
        if (!campus) {
          console.warn(`Campus not found in webhook: ${campusId}`);
          return res.status(404).json({ message: "Campus not found" });
        }

        const now = new Date();

        // Handle subscription update in transaction
        await prisma.$transaction(async tx => {
          // Find and cancel existing ACTIVE subscription
          const activeSubscription = await tx.subscription.findFirst({
            where: {
              campusId,
              status: "ACTIVE",
            },
            orderBy: { createdAt: "desc" },
          });

          if (activeSubscription) {
            await tx.subscription.update({
              where: { id: activeSubscription.id },
              data: {
                status: "CANCELLED",
                endDate: now,
              },
            });
          }

          // Create new ACTIVE subscription from Stripe
          await tx.subscription.create({
            data: {
              campusId,
              plan,
              status: "ACTIVE",
              source: "STRIPE",
              startDate: now,
            },
          });

          // Update campus plan
          await tx.campus.update({
            where: { id: campusId },
            data: { plan },
          });
        });

        console.log(`Subscription updated from Stripe: campus=${campusId}, plan=${plan}`);
        return res.json({ received: true, processed: true });
      }

      case "charge.failed": {
        // TODO: Handle payment failures
        // Log failed payment, notify campus owner, etc.
        console.log("Charge failed event received (not yet implemented)");
        return res.json({ received: true });
      }

      case "customer.subscription.updated": {
        // TODO: Handle subscription updates (e.g., plan changes via Stripe portal)
        console.log("Subscription updated event received (not yet implemented)");
        return res.json({ received: true });
      }

      default: {
        // Acknowledge unhandled event types
        console.log(`Unhandled Stripe event type: ${event.type}`);
        return res.json({ received: true });
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    // TODO: Add structured error logging (e.g., to external logging service)
    // Stripe expects 2xx response to acknowledge receipt, even on errors
    res.json({ received: true, error: error.message });
  }
};
