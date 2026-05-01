/**
 * Centralised application constants.
 * Import from here instead of scattering magic values across files.
 */

// ── JWT ───────────────────────────────────────────────────────────────────────
const JWT_EXPIRY = '1d';

// ── Field length limits (enforced in controller + schema) ────────────────────
const MAX_TITLE_LEN       = 120;
const MAX_SUBJECT_LEN     = 60;
const MAX_DESCRIPTION_LEN = 500;
const MAX_NAME_LEN        = 80;

// ── Pagination ────────────────────────────────────────────────────────────────
const PAGINATION_DEFAULT_LIMIT = 20;
const PAGINATION_MAX_LIMIT     = 50;

module.exports = {
  JWT_EXPIRY,
  MAX_TITLE_LEN,
  MAX_SUBJECT_LEN,
  MAX_DESCRIPTION_LEN,
  MAX_NAME_LEN,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
};
