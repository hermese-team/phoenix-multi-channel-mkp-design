# Plan: Improve Task Descriptions, Tighten Boundaries, and Break into Bullet-Point MD Estimates

## 1. Data Bugs to Fix (No Design Change Needed)

Before touching descriptions, fix these errors in `gantt-chart/app.js`:

| Bug | Location | Issue | Fix |
|---|---|---|---|
| c4 rationale | app.js:483 | Copied c5's certification-fixes text | Replace with Amaze/AxtraMall adapter scope (use Plan section 6.8) |
| c4 primaryOwner | app.js:479 | `"DEV-7"` (typo, missing zero) | Change to `"DEV-12"` (reassign from DEV-07 who is double-booked) |
| DEV-07 double-booked | Plan 6.8 / app.js | DEV-07 owns o1 (end Aug 21), o2 (end Aug 7), AND c4 (start Aug 10) — 11d overlap | Reassign c4 to DEV-12; adjust predecessor `c3` to be predecessor of `c4` |

---

## 2. Boundary Rules (Applied to All Descriptions)

### Rule A: One domain concern per section

If a task belongs to a different section, move it there rather than duplicating.

| Move | From | To | Reason |
|---|---|---|---|
| r3 (Quota-aware scheduler) | Section 6.5 Price | Section 6.3 Shared Integration Layer | General-purpose scheduler, not price-specific. Every domain (product, stock, orders) needs this. Rename to "Shared quota-aware scheduler and drain forecast." |
| s3 contract simulators | Section 6.3 Shared | Rename to clarify: "Channel API contract simulators" (not test fixtures, which belong to m4) | Distinguish from m4's "fixture creation" which is about canonical test data |
| f5 observability | Section 6.2 Foundation | Add suffix "(platform layer)" in name | Distinguish from a5 (sync telemetry) which consumes this data |

### Rule B: No two tasks describe the same pattern

Where product/price/stock reconciliation share identical patterns, note the shared infrastructure and reduce downstream estimates.

### Rule C: Every task must explicitly state what it produces and what it consumes

Format: "Takes [input from task X], produces [output consumed by task Y]."

---

## 3. Per-Section Task Improvements

### 3.1 Mobilization and Design (Section 6.1)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| m1 | Kickoff, scope lock, delivery governance | (keep) | Accurate |
| m2 | Architecture adoption and NFR confirmation | (keep) | Accurate |
| m3 | External dependency contract discovery | (keep) | Accurate |
| m4 | Normalize table schemas and API models | Canonical contract definition and fixture design | Old name undersells: covers error taxonomy, idempotency keys, fixture creation, compatibility rules |

#### m4 Bullet Breakdown

- Define canonical domain schemas and Avro/Protobuf compatibility rules for product, price, stock, order (4 md)
- Design error taxonomy, reason codes, and idempotency key strategy across all domains (3 md)
- Create canonical test fixtures: success, boundary, error, and replay scenarios per domain (3 md)
- **Total: 10 md**

#### m3 Bullet Breakdown

- Confirm RMS product contract: payload samples, versioning, replay behavior (3 md)
- Confirm R10/LDD price/promotion contract: effective dates, timezone, clubpack rules (3 md)
- Confirm Stock Service contract: movement identity, snapshots, replay, stale event behavior (3 md)
- Confirm WMS/MFC fulfilment contract: idempotent hand-off, quota, reason codes (3 md)
- Confirm DHL and Auto POS contracts: status events, eligibility rules (2 md)
- **Total: 14 md**

### 3.2 Foundation and DevOps (Section 6.2)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| f1 | Kubernetes, CI/CD, GitOps, environments | (keep) | Accurate |
| f2 | Kafka, schema registry, retry/DLQ topics | (keep) | Accurate (fix spacing in Gantt to match) |
| f3 | PostgreSQL schemas, partitions, ledgers | (keep) | Accurate |
| f4 | Redis quota + ATS foundation | Redis quota infrastructure and Lua primitives | Remove "ATS" from name — leave ATS logic to i2. f4 produces quota primitives and Lua building blocks, not the ATS calculation itself. |
| f5 | Observability, audit, dashboards, alerting | Observability platform (metrics, logs, traces, audit pipeline) | Add "(platform layer)" to signal this is the data producer for a5 |
| f6 | Load and stress test harness | (keep) | Accurate |

