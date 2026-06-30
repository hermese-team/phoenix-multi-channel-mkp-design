# Sprint 03 Plan — Full Parallel Build

**Sprint:** 2026-07-27 to 2026-08-07 (10 working days)  
**Team:** 12 Developers + 5 QA + TL  
**Theme:** Full parallel build — product mapping, order normalization, stock ledger, Shopee/Lazada adapters, order monitoring portal, SKU mapping upload, quota scheduler, ATS calculation

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | Cross-domain sequencing, adapter certification readiness, architecture reviews |
| DEV-01 | DevOps/Platform | Continue f1 (prod-ready K8s), continue f5 (observability dashboards) |
| DEV-02 | Backend Foundation | f2/f3 completion, support all domain services with infrastructure |
| DEV-03 | Contracts & Schema | Support adapter contract mocks, schema registry operations |
| DEV-04 | Adapter SDK | s1/s2 completion (telemetry, Kafka result publishing), a5 design |
| DEV-05 | Product Sync | p1 completion, p2 (mapping, validation, desired-state ledger) |
| DEV-06 | Price & Promotion | r1 completion, r3 (quota-aware scheduler), r4 design |
| DEV-07 | Order Sync | o1a completion, o2 (canonical normalization, idempotency) |
| DEV-08 | Fulfilment Routing | o3 (fulfilment routing engine), a3 design (SKU warehouse mapping) |
| DEV-09 | Stock Sync + Redis | i1 (stock ledger), f4 completion, i2 (ATS calculation) |
| DEV-10 | Stock Orchestration | i2 (ATS), i3 design (stock orchestration) |
| DEV-11 | Shopee/Lazada | c1 (Shopee auth + inbound), c2 (Lazada auth + inbound) |
| DEV-12 | TikTok/Channel | Support s3 simulators, c3 preparation |
| QA-01 | QA Lead | Progressive SIT planning, cross-domain integration scenarios |
| QA-02 | Contract QA | s3 channel API simulators (Shopee/Lazada), adapter contract tests |
| QA-03 | Domain QA | p2 mapping tests, r1/r2 regression, i1 stock ingestion tests |
| QA-04 | Integration QA | o1a/o2 order pipeline tests, c1/c2 inbound adapter tests |
| QA-05 | Performance SDET | f6 (load/stress harness), f4 Redis benchmark tests |
| QA-06 | Admin Portal QA | a1 permission tests, a2 order portal planning |

---

## Story 3.1: Product Mapping Engine — SKU Resolution

**Gantt Code:** p2  
**Narrative:** As the **Product Sync Engineer**, I want to build the SKU/PLU to channel listing ID resolution engine with eligibility validation, so that each product is correctly associated with its channel listings before generating outbound commands.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a product "SKU-001" with Shopee listing_id="SP12345", when the mapping engine processes it, then it should resolve the listing and produce `action=UPDATE`.  
**Scenario 2:** Given a product "SKU-002" with no Shopee listing_id, when processed, then it should skip with `UNMAPPED_SKU` and log to the governance topic.  
**Scenario 3:** Given an inactive product "SKU-003" with an existing listing, when processed, then the desired-state should indicate `action=DEACTIVATE`.

---

## Story 3.2: Desired-State Ledger Persistence

**Gantt Code:** p2  
**Narrative:** As the **Product Sync Engineer**, I want to implement the desired-state ledger with versioning, payload hash, priority, and reconciliation keys, so that Phoenix tracks the intended state of each product per channel with safe concurrency.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a mapped product with deserialized canonical data, when the desired-state is persisted, then it should store version, payload_hash, priority, and reconciliation_key.  
**Scenario 2:** Given an existing desired-state with version=3, when an update with version=2 arrives, then it should be rejected with `STALE_DESIRED_STATE`.  
**Scenario 3:** Given a desired-state is updated, when the old record has a different payload hash, then the hash should be recalculated and the change tracked.

---

## Story 3.3: Canonical Order Normalization

