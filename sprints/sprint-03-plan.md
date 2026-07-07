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
| DEV-05 | Product Sync | p1 completion, p2 (RMS-vs-channel cross-ref, desired-state with action intent), p4 (listing pull via adapters) |
| DEV-06 | Price & Promotion | r1 completion, r3 (quota-aware scheduler), r4 design |
| DEV-07 | Order Sync | o1a completion, o2 (canonical normalization, idempotency), o1d start (enrichment orchestrator design) |
| DEV-08 | Fulfilment Routing | o3 (fulfilment routing engine), a3 design (SKU warehouse mapping) |
| DEV-09 | Stock Sync + Redis | i1 (stock ledger), f4 completion, i2 (ATS calculation) |
| DEV-10 | Stock Orchestration | i2 (ATS), i3 design (stock orchestration) |
| DEV-11 | Shopee/Lazada | c1 (Shopee auth + inbound + push type mapping + listing read-back for p4), c2 (Lazada auth + inbound + push type mapping + listing read-back for p4) |
| DEV-12 | TikTok/Channel | Support s3 simulators, c3 preparation |
| QA-01 | QA Lead | Progressive SIT planning, cross-domain integration scenarios |
| QA-02 | Contract QA | s3 channel API simulators (Shopee/Lazada), adapter contract tests |
| QA-03 | Domain QA | p2 mapping tests, r1/r2 regression, i1 stock ingestion tests |
| QA-04 | Integration QA | o1a/o2 order pipeline tests, c1/c2 inbound adapter tests |
| QA-05 | Performance SDET | f6 (load/stress harness), f4 Redis benchmark tests |
| QA-06 | Admin Portal QA | a1 permission tests, a2 order portal planning |

---

## Story 3.1: Product Mapping Engine — RMS-vs-Channel Cross-Reference

**Gantt Code:** p2  
**Narrative:** As the **Product Sync Engineer**, I want to build the cross-reference engine that compares RMS product master (p1) against pulled channel listings (p4) and determines the match status per SKU-channel pair, so that each product's relationship to its channel listings is known before generating outbound commands.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given RMS product "SKU-001" exists in the RMS master and a Shopee listing "SP12345" exists in `channel_listings` with matching SKU reference, when the cross-reference engine processes them, then it should produce `match_status=MATCHED` and `action=UPDATE` (fields may need syncing).  
**Scenario 2:** Given RMS product "SKU-002" exists in the RMS master but no matching listing exists in the Shopee `channel_listings`, when processed, then it should produce `match_status=MISSING_ON_CHANNEL` with `action=CREATE` and log to the governance topic.  
**Scenario 3:** Given RMS product "SKU-003" is inactive in the RMS master but an active listing exists on Shopee, when processed, then the cross-reference should produce `match_status=DEACTIVATED_ON_CHANNEL` with `action=DEACTIVATE`.

---

## Story 3.2: Desired-State Ledger Persistence with Action Intent

**Gantt Code:** p2  
**Narrative:** As the **Product Sync Engineer**, I want to implement the desired-state ledger with versioning, payload hash, priority, reconciliation keys, and action intent (CREATE/UPDATE/DEACTIVATE), so that Phoenix tracks the intended state of each product per channel with the specific action to be taken.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a matched product with `match_status=MATCHED` from the cross-reference engine, when the desired-state is persisted, then it should store version, payload_hash, priority, reconciliation_key, and `action=UPDATE`.  
**Scenario 2:** Given an existing desired-state with version=3, when an update with version=2 arrives, then it should be rejected with `STALE_DESIRED_STATE`.  
**Scenario 3:** Given a desired-state is updated, when the old record has a different payload hash, then the hash should be recalculated and the change tracked.

---

## Story 3.2b: Channel Listing Pull — Initial Ingestion via Adapters

**Gantt Code:** p4  
**Narrative:** As the **Product Sync Engineer**, I want to pull existing product listings from Shopee and Lazada seller centers via channel read-back APIs (c1/c2), store them in the `channel_listings` table, and cross-reference against RMS product master (p1), so that the initial match status per SKU-channel is established.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given Shopee and Lazada adapters are available with listing read-back capability, when the initial listing pull runs, then all active listings from both platforms should be ingested into the `channel_listings` table with channel, listing_id, SKU reference, title, price, and status.  
**Scenario 2:** Given the `channel_listings` table is populated with Shopee and Lazada listings, when the cross-reference engine processes them against the RMS product master, then each listing should be classified as MATCHED, MISSING_ON_CHANNEL, MISSING_IN_RMS, FIELD_DRIFTED, or DEACTIVATED_ON_CHANNEL and the results persisted.  
**Scenario 3:** Given the Admin Portal cross-reference report, when an operator views it, then it should show per-channel counts of matched, missing-on-channel, missing-in-RMS, and drifted SKUs.

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