#### f1 Bullet Breakdown

- Service templates, namespace/env setup, secrets management (3 md)
- Container build, deployment manifests, GitOps pipeline (3 md)
- Progressive delivery, rollback hooks, resource limits, topology spread (3 md)
- Environment promotion across dev/staging/prod (2 md)
- **Total: 11 md**

#### f2 Bullet Breakdown

- Broker configuration, topic naming, partition strategy per domain (3 md)
- Schema registry setup with Avro/Protobuf contracts and compatibility checks (2 md)
- Retry topic topology (immediate/deferred/DLQ) and producer/consumer conventions (3 md)
- Operational dashboards for Kafka health, lag, partition balance (2 md)
- **Total: 10 md**

#### f3 Bullet Breakdown

- Domain schemas: order partitions, stock ledger, sync ledger, idempotency tables (3 md)
- Audit tables, indexes, and archive/retention strategy (2 md)
- Migration scripts, connection budgets, read/query constraints for ops screens (3 md)
- **Total: 8 md**

#### f4 Bullet Breakdown (Redis quota + Lua primitives only — ATS logic belongs to i2)

- Redis key design for distributed token buckets (2 md)
- Lua scripts for atomic quota consumption and refill; failover behavior testing (3 md)
- Test fixtures for rate-limit, token-bucket edge cases, and 429 backpressure (2 md)
- **Total: 7 md**

#### f5 Bullet Breakdown (Platform observability layer)

- Log/metric/trace pipeline setup (OpenTelemetry collectors, exporters) (3 md)
- Operational dashboards: queue age, platform wait, source delay, retry/DLQ counts (3 md)
- Alerting rules with SLO burn-rate alerts per domain; channel health monitoring (3 md)
- Audit trail infrastructure (immutable event stream for operator actions) (2 md)
- **Total: 11 md**

#### f6 Bullet Breakdown

- Synthetic order/price/stock event generators for load scenarios (3 md)
- Configurable channel API simulators for quota and failure injection (3 md)
- Measurement scripts and repeatable 250/500 ops/sec scenario definitions (2 md)
- **Total: 8 md**

### 3.3 Shared Integration Layer (Section 6.3)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| s1 | Adapter SDK auth retry rate limit telemetry | Adapter SDK: auth, retry, circuit breaker, quota, telemetry | Missing circuit breakers, request signing, result publishing in name |
| s2 | Capability registry and feature flags | (keep) | Accurate |
| s3 | Contract simulators and captured fixtures | Channel API contract simulators | Drop "fixtures" — they belong to m4. s3 builds fake API endpoints, m4 builds test data payloads. |

#### s1 Bullet Breakdown (Produces: shared SDK consumed by c1-c5)

- Auth hooks and request signing extension points for all channel adapters (3 md)
- Idempotency/request keys, retry taxonomy (immediate/deferred/permanent), 429 handling (3 md)
- Distributed quota integration with f4 token buckets; circuit breaker per endpoint (3 md)
- Metrics, traces, and result publishing via Kafka (1 md)
- **Total: 10 md**

#### s2 Bullet Breakdown

- Endpoint capability model: per-channel, per-operation field support matrix (3 md)
- Quota and batch-size configuration store (runtime-editable, feeds r3 scheduler) (2 md)
- Writer ownership model: per domain/channel/cohort with kill switches (3 md)
- Staged rollout by channel/account/SKU cohort; certification evidence tracking (2 md)
- **Total: 10 md**

#### s3 Bullet Breakdown (Channel API contract simulators, not fixtures)