**Gantt Code:** o2  
**Narrative:** As the **Order Sync Engineer**, I want to build the canonical normalization engine that maps channel-specific order payloads to the canonical protobuf Order model with idempotency and partition-aware persistence, so that downstream processing operates on a uniform representation.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a Shopee order JSON with 3 line items, customer details, and payment, when normalized, then the canonical Order should have all 3 line items with correct SKU, quantity, price, and status.  
**Scenario 2:** Given an order with `channel_order_id="S12345"` already normalized, when the same payload arrives again, then it should return the existing canonical order_id and no duplicate should persist.  
**Scenario 3:** Given the current date is 2026-07-30, when a normalized order is persisted, then it should be written to the `orders_y2026m07` partition.

---

## Story 3.4: Order Out-of-Order Event Handling

**Gantt Code:** o2  
**Narrative:** As the **Order Sync Engineer**, I want to implement out-of-order event handling and cancellation state legality checks, so that late-arriving events do not corrupt the order state machine.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given an order update with timestamp T2 already processed, when an earlier event with timestamp T1 (T1 < T2) arrives, then it should be accepted only if it does not conflict with T2's state, or rejected with `OUT_OF_ORDER_EVENT`.  
**Scenario 2:** Given an order in `cancelled` state, when a `shipped` event arrives, then it should be rejected with `INVALID_STATE_TRANSITION`.

---

## Story 3.5: Stock Ingestion & Ordered Ledger

**Gantt Code:** i1  
**Narrative:** As the **Stock Sync Engineer**, I want to implement the Stock Service ingestion engine that consumes movement events and appends them to a durable PostgreSQL ledger with sequence ordering and stale version rejection, so that ATS has a trustworthy event source.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a movement `{movement_id:"M001", store:"S001", sku:"TENT-01", delta:-5}`, when processed, then the ledger should show sequence=1 for S001:TENT-01 with delta=-5.  
**Scenario 2:** Given a stock snapshot `{store:"S001", sku:"TENT-01", quantity:100, version:1}`, when processed, then the ledger should record a snapshot entry with balance=100.  
**Scenario 3:** Given movement_id="M001" already ingested, when it arrives again, then it should be rejected with `DUPLICATE_MOVEMENT`.

---

## Story 3.6: ATS Calculation with Redis Lua

**Gantt Code:** i2  
**Narrative:** As the **Stock Sync Engineer**, I want to build the ATS calculation engine that applies stock movements atomically via Redis Lua primitives, so that available-to-sell quantities are always correct.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given Redis ATS for S001:TENT-01 is 100, when a movement with delta=-5 is applied via Lua, then ATS should decrease to 95 atomically.  
**Scenario 2:** Given 10 concurrent stock movements for the same store+SKU, when all are applied via Lua, then the final ATS should equal the starting ATS + sum of deltas.  
**Scenario 3:** Given a movement that was already applied (idempotency), when replayed, then the Lua script should return the existing state without double-applying.

---

## Story 3.7: ATS Reserves & Safety-Stock Enforcement

**Gantt Code:** i2  
**Narrative:** As the **Stock Sync Engineer**, I want to implement reserve tracking (pending, damage, unpaid, flash) and safety-stock enforcement in the ATS engine, so that overselling is prevented and reserve types are visible separately.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given safety_stock=10 and current ATS=12, when an order reserves 5 units, then only 2 should succeed (ATS drops to safety_stock floor) and 3 rejected with `SAFETY_STOCK_FLOOR`.  
**Scenario 2:** Given pending=5, damage=2, flash=3 reserves on S001:TENT-01, when ATS breakdown is queried, then effective ATS = physical_ats - pending - damage - flash.

---

## Story 3.8: Quota-Aware Scheduler Engine

**Gantt Code:** r3  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to build the quota-aware scheduler that allocates per-channel rate-limit budgets with 80/20 normal-vs-urgent splitting, so that all domains share a single scheduling infrastructure.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given 80 normal-priority and 30 urgent-priority commands for Shopee (100/min quota), when scheduled, then all 30 urgent should dispatch first and 70 normal should dispatch (100 total).  
**Scenario 2:** Given a channel has zero quota remaining, when commands arrive, then they should be queued without error and dispatched when quota is restored.

---

## Story 3.9: Scheduler Drain Forecast & Retry Budget

**Gantt Code:** r3  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to implement campaign drain estimation and a separate retry budget that does not consume the normal allocation, so that campaigns can predict completion time and retries do not block regular sync.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a campaign needs to update 500 SKUs on Shopee with quota=100/min, when `EstimateDrainTime(500, 100)` is called, then the estimate should be 5 minutes with a deadline-risk flag if applicable.  
**Scenario 2:** Given a transient failure triggers a retry, when the retry is scheduled, then it should use the retry budget (separate from the 80/20 normal-urgent budget).