## Story 3.4b: Detail Enrichment Orchestrator — Design & Coalescer

**Gantt Code:** o1d  
**Narrative:** As the **Order Sync Engineer**, I want to design and start building the detail enrichment orchestrator that coalesces lightweight push notifications and invokes rate-limited bulk API calls to fetch enriched details, so that order line items, addresses, and payment metadata are available for canonical normalization.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given two `order.created` lightweight notifications with `order_id=["123", "124"]` arriving within the coalescing window, when the coalescer processes them, then they should be batched into a single `GetOrdersBatch(["123", "124"])` call respecting the channel rate limiter via r3.  
**Scenario 2:** Given the bulk API returns enriched payloads for both orders, when the orchestrator processes the response, then each enriched order should be published as a separate canonical event to `order.enriched.v1` for o2 normalization.

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

## Story 3.12: Shopee Adapter — OAuth Flow, Auth & Webhook Verification

**Gantt Code:** c1  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement the Shopee OAuth authorization code flow (auth button redirect, callback, auth_code exchange via s1 TokenManager), HMAC request signing, and webhook signature verification, so that Shopee orders enter the Phoenix pipeline with securely managed credentials.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the Shopee auth button is clicked and the callback URL receives the auth_code, when the OAuth flow executes, then the state/CSRF token should be validated, the auth_code should be exchanged for an access_token and refresh_token via `TokenManager.ExchangeAuthCode()`, and the token set should be persisted to the `channel_credentials` table and Redis cache.  
**Scenario 2:** Given a valid access_token is cached in Redis, when a Shopee API request is signed, then the HMAC should use the access_token and pass verification. If the access_token has expired, the TokenManager should auto-refresh using the refresh_token, persist the new set, and retry.  
**Scenario 3:** Given a Shopee webhook payload with valid HMAC header, when received, then the signature should be validated and the payload forwarded to o1c (message classifier) for type routing before archival via o1a. Given an invalid signature, return HTTP 401.  
**Scenario 4:** Given a Shopee `ORDER_CREATED` push payload, when the adapter processes it, then it should map the Shopee event type to the canonical `ORDER_CREATED` type and forward to o1c. Given a `PRODUCT_UPDATE` push, it should map to `PRODUCT_UPDATED`.

---

## Story 3.13: Shopee Adapter — Inbound Order Path

**Gantt Code:** c1  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to complete the Shopee inbound order path from webhook through o1a raw archival through o2 canonical normalization, so that Shopee orders flow end-to-end.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a valid Shopee order notification, when it passes through c1 → o1a → o2, then the raw payload should be archived in MinIO and the canonical order persisted.  
**Scenario 2:** Given the adapter is integrated with s1 SDK, when the order is ingested, then an adapter result event should be published to `sync.result.v1`.

---

## Story 3.14: Lazada Adapter — OAuth Flow & Polling

**Gantt Code:** c2  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement the Lazada OAuth authorization code flow (auth redirect, callback, auth_code exchange via s1 TokenManager), token lifecycle management, and polling-based order retrieval with the o1b polling cursor framework, so that Lazada orders enter the Phoenix pipeline with securely managed credentials.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the Lazada auth button is clicked and the callback URL receives the auth_code, when the OAuth flow executes, then the state/CSRF token should be validated, the auth_code should be exchanged for an access_token and refresh_token via `TokenManager.ExchangeAuthCode()`, and the token set should be persisted to the `channel_credentials` table and Redis cache.  
**Scenario 2:** Given a valid access_token is cached in Redis, when a Lazada API call is made, then the OAuth bearer token should be injected. If the access_token expires, the TokenManager should auto-refresh via the refresh_token, persist the new set, and retry. If the refresh_token is within 14 days of expiry, emit a `REFRESH_TOKEN_EXPIRING` event.  
**Scenario 3:** Given the polling cursor is at "cursor_50", when the adapter polls and finds 2 new orders with cursor "cursor_52", then each order should be ingested via o1a and the cursor should advance to "cursor_52".

---

## Story 3.15: Lazada Adapter — Webhook & Inbound Order Path