- Shopee/Lazada API contract simulators (success, retry, rate-limit, failure responses) (3 md)
- TikTok/Amaze/AxtraMall API contract simulators (3 md)
- Out-of-order, duplicate, malformed payload scenario simulators (2 md)
- **Total: 8 md**

### 3.4 Product Sync (Section 6.4)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| p1 | RMS ingestion and product delta engine | (keep) | Accurate |
| p2 | Mapping, validation, desired-state ledger | (keep) | Accurate |
| p3 | Product outbound commands and reconciliation | Split into p3a and p3b | Two distinct concerns: command generation + reconciliation |

#### p1 Bullet Breakdown

- RMS snapshot/change ingestion: payload references, version comparison, replay (3 md)
- Deterministic insert/update/deactivate/unchanged decisions; stale source handling (2 md)
- Source delay measurement; integration with p2 desired-state ledger (1 md)
- **Total: 6 md**

#### p2 Bullet Breakdown

- SKU/PLU to channel listing ID resolution engine; validation of mapped eligibility (3 md)
- Handling inactive, unmapped, ambiguous items with stable reason codes (2 md)
- Desired-state persistence: version, payload hash, priority, reconciliation keys (3 md)
- **Total: 8 md**

#### p3a Bullet Breakdown (Product outbound command generation)

- Transform desired-state to channel-neutral commands; coalesce obsolete pending commands (2 md)
- Integration with adapter SDK (s1) for outbound dispatch; result classification (3 md)
- **Total: 5 md**

#### p3b Bullet Breakdown (Product reconciliation and drill-down)

- Desired-vs-sent-vs-acknowledged state comparison per SKU/channel (2 md)
- Read-back integration where available; operator drill-down views (1 md)
- **Total: 3 md**

### 3.5 Price and Promotion Sync (Section 6.5)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| r1 | R10 LDD ingestion and effective price engine | (keep) | Accurate |
| r2 | Auto Manual clubpack promotion rules | Promotion business rules, guardrails, and precedence | Name narrow; scope covers overrides, guardrails, expiry, quarantine |
| r3 | Quota-aware scheduler and drain forecast | **Move to Section 6.3** as: Shared quota-aware scheduler and drain forecast | General-purpose, not price-specific. Rename and relocate. |
| r4 | Price and promo reconciliation | (keep) | Accurate; reuse shared reconciliation infra from p3b |

#### r1 Bullet Breakdown

- R10/LDD ingestion: source versioning, effective dates, timezone handling, replay (3 md)
- Deterministic effective price calculation at business timestamp; promotion active/expiry (3 md)
- Product/store scope resolution; integration with desired-state comparison (2 md)
- **Total: 8 md**

#### r2 Bullet Breakdown

- Business rule fixtures: precedence, manual ownership, overrides, clubpack multiplication (3 md)
- Activation/expiry rules; quarantine for suspicious prices (guardrails) (2 md)
- **Total: 5 md**

#### r4 Bullet Breakdown (Price/promo reconciliation)

- Desired/sent/acknowledged state matching (reuse p3b shared reconciliation pattern) (2 md)
- Permanent vs retryable failure classification; operator evidence views (2 md)
- **Total: 4 md**

### 3.6 Order Sync and Fulfilment Routing (Section 6.6)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| o1 | Order webhook and poll ingestion archival | Split into o1a and o1b | Inbound order ingestion (shared infrastructure) vs channel-specific signing/polling mechanics |
| o2 | Canonical normalization, idempotency, persistence | (keep, tighten description) | Remove channel-specific signing (belongs to adapters) |
| o3 | Fulfilment routing | (keep) | Accurate |
| o4 | Cancellation status minimum flow | (keep) | Accurate |

**Key boundary fix:** Move channel-specific signed webhook verification and polling cursor management from o1 to c1-c4 adapters. o1 handles only the shared infrastructure: raw payload archival, Kafka quorum topic, worker pool isolation.

#### o1a Bullet Breakdown (Shared order ingestion infrastructure — raw payload archival and Kafka)

