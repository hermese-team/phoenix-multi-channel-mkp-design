# Product Domain — Materials & Documentation Index

Status: Draft (shared information / requirements gathering)
Owner: DEV-05 (Product Sync), DEV-03 (Shared contracts / canonical Product schema)

## 1. Purpose

This document is the entry point and central index for the Phoenix **product domain** documentation set (`docs/product/*`). It aggregates all product-related materials — spreadsheets, schemas, API references, and design notes — so that engineers, QA, and business stakeholders can find the single authoritative source for each topic.

## 2. Centralized materials

### 2.1 Product Master sheet

| Item | Link / location | Notes |
|------|-----------------|-------|
| Product Master (Google Sheets) | [Product Master](https://docs.google.com/spreadsheets/d/1QVV2GQ_kf-kb9VIthCArZyIGp8eRFa3U/edit?gid=616979786#gid=616979786) | Master data for the product catalog; source for RMS ingestion test fixtures and mapping. GID `616979786`. |

### 2.2 In-repo references

| Item | Location | Notes |
|------|----------|-------|
| Canonical Product schema | `docs/prd-phoenix-multi-channel-marketplace.md` §8.3 | Canonical product model (SKU, title, description, attributes, status, version) |
| Product requirements | `docs/prd-phoenix-multi-channel-marketplace.md` §6.1 (PROD-001..012) | NOV-1 functional requirements: ingestion, delta, mapping, desired-state, outbound, reconciliation |
| Product sync pipeline design | `docs/architecture01-pmc.md` §5.5 | RMS ingestion → cross-reference → diff commands → push-driven drift detection |
| RMS product master integration | `docs/proposal01-pmc-marketplace.md` | Replace full-table RMS dependency with snapshot ingestion, delta detection, versioning |
| Product sync stories (p1–p4) | `sprints/sprint-01-plan.md` … `sprints/sprint-05-plan.md` | DEV-05 backlog: ingestion (p1), cross-ref/mapping (p2), diff commands (p3a), reconciliation (p3b), listing pull (p4) |

## 3. Domain context

Phoenix treats the enterprise **RMS product master** as the authoritative product catalog and keeps seller-channel listings in sync without pushing blindly:

- **Source of truth:** the enterprise "RMS" system provides product snapshots or change feeds with source version, extraction time, checksum, and immutable payload reference (PROD-001).
- **Phoenix responsibilities:**
  - Consume RMS snapshots/changes, compare versions, and emit only meaningful deltas — insert / update / deactivate / unchanged (PROD-001, PROD-002, PROD-011).
  - Persist the product master in PostgreSQL (SKU, title, description, attributes, price reference, status, version).
  - Resolve enterprise PLU/SKU → channel, account, seller SKU, listing ID, mapping version (PROD-004).
  - Pull existing channel listings and cross-reference against the RMS master; classify match status per SKU–channel pair: `MATCHED`, `FIELD_DRIFTED`, `MISSING_ON_CHANNEL`, `MISSING_IN_RMS`, `DEACTIVATED_ON_CHANNEL` (p2).
  - Record desired-state entries with entity version, payload hash, priority, deadline, and reconciliation key; action intent `CREATE` / `UPDATE` / `DEACTIVATE` (PROD-008).
  - Generate diff-based outbound commands, suppress no-op updates (PROD-003), respect Auto/Manual field ownership (PROD-007), quarantine unmapped/ineligible updates with stable reason codes (PROD-006).
  - Reconcile desired vs sent vs acknowledged state with SKU/channel drill-down, plus a configurable full reconciliation schedule (initially daily) (PROD-010, PROD-012).
  - Detect ongoing drift from seller-platform push notifications without full re-pull cycles (p4).

Product events are published to `phoenix.product.v1`; product data is keyed by SKU (enterprise PLU).

## 4. Open questions / items to confirm

1. Product Master sheet ownership and update cadence — who maintains it and how often does it change?
2. Whether the Product Master sheet is the source for RMS sample payloads / test fixtures used by QA-02 and DEV-05.
3. SKU→store / SKU→channel assortment rules per channel (which SKUs apply to which sellers).
4. RMS change-feed availability vs snapshot-only polling (incremental vs full sync every cycle).
5. Rate, concurrency, and payload limits for RMS product APIs (see PRD §17.3 open decisions).

## 5. Related references

- `docs/prd-phoenix-multi-channel-marketplace.md` — §6.1 (PROD-001..012), §8.3 canonical product model, §14.5 test scenarios
- `docs/proposal01-pmc-marketplace.md` — RMS Product Master Sync design intent, Phase 3 catalog & product sync
- `docs/architecture01-pmc.md` — product service, RMS ingestion pipeline, channel listing pull, cross-reference engine
- `docs/phoenix-high-level-architecture.drawio` — RMS connector placement
- `sprints/sprint-01-plan.md` … `sprints/sprint-05-plan.md` — Product Sync stories (p1–p4) and delivery commitments