**Gantt Code:** c2  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement Lazada webhook handling and complete the inbound order path through o1a and o2, so that Lazada orders flow end-to-end.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a valid Lazada webhook, when received, then the payload should be verified, forwarded to o1c for type classification, archived via o1a, and normalized via o2.  
**Scenario 2:** Given a Lazada `order.created` push payload, when the adapter processes it, then it should map the Lazada event type to canonical `ORDER_CREATED` and forward to o1c. Given an `item.price.updated` push, map to `PRICE_CHANGED`.  
**Scenario 3:** Given a polling cycle returns 0 new orders, when the cycle completes, then the cursor should remain unchanged and no events should be published.

---

## Story 3.16: Fulfilment Routing — Warehouse Assignment & Split Fulfilment

**Gantt Code:** o3  
**Narrative:** As the **Fulfilment Routing Engineer**, I want to build the fulfilment router that consumes `order.received.v1`, resolves each line to a warehouse (via explicit `warehouse_code` or SKU-Warehouse mapping lookup), splits multi-warehouse orders into fulfilment units, persists the routing decision, and publishes to `fulfilment.unit.v1`, so that accepted orders are correctly assigned for dispatch.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given an order where each line has an explicit `warehouse_code` (MFC, DC1, DC2), when the router processes it, then each line should use its declared warehouse and all lines for the same warehouse should be grouped into one fulfilment unit.  
**Scenario 2:** Given an order line with no `warehouse_code`, when the router processes it, then it should query the `sku_warehouse_mapping` table and resolve to the correct warehouse.  
**Scenario 3:** Given an order with lines mapped to two different warehouses (MFC and DC1), when the router processes it, then it should create two split fulfilment units, each containing its respective line items, and publish both to `fulfilment.unit.v1`.  
**Scenario 4:** Given a routing decision is made, when the router persists it, then the `fulfilment_routing` table should contain the order_id, unit_id, warehouse_id, items, priority, and deadline.  
**Scenario 5:** Given a WMS endpoint accepts the fulfilment unit POST with an idempotency key, when the hand-off completes, then the response should be recorded in `fulfilment_dispatch` and the fulfilment unit should be removed from the queue.

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
| 3.2 Desired-State Ledger Persistence with Action Intent | p2 | DEV-05 | QA-03 | 4 | Aug 04 |
| 3.2b Channel Listing Pull — Initial Ingestion via Adapters | p4 | DEV-05 | QA-03 | 4 | Aug 07 |
| 3.3 Canonical Order Normalization | o2 | DEV-07 | QA-04 | 5 | Aug 04 |
| 3.4 Order Out-of-Order Event Handling | o2 | DEV-07 | QA-04 | 2 | Aug 05 |
| 3.4b Detail Enrichment Orchestrator — Design & Coalescer | o1d | DEV-07 | QA-04 | 3 | Aug 07 |
| 3.5 Stock Ingestion & Ordered Ledger | i1 | DEV-09 | QA-03 | 4 | Aug 04 |
| 3.6 ATS Calculation with Redis Lua | i2 | DEV-09 | QA-05 | 4 | Aug 06 |
| 3.7 ATS Reserves & Safety-Stock | i2 | DEV-10 | QA-05 | 3 | Aug 07 |
| 3.8 Quota-Aware Scheduler Engine | r3 | DEV-06 | QA-05 | 4 | Aug 05 |
| 3.9 Scheduler Drain Forecast & Retry Budget | r3 | DEV-06 | QA-05 | 3 | Aug 07 |
| 3.10 Channel Simulators — Shopee & Lazada | s3 | QA-02 | QA-02 | 5 | Aug 04 |
| 3.11 Channel Simulators — Edge Cases | s3 | QA-02 | QA-02 | 3 | Aug 07 |
| 3.12 Shopee Adapter — OAuth Flow, Auth & Webhook | c1 | DEV-11 | QA-04 | 4 | Aug 01 |
| 3.13 Shopee Adapter — Inbound Order Path | c1 | DEV-11 | QA-04 | 3 | Aug 05 |
| 3.14 Lazada Adapter — OAuth Flow & Polling | c2 | DEV-11 | QA-04 | 4 | Aug 02 |
| 3.15 Lazada Adapter — Webhook & Inbound Path | c2 | DEV-11 | QA-04 | 3 | Aug 06 |
| 3.16 Fulfilment Routing — Warehouse Assignment & Split Fulfilment | o3 | DEV-08 | QA-04 | 5 | Aug 07 |
| 3.17 Admin Portal — Order Search API | a2 | DEV-07 | QA-06 | 4 | Aug 07 |
| 3.18 SKU Mapping — Validation & Preview | a3 | DEV-08 | QA-06 | 3 | Aug 05 |
| 3.19 SKU Mapping — Approval, Versioning & Rollback | a3 | DEV-08 | QA-06 | 2 | Aug 07 |