- Raw order payload archival to object storage with payload reference generation (2 md)
- Kafka quorum acknowledge topic for accepted orders (separate from domain topics) (2 md)
- Separate inbound/polling/outbound worker pool isolation pattern (shared for all adapters) (1 md)
- **Total: 5 md**

#### o1b Bullet Breakdown (Polling cursor management and leases — shared library)

- Distributed polling lease framework: overlap-safe cursors, lease expiry, cursor persistence (2 md)
- Reusable polling state machine: incremental, full-sync, catch-up modes (1 md)
- **Total: 3 md**

#### o2 Bullet Breakdown

- Channel-to-canonical order model mapping (header, line, address, payment, references, timestamps) (2 md)
- Partition-aware persistence using f3 PostgreSQL partitions; duplicate suppression (2 md)
- Out-of-order event handling; cancellation state legality (1 md)
- **Total: 5 md**

#### o3 Bullet Breakdown

- Route accepted orders to WMS/MFC via idempotent hand-off contract (2 md)
- Retry behavior, timeout handling, stable rejection reason codes, correlation IDs (3 md)
- Separate Phoenix acceptance time from external fulfilment time (1 md)
- **Total: 6 md**

#### o4 Bullet Breakdown

- Cancellation handling: before fulfilment acceptance (where supported) + minimum external status mapping (2 md)
- State transition legality (prevent invalid backward transitions); stuck hand-off reconciliation (2 md)
- **Total: 4 md**

### 3.7 Stock Sync (Section 6.7)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| i1 | Stock Service stock ingestion and stock ledger | (keep) | Accurate |
| i2 | ATS calculation and safety-stock baseline | ATS calculation, reserves, and safety-stock | Missing: damage/pending/unpaid/flash reserve handling, failure recovery |
| i3 | Stock sync orchestration and coalescing | (keep) | Accurate |
| i4 | Stock reconciliation | (keep) | Reduced estimate: reuses p3b/r4 shared reconciliation pattern |

#### i1 Bullet Breakdown

- Stock Service ingestion: consume movement/snapshot events, unique movement identity (3 md)
- Stale version rejection; ordering by store/SKU for correct ATS calculation (1 md)
- Durable PostgreSQL stock ledger with reconciliation snapshot support (2 md)
- **Total: 6 md**

#### i2 Bullet Breakdown

- Atomic movement application using f4 Lua primitives; maintain available-to-sell state (3 md)
- Damage, pending, unpaid, flash reserve handling with idempotency and replay (2 md)
- Safety-stock configuration and enforcement; failure recovery testing (2 md)
- **Total: 7 md**

#### i3 Bullet Breakdown

- Convert ATS changes to channel-specific desired stock commands (2 md)
- Coalesce pending stock updates to latest version; prioritize campaign SKUs (2 md)
- Respect quotas via r3 scheduler; avoid stale outbound writes (2 md)
- **Total: 6 md**

#### i4 Bullet Breakdown

- Compare Phoenix desired stock with seller acknowledgement/read-back (reuse p3b/r4 pattern) (2 md)
- Drift surfacing and replay/repair path evidence (1 md)
- **Total: 3 md**

### 3.8 Channel Adapters (Section 6.8)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| c1 | Shopee E2E adapter | (keep) | Accurate |
| c2 | Lazada E2E adapter | (keep) | Accurate |
| c3 | TikTok E2E adapter | (keep) | Accurate |
| c4 | Amaze/AxtraMall E2E adapter | (keep) | Owner changed to DEV-12 |
| c5 | Channel certification fixes | Split into c5a-d | Each channel has unique certification issues |

**Key boundary fix:**
- Each adapter owns channel-specific signed webhook verification (moved from o1) and channel-specific auth/signing (shared SDK provides the framework).
- Each adapter's description must explicitly state: "Consumes [s1 SDK, s3 simulators]; Produces [raw orders to Kafka, outbound sync results]."

#### c1 Bullet Breakdown (Shopee E2E adapter)

