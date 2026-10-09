import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export type ClientAuthVerdict =
  | "unconfigured"
  | "missing"
  | "invalid"
  | "authorized";

/**
 * Temporary service-to-service access control for private operator API routes.
 * Covers client records, notes, alert preferences, read/bookmark changes
 * and synchronization controls.
 *
 * No token is embedded in the frontend; a future user-facing client module
 * must use an actual authenticated session and staff-level authorization.
 * If not configured with a sufficiently long secret, access fails closed.
 */
export function checkClientApiToken(
  authorization: string | undefined,
  secret: string | undefined,
): ClientAuthVerdict {
  if (
    !secret ||
    secret.length < 32 ||
    secret !== secret.trim() ||
    /\s/.test(secret)
  ) {
    return "unconfigured";
  }

  if (!authorization?.startsWith("Bearer ")) {
    return "missing";
  }

  const candidate = authorization.slice("Bearer ".length);
  if (!candidate) return "invalid";

  // Always compare equal-length digests. Never compare tokens via ===,
  // include them in URLs or write the provided token into logs.
  const expected = createHash("sha256").update(secret).digest();
  const supplied = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, supplied) ? "authorized" : "invalid";
}

export const requireClientApiToken: RequestHandler = (req, res, next): void => {
  const verdict = checkClientApiToken(
    req.header("authorization"),
    process.env.BOLETINES_CLIENT_API_TOKEN,
  );

  if (verdict === "authorized") {
    next();
    return;
  }

  if (verdict === "unconfigured") {
    res.status(503).json({ error: "Operator API is not configured" });
    return;
  }

  res.status(401).json({ error: "Authentication required" });
};
