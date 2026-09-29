// In-memory fixed-window limiter, keyed by IP. Good enough for a single server instance.
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many attempts, please try again later' } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = hits.get(key);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    if (++entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ message });
    }
    next();
  };
}