- Shopee auth, signing, channel-specific webhook verification; polling cursor management (2 md)
- Inbound order path: raw order to Kafka via o1a shared infrastructure (2 md)
- Outbound sync: product, price, stock, status transformation using s1 SDK and s2 capability registry (3 md)
- Sandbox certification, error mapping, production configuration (2 md)
- **Total: 9 md** (across DEV-11 and DEV-12 parallel track, ~4-5 md per developer)

#### c2 Bullet Breakdown (Lazada E2E adapter)

- Lazada auth, signing, channel-specific webhook verification; polling cursor management (2 md)
- Inbound order path: raw order to Kafka via o1a shared infrastructure (2 md)
- Outbound sync: product, price, stock, status transformation using s1 SDK and s2 capability registry (3 md)
- Sandbox certification, error mapping, production configuration (2 md)
- **Total: 9 md** (parallel track with c1, separate owner)

#### c3 Bullet Breakdown (TikTok E2E adapter)

- TikTok auth, signing, channel-specific webhook/polling mechanics (2 md)
- Inbound order path: raw order to Kafka (2 md)
- Outbound sync: product, price, stock, status transformation (3 md)
- Sandbox certification, error mapping, production configuration (2 md)
- **Total: 9 md** (starts 1 week after c1/c2, reuses SDK patterns)

#### c4 Bullet Breakdown (Amaze/AxtraMall E2E adapter)

- Amaze/AxtraMall auth, signing, channel-specific webhook/polling mechanics (2 md)
- Inbound order path: raw order to Kafka (2 md)
- Outbound sync: product, price, stock, status transformation (2 md)
- Sandbox certification, error mapping, production configuration (2 md)
- **Total: 8 md** (reuses patterns from c1-c3, starts latest)

#### c5a-d Bullet Breakdown (Per-channel certification fix buffers)

| Sub-task | Est. MD | Owner |
|---|---|---|
| c5a | Shopee certification fixes: schema mismatches, batch-size issues, auth changes | 2 md | DEV-11 |
| c5b | Lazada certification fixes | 2 md | DEV-11 |
| c5c | TikTok certification fixes | 2 md | DEV-12 |
| c5d | Amaze/AxtraMall certification fixes | 1 md | DEV-12 |
| **Total** | **7 md** | |

### 3.9 Admin Portal (Section 6.9)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| a1 | Admin UX flows and permissions | (keep) | Accurate |
| a2 | Order monitoring portal | (keep) | Accurate |
| a3 | Manual SKU warehouse mapping upload | (keep) | Accurate |
| a4 | Product sync manual auto configuration | (keep) | Accurate |
| a5 | Sync telemetry and retry controls | Sync telemetry, retry controls, and governance | Missing: permission checks, rate-limit protection, immutable audit |
| a6 | Admin portal UAT hardening | Admin Portal UX polish, accessibility, and UAT hardening | Missing: error states, accessibility |

**Key boundary fix:** a5 consumes f5 platform observability data. a5 does NOT build its own telemetry pipeline — it builds Admin Portal views on top of f5's metrics/traces/logs. Explicit contract: a5 depends on f5 metric/trace exports being available.

#### a1 Bullet Breakdown

- Operator role definition, screen flow design, navigation hierarchy (3 md)
- Permission boundaries: view-only vs executable actions; audit requirements (2 md)
- Retry authorization rules: who can retry what, two-person approval model (2 md)
- **Total: 7 md**

#### a2 Bullet Breakdown

- Searchable order views: filters by channel/account/order/SKU/status; lifecycle timeline (3 md)
- Fulfilment hand-off status, error/exceptions, raw evidence links (2 md)
- Backend read APIs with query constraints (do not overload transactional tables) (2 md)
- **Total: 7 md**

#### a3 Bullet Breakdown

- Upload template and CSV parser with validation; preview of parsed data (3 md)
- Duplicate detection, SKU and warehouse reference checks (2 md)
- Approval/activation workflow, versioning, audit trail, rollback capability (3 md)
- Routing-service lookup integration with WMS/MFC (1 md)
- **Total: 9 md**

#### a4 Bullet Breakdown

