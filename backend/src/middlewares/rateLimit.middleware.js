const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const DEFAULT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300);

const store = new Map();

const getIdentifier = (req) => {
  const userId = req.user?.id;
  if (userId) return `user:${userId}`;

  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (forwardedFor) return `ip:${forwardedFor}`;

  return `ip:${req.ip || "unknown"}`;
};

const cleanupExpired = (now, windowMs) => {
  for (const [key, entry] of store.entries()) {
    if ((now - entry.windowStart) >= windowMs) {
      store.delete(key);
    }
  }
};

const createRateLimitMiddleware = ({ windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS } = {}) => {
  return (req, res, next) => {
    const now = Date.now();
    cleanupExpired(now, windowMs);

    const identifier = getIdentifier(req);
    const currentEntry = store.get(identifier);

    if (!currentEntry || (now - currentEntry.windowStart) >= windowMs) {
      store.set(identifier, { count: 1, windowStart: now });
      return next();
    }

    currentEntry.count += 1;
    store.set(identifier, currentEntry);

    if (currentEntry.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - currentEntry.windowStart)) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    return next();
  };
};

module.exports = {
  createRateLimitMiddleware,
};
