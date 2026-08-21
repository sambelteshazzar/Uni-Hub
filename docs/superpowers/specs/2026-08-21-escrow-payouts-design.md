# Escrow & Seller Payouts — Design Spec

Date: 2026-08-21
Status: Phase 1 in progress (ledger + capture + balances)
Author: ox-alpha (AI) — requires human review before merge

## Problem

Uni-Hub is a marketplace, but money flows only one way: buyer → platform's
Paystack account. There is no record of what sellers are owed, no commission,
no payout mechanism. The admin dashboard also reports GMV as "revenue".

## Concepts

- **Escrow**: platform holds payment until delivery is confirmed, then
  releases to the seller minus commission.
- **Ledger**: append-only list of signed money movements per seller.
  Balances are computed from entries, never stored and mutated.
- **GMV vs revenue**: GMV = total order value flowing through; revenue =
  platform commission only.

## Money state machine

```
payment completed (Paystack verified)      [completePayment / webhook]
        │  ledger: sale entry, status='escrowed'
        ▼
   ESCROWED ──────────► refund/cancel ───► status='reversed' (pre-release)
        │                                   or clawback entry (post-release)
        ▼ order marked delivered          [updateOrderStatus]
   RELEASED → sale.status='released' + commission entry (negative)
        │
        ▼ seller requests payout          [Phase 3]
   PAYOUT QUEUE → admin approves → Paystack Transfer API → PAID
```

Cash-on-delivery orders never touch the platform: on delivery settlement the
ledger records `sale` + `commission` entries directly as released with note
`cash-on-delivery`, so seller stats stay true without pretending escrow.

## Schema

```sql
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL REFERENCES users(id),
  orderId TEXT REFERENCES orders(id),
  type TEXT NOT NULL CHECK(type IN ('sale','commission','payout','clawback','adjustment')),
  amount REAL NOT NULL,               -- signed, seller perspective
  currency TEXT DEFAULT 'GHS',
  status TEXT DEFAULT 'released' CHECK(status IN ('escrowed','released','reversed')),
  note TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  sellerId TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL CHECK(amount > 0),
  method TEXT NOT NULL CHECK(method IN ('momo','bank')),
  destination TEXT NOT NULL,
  paystackRecipientCode TEXT,
  paystackTransferRef TEXT UNIQUE,
  status TEXT DEFAULT 'requested' CHECK(status IN ('requested','approved','processing','paid','failed')),
  failureReason TEXT,
  requestedAt TEXT DEFAULT (datetime('now')),
  processedAt TEXT
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Sign convention (seller perspective): `sale` +gross · `commission` −take ·
`payout` −amount · `clawback` −gross · `adjustment` ±manual.

Balance definitions:
- **pending** = SUM(amount WHERE status='escrowed')
- **available** = SUM(amount WHERE status='released') across all types
- Payouts may never push available below zero.

Commission percent lives in `platform_settings.commission_percent`
(default 5). Each release snapshots the rate at that moment; historical
entries are never recomputed.

## API surface (Phase 1)

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/ledger/balance` | protect | `{ pending, available, lifetimeSales }` |
| admin dashboard stats | admin | adds `commissionEarned`, `escrowHeld` |

## Hooks into existing flows

1. `completePayment` (provider-verified branch, after marking completed):
   `ledger.recordEscrowedSale(order, items)`
2. `updateOrderStatus` delivered transition:
   `ledger.releaseOrderLedger(orderId)` — provider orders; cash orders get
   direct-released entries via `ledger.recordCashSale(order, items)`
3. `updateOrderStatus` refunded transition:
   `ledger.reverseOrderLedger(orderId)` — reverses escrowed entries; inserts
   clawback for already-released ones
4. Cancelled: same reversal path (payment was pending; entries usually absent)

All hooks are idempotent: guarded by order-status transitions and/or an
existence check for prior entries of the same order+type.

## Phases

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Ledger + capture + balances + admin stat | this spec |
| 2 | Auto-release N hours after delivery | planned |
| 3 | Payout requests + admin approval queue UI | planned |
| 4 | Automated Paystack transfers (`/transferrecipient`, `/transfer`) with retry queue | planned |

## Out of scope / follow-ups

- Partial refunds per item
- Multi-currency
- Seller-facing balance UI (endpoint exists; frontend wiring later)
- Dispute lifecycle beyond refund reversal