- UI for manual/auto product master sync configuration per channel/account/SKU cohort (3 md)
- Effective dating, validation, audit, conflict prevention with writer ownership (3 md)
- Backend APIs for configuration persistence and rollback (2 md)
- **Total: 8 md**

#### a5 Bullet Breakdown (Consumes f5 platform observability data)

- Sync telemetry views: product/price/stock/order queue age, retry/DLQ state, failure classification (3 md)
- Manual retry preview: scope, idempotency impact, rate-limit protection, permission check (3 md)
- Immutable audit for all retry actions; scoped retry execution controls (2 md)
- **Total: 8 md**

#### a6 Bullet Breakdown

- Operator workflow polish based on UAT feedback; empty/error/loading states (3 md)
- Permission defect fixes; import edge cases; retry confirmation wording (2 md)
- Accessibility basics; UAT evidence capture for sign-off (1 md)
- **Total: 6 md**

### 3.10 Testing and Release (Section 6.10)

| # | Current Name | New Name | Reason |
|---|---|---|---|
| t1 | SIT integrated functional and regression | (keep) | Accurate |
| t2 | Load and stress testing | (keep) | Accurate |
| t3 | Resilience failover replay DLQ testing | (keep) | Accurate |
| t4 | UAT and business sign-off | (keep) | Accurate |
| t5 | Parallel run and reconciliation | (keep) | Accurate |
| t6 | Security, cutover, rollback rehearsal | Production readiness, cutover, and rollback rehearsal | Name narrow; scope covers PII, access control, writer transfer, runbooks, on-call |

#### t1 Bullet Breakdown

- Phase 1 SIT: completed domain flows integrated and tested together (5 md)
- Phase 2 SIT: full regression after all features complete; defect fix and retest cycles (4 md)
- **Total: 9 md** (spans 6 calendar weeks)

#### t2 Bullet Breakdown

- 250 orders/sec baseline: execute, measure, tune (3 md)
- 500 orders/sec headroom: burst test with price/promo and stock bursts (3 md)
- Retry storm and backlog drain scenarios (2 md)
- **Total: 8 md**

#### t3 Bullet Breakdown

- Failure scenarios: pod, broker, Redis, PostgreSQL, external API outage (3 md)
- Replay correctness and duplicate suppression; no-loss acceptance evidence (3 md)
- **Total: 6 md**

#### t4 Bullet Breakdown

- Business UAT: mappings, campaign rules, price behavior, order handling, stock outcomes (4 md)
- Operations user validation: Admin Portal workflows, exception handling (2 md)
- UAT evidence and sign-off (2 md)
- **Total: 8 md**

#### t5 Bullet Breakdown

- Compare Phoenix vs legacy/shadow outputs per domain (3 md)
- Reconciliation reports and drift analysis; writer transfer readiness confirmation (2 md)
- **Total: 5 md**

#### t6 Bullet Breakdown

- Production readiness: secrets, PII, access control, deployment approvals, runbooks (3 md)
- Cutover and rollback rehearsal: kill switches, writer transfer, on-call handover (3 md)
- **Total: 6 md**

---

## 4. Effort Summary

### 4.1 Developer Mandays by Section

| Section | Task IDs | Dev MD (bullets) | Notes |
|---|---|---|---|
| 6.1 Mobilization & Design | m3, m4 | 24 | m1-m2 are TL/QA scope, not counted |
| 6.2 Foundation & DevOps | f1-f6 | 55 | |
| 6.3 Shared Integration Layer | s1-s3, r3(moved) | 28 | Includes moved r3 |
| 6.4 Product Sync | p1-p3a/p3b | 22 | |
| 6.5 Price & Promotion Sync | r1, r2, r4 | 17 | r3 moved to 6.3 |
| 6.6 Order Sync & Fulfilment | o1a/o1b, o2-o4 | 23 | |
| 6.7 Stock Sync | i1-i4 | 22 | |
| 6.8 Channel Adapters | c1-c5a-d | 42 | |
| 6.9 Admin Portal | a1-a6 | 45 | |
| 6.10 Testing & Release | t1-t6 | 42 | |
| **Total** | | **320** | Fits within 560-602 MD dev capacity; remaining capacity covers QA support, spikes, rework |

