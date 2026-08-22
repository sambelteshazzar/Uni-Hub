// ============================================
// ROLES - RBAC tier matrix (documentation + single source of truth)
// ============================================
// Tiers: buyer < moderator < admin
//
// | Capability                       | moderator | admin |
// |----------------------------------|-----------|-------|
// | Admin dashboard / reads          |     Y     |   Y   |
// | Product approve/reject           |     Y     |   Y   |
// | Verification queue               |     Y     |   Y   |
// | Product create/edit/delete       |     N     |   Y   |
// | Ban/unban users                  |     N     |   Y   |
// | Refunds                          |     N     |   Y   |
// | Payout approvals (Phase 3)       |     N     |   Y   |
//
// Enforcement is per-route via authorize('admin', 'moderator') in
// routes/*.js. Registration always assigns 'buyer' (auth.controller);
// role changes are manual DB operations until a superadmin UI exists —
// deliberately so: whoever can grant roles must not be grantable via API.

const ROLES = {
  BUYER: 'buyer',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

const PRIVILEGED_ROLES = [ROLES.ADMIN, ROLES.MODERATOR];

module.exports = { ROLES, PRIVILEGED_ROLES };