---

## Story 3.10: Channel API Simulators — Shopee & Lazada

**Gantt Code:** s3  
**Narrative:** As the **QA Engineer**, I want to create Shopee and Lazada API contract simulators that return configurable responses for success, retryable, rate-limit, and error cases, so that adapter development proceeds without sandbox credentials.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a GET to Shopee simulator `/api/v1/product/get_list`, when configured to return success with fixture data, then it should return the payload with HTTP 200, and when configured for rate-limit, return HTTP 429.  
**Scenario 2:** Given a POST to the Lazada simulator with invalid payload, when validation fails, then it should return HTTP 400 with error_code and message.

---

## Story 3.11: Channel API Simulators — Edge Cases & Duplicates

**Gantt Code:** s3  
**Narrative:** As the **QA Engineer**, I want to extend simulators with out-of-order, duplicate, and malformed payload scenarios for all four channels, so that adapters are tested against realistic failure modes.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a simulator configured to return out-of-order responses, when the adapter sends sequential requests, then responses should arrive in a scrambled order to test the adapter's ordering logic.  
**Scenario 2:** Given a simulator configured to return a duplicate webhook notification, when the adapter processes it, then the idempotency guard should suppress the duplicate.

---

## Story 3.12: Shopee Adapter — Auth & Webhook Verification

**Gantt Code:** c1  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement Shopee HMAC authentication, webhook signature verification, and inbound order forwarding through o1a, so that Shopee orders enter the Phoenix pipeline securely.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a Shopee webhook payload with valid HMAC header, when received, then the signature should be validated and the payload forwarded to o1a.  
**Scenario 2:** Given a Shopee webhook with invalid HMAC header, when received, then it should return HTTP 401 and no payload should be forwarded.

---

## Story 3.13: Shopee Adapter — Inbound Order Path

**Gantt Code:** c1  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to complete the Shopee inbound order path from webhook through o1a raw archival through o2 canonical normalization, so that Shopee orders flow end-to-end.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a valid Shopee order notification, when it passes through c1 → o1a → o2, then the raw payload should be archived in MinIO and the canonical order persisted.  
**Scenario 2:** Given the adapter is integrated with s1 SDK, when the order is ingested, then an adapter result event should be published to `phoenix.sync.result.v1`.

---

## Story 3.14: Lazada Adapter — OAuth & Polling

**Gantt Code:** c2  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement Lazada OAuth token management and polling-based order retrieval with the o1b polling cursor framework, so that Lazada orders enter the Phoenix pipeline.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a Lazada access token that has expired, when the adapter makes an API call, then the s1 SDK should refresh the token via refresh token and retry the request with the new token.  
**Scenario 2:** Given the polling cursor is at "cursor_50", when the adapter polls and finds 2 new orders with cursor "cursor_52", then each order should be ingested via o1a and the cursor should advance to "cursor_52".

---

## Story 3.15: Lazada Adapter — Webhook & Inbound Order Path

**Gantt Code:** c2  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement Lazada webhook handling and complete the inbound order path through o1a and o2, so that Lazada orders flow end-to-end.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a valid Lazada webhook, when received, then the payload should be verified, archived via o1a, and normalized via o2.  
**Scenario 2:** Given a polling cycle returns 0 new orders, when the cycle completes, then the cursor should remain unchanged and no events should be published.

---

## Story 3.16: Fulfilment Routing — Idempotent WMS Hand-Off

**Gantt Code:** o3  
**Narrative:** As the **Fulfilment Routing Engineer**, I want to start building the fulfilment routing engine with idempotent HTTP POST hand-off to WMS/MFC and retry with exponential backoff, so that accepted orders reach the correct warehouse safely.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a canonical order with valid SKU→warehouse mappings, when routed, then it should POST to the WMS endpoint with an idempotency key and record the correlation_id.  
**Scenario 2:** Given the WMS endpoint does not respond within 5s, when the engine attempts hand-off, then it should retry with backoff (1s, 2s, 4s, max 3) and escalate to DLQ if all exhausted.

---

## Story 3.17: Admin Portal — Order Search API