### 4.2 Capacity Check

- Total effective dev capacity (14 devs × 41 MD avg): ~574 MD
- Sum of bullet estimates: ~320 MD
- Remaining contingency: ~254 MD (covers QA support, defect fixing during SIT, integration surprises)

---

## 5. Gantt Chart (`gantt-chart/app.js`) Updates Required

### 5.1 Critical Bug Fixes

| What | File:Line | Current | Fix |
|---|---|---|---|
| c4 rationale | app.js:483 | Copied c5 text | Replace with: "Amaze/AxtraMall E2E adapter: inbound orders, outbound product/price/promo/stock, auth, signing, payload transformation, quota behavior, sandbox validation, certification evidence, and production config. Reuses SDK patterns from c1-c3." |
| c4 primaryOwner typo | app.js:479 | `"DEV-7"` | Change to `"DEV-12"` and add `"DEV-07"` as supporting owner |
| c4 predecessors | app.js:482 | `["m3"]` | Add `["c3"]` to reflect dependency on TikTok patterns |

### 5.2 Task Name Updates

| Task ID | Current name in app.js | New name |
|---|---|---|
| m4 | Normalize table schemas and API models (Data transformation) | Canonical contract definition and fixture design |
| f4 | Redis quota + ATS foundation | Redis quota infrastructure and Lua primitives |
| f5 | Observability, audit, dashboards, alerting | Observability platform (metrics, logs, traces, audit pipeline) |
| s1 | Adapter SDK auth retry rate limit telemetry | Adapter SDK: auth, retry, circuit breaker, quota, telemetry |
| s3 | Contract simulators and captured fixtures | Channel API contract simulators |
| r2 | Auto Manual clubpack promotion rules | Promotion business rules, guardrails, and precedence |
| r3 | Quota-aware scheduler and drain forecast | **Move to section "Shared Integration Layer"** as: Shared quota-aware scheduler and drain forecast |
| a5 | Sync telemetry and retry controls | Sync telemetry, retry controls, and governance |
| a6 | Admin portal UAT hardening | Admin Portal UX polish, accessibility, and UAT hardening |
| t6 | Security, cutover, rollback rehearsal | Production readiness, cutover, and rollback rehearsal |

### 5.3 Task Splits (add new tasks, adjust predecessors)

| New task ID | Name | Owner | Estimated duration | Predecessors | Section |
|---|---|---|---|---|---|
| p3a | Product outbound command generation | DEV-05 | 2026-08-04 to 2026-08-21 | s1, c1, c2 | Product Sync |
| p3b | Product reconciliation and drill-down | DEV-05 | 2026-08-22 to 2026-09-05 | p3a | Product Sync |
| o1a | Order ingestion: raw archival and Kafka (shared) | DEV-07 | 2026-07-13 to 2026-08-07 | m4, f2 | Order Sync |
| o1b | Polling cursor management and leases (shared lib) | DEV-07 | 2026-08-08 to 2026-08-21 | o1a | Order Sync |
| c5a | Shopee certification fixes | DEV-11 | 2026-09-01 to 2026-09-08 | c1 | Channel Adapters |
| c5b | Lazada certification fixes | DEV-11 | 2026-09-01 to 2026-09-08 | c2 | Channel Adapters |
| c5c | TikTok certification fixes | DEV-12 | 2026-09-01 to 2026-09-11 | c3 | Channel Adapters |
| c5d | Amaze/AxtraMall certification fixes | DEV-12 | 2026-09-11 to 2026-09-18 | c4 | Channel Adapters |

### 5.4 Moved Task

| Task ID | Old section | New section | Update in app.js |
|---|---|---|---|
| r3 | "Price and Promotion Sync" | "Shared Integration Layer" | Change `section` field. Adjust predecessors: keep f4, m3; add s2. |

