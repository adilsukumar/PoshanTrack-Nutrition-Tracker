export function securityHeaders(_req, res, next) {
  res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Strict-Transport-Security': 'max-age=31536000', 'Referrer-Policy': 'no-referrer' });
  next();
}

import { createHash, timingSafeEqual } from 'node:crypto';
export function authenticated(req, res, next) {
  const expected = process.env.PRIVATE_CLIENT_KEY || '';
  // Render's Generate button produces 32 hex characters (128 bits of entropy).
  // Also accept the 64-character code used by local development.
  if (!/^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{64})$/.test(expected)) return res.status(503).json({ error: 'Private access is not configured.' });
  const supplied = req.headers['x-client-key'];
  if (typeof supplied !== 'string' || supplied.length > 128 || !timingSafeEqual(createHash('sha256').update(expected).digest(), createHash('sha256').update(supplied).digest())) return res.status(401).json({ error: 'Private access code is missing or invalid.' });
  req.user = { id: 'private-client' }; next();
}
let usageDay = ''; let attempts = 0;
export function consumeDailyAttempt() {
  const today = new Date().toISOString().slice(0,10);
  if (today !== usageDay) { usageDay = today; attempts = 0; }
  const configured = Number(process.env.MAX_DAILY_ANALYSES || 30);
  const cap = Number.isInteger(configured) && configured >= 1 && configured <= 100 ? configured : 30;
  if (attempts >= cap) return false;
  attempts++; return true;
}

export function limit(namespace, max, windowMs) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    // Bound memory and expire entries even under anonymous abuse.
    if (buckets.size > 10000) for (const [key, value] of buckets) if (value.reset <= now) buckets.delete(key);
    const key = namespace === 'network' ? req.socket.remoteAddress : req.user?.id;
    const bucket = buckets.get(key);
    if (!bucket || bucket.reset <= now) {
      if (!bucket && buckets.size >= 10000) return res.status(429).json({ error: 'Server busy.' });
      buckets.set(key, { count: 1, reset: now + windowMs }); return next();
    }
    if (++bucket.count > max) { res.set('Retry-After', String(Math.ceil((bucket.reset-now)/1000))); return res.status(429).json({ error: 'Too many requests. Try later.' }); }
    next();
  };
}

export function validateImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return 'image/webp';
  return null;
}

export function safeError(error, _req, res, _next) {
  if (res.headersSent) return;
  const oversized = error.code === 'LIMIT_FILE_SIZE' || error.type === 'entity.too.large';
  res.status(oversized ? 413 : 400).json({ error: oversized ? 'Upload too large (maximum 6 MB).' : 'Request could not be processed.' });
}