**Gantt Code:** a2  
**Narrative:** As the **Order Sync Engineer** (supporting Admin Portal), I want to create the order search BFF API with filterable, paginated queries against read-model views, so that the order monitoring portal can display orders without loading transactional tables.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a BFF API endpoint `GET /api/orders?channel=Shopee&status=pending`, when called with valid filters, then it should return paginated results with order_id, channel_order_id, status, and created_at using read-model views.  
**Scenario 2:** Given an order_id is queried for detail, when the endpoint returns, then it should include a timeline of lifecycle events with timestamps and evidence links.

---

## Story 3.18: SKU Warehouse Mapping Upload — Validation & Preview

**Gantt Code:** a3  
**Narrative:** As the **Fulfilment Routing Engineer** (supporting Admin Portal), I want to create the SKU→warehouse mapping upload UI with CSV parsing, row-level validation, and preview, so that operators can manage fulfilment routing rules safely.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a CSV file with SKU and warehouse_code columns, when uploaded, then invalid rows (unknown SKU, missing warehouse) should be highlighted and the operator should preview the parsed data before confirming.  
**Scenario 2:** Given a CSV with duplicate rows, when the parser validates, then duplicates should be flagged and the operator should resolve them before proceeding.

---

## Story 3.19: SKU Warehouse Mapping — Approval, Versioning & Rollback

**Gantt Code:** a3  
**Narrative:** As the **Fulfilment Routing Engineer** (supporting Admin Portal), I want to implement the approval/activation workflow with versioning, audit trail, and rollback capability, so that mapping changes are governed and reversible.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given the operator confirmed a mapping upload, when the approval is submitted, then the mappings should be stored with a version number and the previous version archived for rollback.  
**Scenario 2:** Given an approved mapping is causing routing errors, when the operator initiates rollback, then the previous version should be restored and the rollback audited.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 3.1 Product Mapping — SKU Resolution | p2 | DEV-05 | QA-03 | 4 | Jul 31 |
| 3.2 Desired-State Ledger Persistence | p2 | DEV-05 | QA-03 | 4 | Aug 04 |
| 3.3 Canonical Order Normalization | o2 | DEV-07 | QA-04 | 5 | Aug 04 |
| 3.4 Order Out-of-Order Event Handling | o2 | DEV-07 | QA-04 | 2 | Aug 05 |
| 3.5 Stock Ingestion & Ordered Ledger | i1 | DEV-09 | QA-03 | 4 | Aug 04 |
| 3.6 ATS Calculation with Redis Lua | i2 | DEV-09 | QA-05 | 4 | Aug 06 |
| 3.7 ATS Reserves & Safety-Stock | i2 | DEV-10 | QA-05 | 3 | Aug 07 |
| 3.8 Quota-Aware Scheduler Engine | r3 | DEV-06 | QA-05 | 4 | Aug 05 |
| 3.9 Scheduler Drain Forecast & Retry Budget | r3 | DEV-06 | QA-05 | 3 | Aug 07 |
| 3.10 Channel Simulators — Shopee & Lazada | s3 | QA-02 | QA-02 | 5 | Aug 04 |
| 3.11 Channel Simulators — Edge Cases | s3 | QA-02 | QA-02 | 3 | Aug 07 |
| 3.12 Shopee Adapter — Auth & Webhook | c1 | DEV-11 | QA-04 | 3 | Aug 01 |
| 3.13 Shopee Adapter — Inbound Order Path | c1 | DEV-11 | QA-04 | 3 | Aug 05 |
| 3.14 Lazada Adapter — OAuth & Polling | c2 | DEV-11 | QA-04 | 3 | Aug 02 |
| 3.15 Lazada Adapter — Webhook & Inbound Path | c2 | DEV-11 | QA-04 | 3 | Aug 06 |
| 3.16 Fulfilment Routing — Idempotent Hand-Off | o3 | DEV-08 | QA-04 | 4 | Aug 06 |
| 3.17 Admin Portal — Order Search API | a2 | DEV-07 | QA-06 | 4 | Aug 07 |
| 3.18 SKU Mapping — Validation & Preview | a3 | DEV-08 | QA-06 | 3 | Aug 05 |
| 3.19 SKU Mapping — Approval, Versioning & Rollback | a3 | DEV-08 | QA-06 | 2 | Aug 07 |