### 5.5 Owner Changes

| Task ID | Current primary owner | New primary owner | Reason |
|---|---|---|---|
| c4 | DEV-7 (typo) | DEV-12 | DEV-07 double-booked with o1/o2; DEV-12 owns TikTok and can extend to Amaze |
| c2 (consider) | DEV-11 | Keep DEV-11 but add DEV-04 or junior as supporting co-owner | One person owning two full adapters is high risk |

### 5.6 Schedule Adjustments for Boundary Fixes

| Task ID | Current dates | Proposed dates | Reason |
|---|---|---|---|
| p3 | 2026-08-04 to 2026-09-05 | p3a: 2026-08-04 to 2026-08-21; p3b: 2026-08-22 to 2026-09-05 | Split into command generation + reconciliation |
| o1 | 2026-07-13 to 2026-08-21 | o1a: 2026-07-13 to 2026-08-07; o1b: 2026-08-08 to 2026-08-21 | Split shared infra from polling library |
| c4 | 2026-08-10 to 2026-09-18 | Same (keep) but owner changed | No date change needed |
| c5 | 2026-09-01 to 2026-09-18 | Split: c5a/c5b 2026-09-01 to 2026-09-08; c5c 2026-09-01 to 2026-09-11; c5d 2026-09-11 to 2026-09-18 | Per-channel certification buffers |

### 5.7 r3 Relocation: Section and Predecessor Changes in app.js

```javascript
// Move r3 from "Price and Promotion Sync" to "Shared Integration Layer"
// Change section from: "Price and Promotion Sync" to: "Shared Integration Layer"
// Change predecessors from: ["f4", "m3"] to: ["f4", "m3", "s2"]
// Change supportingOwners: add DEV-10 (stock needs this too), keep DEV-06 as primary
```

---

## 6. Plan Nov 1 PMC.md Structural Changes

### 6.1 Section 6.5 — Remove r3, reference relocated task

Replace the r3 row in Section 6.5 table with:

> | Task | Current planned duration | Why it takes this long | Main dependencies |
> |---|---|---|---|
> | r3 | See Section 6.3 — "Shared quota-aware scheduler and drain forecast" | Relocated to Shared Integration Layer because all domains (price, product, stock, orders) share this scheduling infrastructure | Redis quota foundation (f4), capability registry (s2) |

### 6.2 Section 6.3 — Add r3's relocated entry

Add after s3's row:

> | Shared quota-aware scheduler and drain forecast | 2026-07-27 to 2026-09-11 | DEV-06 | DEV-04, DEV-09, DEV-10, DEV-01 | QA-05 | General-purpose scheduler: per-channel/account/endpoint quota budgets (80/20), dynamic batch sizing, retry budget, campaign drain estimation, 429/retry storm safety. Moved here from Price section because all domains use it. | Redis quota foundation (f4), capability registry (s2) |

### 6.3 Section 6.8 — Fix owner assignment

Change Amaze/AxtraMall E2E adapter owner from DEV-07 to DEV-12 in both the task table and the Gantt section.

### 6.4 Section 6.2 — Clarify f5 vs a5 boundary

Add note to f5 description:

> **Boundary:** f5 produces the platform observability pipeline (metrics, traces, logs, audit). The Admin Portal sync telemetry views (a5) consume this pipeline — they do not build a separate telemetry infrastructure.

---

## 7. Execution Order

1. Fix critical bugs in `gantt-chart/app.js` (c4 rationale, c4 owner typo, DEV-07 double-book)
2. Apply task name changes across both `Plan Nov 1 PMC.md` and `gantt-chart/app.js`
3. Split p3, o1, c5 into sub-tasks; add new entries to both files
4. Move r3 to Shared Integration Layer section in both files
5. Rewrite all task descriptions as bullet points with MD estimates in `Plan Nov 1 PMC.md`
6. Add boundary clarifications and dependency notes
7. Verify total MD aligns with capacity (574 effective dev MD)
8. Run `grep` to ensure no old task names remain in either file
