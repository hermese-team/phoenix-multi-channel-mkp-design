# Sprint 05 Plan — Reconciliation & Progressive SIT

**Sprint:** 2026-08-24 to 2026-09-04 (10 working days)  
**Team:** 12 Developers + 6 QA + TL  
**Theme:** Progressive SIT starts, reconciliation engines (product/price/stock), cancellation flow, listing cross-reference and push-driven drift detection, Admin Portal telemetry, channel certification

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | SIT defect triage, certification readiness, release gate reviews |
| DEV-01 | DevOps/Platform | f5 observability dashboards complete, support SIT environment |
| DEV-02 | Backend Foundation | Infrastructure stability, read-model optimization |
| DEV-03 | Contracts & Schema | p4 read-back schema, s3 simulator completion |
| DEV-04 | Adapter SDK | a5 (sync telemetry, retry controls, governance) |
| DEV-05 | Product Sync | p3b (product reconciliation), p4 (push-driven listing cross-ref and stale detection), a4 continue |
| DEV-06 | Price & Promotion | r4 (price reconciliation), r3 continue (scheduler) |
| DEV-07 | Order Sync | a2 complete (order monitoring), o1b continue, SIT support |
| DEV-08 | Fulfilment Routing | o3 continue (legacy MKP dispatcher + circuit breaker), o4 (cancellation flow), a3 continue (mapping upload) |
| DEV-09 | Stock Sync + Redis | i2 continue (ATS), i4 design (stock reconciliation) |
| DEV-10 | Stock Orchestration | i3 continue, i4 (stock reconciliation) |
| DEV-11 | Shopee/Lazada | c1/c2 outbound complete, sandbox certification start |
| DEV-12 | TikTok/Amaze | c3/c4 continue, certification prep |
| QA-01 | QA Lead | Progressive SIT execution (t1), cross-domain test coordination |
| QA-02 | Contract QA | s3 complete, adapter contract regression |
| QA-03 | Domain QA | p3b reconciliation tests, r4 price tests, i4 stock tests |
| QA-04 | Integration QA | c1-c4 certification tests, o3/o4 fulfilment tests |
| QA-05 | Performance SDET | f6 load harness scenarios, i2 ATS performance |
| QA-06 | Admin Portal QA | a2/a3/a4 regression, a5 telemetry validation |

---

## Story 5.1: Product Reconciliation — Desired vs Acknowledged

**Gantt Code:** p3b  
**Narrative:** As the **Product Sync Engineer**, I want to compare desired-state vs sent-state vs acknowledged-state per SKU/channel, so that operators can identify and repair drifted products.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given desired payload hash="abc123" and acknowledged hash="abc123", when reconciliation runs, then status should be `IN_SYNC`.  
**Scenario 2:** Given desired hash="abc123" but acknowledged="def456", when reconciliation runs, then status should be `DRIFTED` with the payload diff shown.

---

## Story 5.2: Product Drill-Down & Read-Back Integration

**Gantt Code:** p3b  
**Narrative:** As the **Product Sync Engineer**, I want to provide operator drill-down views and integrate channel read-back data where available, so that silent drift (adapter acknowledged but channel has different data) is detected.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a drifted product, when the operator drills down, then the view should show desired vs acknowledged payloads side-by-side with attribute-level diffs.  
**Scenario 2:** Given read-back shows channel listing has different title than desired, even though adapter acknowledged success, when reconciliation runs with read-back, then it should flag the silent drift.

---

## Story 5.3: Listing Read-Back & Stale Detection

**Gantt Code:** p4  
**Narrative:** As the **Product Sync Engineer**, I want to complete the cross-reference and stale-product detection engine that processes incoming platform push notifications (via o1c) for product/price changes, cross-references against the RMS product master, and flags stale/orphaned/drifted products, so that ongoing drift is detected without full re-pull cycles.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a Shopee listing active on Shopee but RMS shows status=INACTIVE, when the cross-reference engine runs, then it should flag as `STALE_ACTIVE` and create a governance alert.  
**Scenario 2:** Given a channel listing with title matching RMS, when cross-referenced, then it should be marked `VERIFIED`.  
**Scenario 3:** Given a `product.updated` push notification arrives via o1c for a Shopee listing, when the push-driven cross-reference engine processes it, then it should update the `channel_listings` record and re-evaluate the match status without a full re-pull.  
**Scenario 4:** Given a listing has been verified, when the operator opens the Admin Portal listing config screen (a4), then it should show as `VERIFIED` and allow auto/manual field overrides for product attributes and price fields.  
**Scenario 5:** Given a UPC has `price_field=MANUAL` configured for Shopee via a4, when the stale-detection engine runs and the price read-back detects a difference, then the engine should log a `MANUAL_PRICE_READ_BACK_ONLY` event and NOT attempt to overwrite the seller-center price.

---

## Story 5.4: Price Reconciliation — Failure Classification

**Gantt Code:** r4  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to complete the price reconciliation engine with permanent vs retryable failure classification and operator evidence views, so that price sync failures are actionable.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a price update that failed with Shopee error `FIELD_VALUE_OUT_OF_RANGE`, when the operator inspects it, then they should see the desired price, rejected payload, channel response, and retry history.  
**Scenario 2:** Given a failure classified as `RETRYABLE` (429), when reconciliation runs, then r3 should retry in the next quota window. Given `PERMANENT` (invalid field), then operator intervention should be required.

---

## Story 5.5: Stock Reconciliation

**Gantt Code:** i4  
**Narrative:** As the **Stock Orchestration Engineer**, I want to compare Phoenix desired stock against channel-acknowledged stock and surface drift, so that inventory discrepancies are detected before overselling.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given Phoenix desired=50 and acknowledged=50 for S001:TENT-01 on Shopee, when reconciliation runs, then status should be `IN_SYNC`.  
**Scenario 2:** Given Phoenix desired=50 but acknowledged=45 (drift=5), when reconciliation runs, then status should be `DRIFTED` with `drift_amount=5` and a governance alert published.

---

## Story 5.6: Stock Reconciliation — Read-Back Integration

**Gantt Code:** i4  
**Narrative:** As the **Stock Orchestration Engineer**, I want to incorporate channel read-back where available and reuse shared reconciliation patterns from p3b/r4, so that stock reconciliation is consistent across domains.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a channel with read-back support for stock, when reconciliation runs with read-back, then it should compare Phoenix desired against actual channel-listed stock and update drift status.  
**Scenario 2:** Given the stock reconciliation reuses the shared sync ledger, when queried, then the drift report should follow the same format as product and price reconciliation.

---

## Story 5.7: Fulfilment Routing — Legacy MKP Dispatcher & Circuit Breaker

**Gantt Code:** o3  
**Narrative:** As the **Fulfilment Routing Engineer**, I want to implement the legacy MKP dispatcher for DC1/DC2 warehouses with circuit breaker integration and a 1000 requests/hour token bucket, so that larger warehouses dispatch orders at their certified capacity.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a fulfilment unit targeting DC1, when the dispatcher calls the legacy MKP endpoint, then it should use a separate Redis token bucket from MFC with initial capacity of 1000 tokens per hour.  
**Scenario 2:** Given 5 consecutive POST /fulfil failures to the legacy endpoint within 60 seconds, when the circuit breaker evaluates, then it should open the circuit and fail-fast for subsequent requests.  
**Scenario 3:** Given the circuit breaker is open for a DC1 endpoint, when 30 seconds elapse, then a single half-open probe request should be attempted and the circuit should close on success.  
**Scenario 4:** Given a legacy MKP endpoint returns a recoverable HTTP 429, when the dispatcher handles it, then the fulfilment unit should be re-enqueued with the server-provided retry-after header respected.

---

## Story 5.8: Cancellation — Pre-Fulfilment Handling

**Gantt Code:** o4  
**Narrative:** As the **Fulfilment Routing Engineer**, I want to implement cancellation before fulfilment acceptance, so that orders can be cancelled before they reach WMS.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given an order with `status=accepted` not yet handed to WMS, when a cancellation arrives, then the order should transition to `CANCELLED_BEFORE_FULFILMENT` and the channel should be notified.  
**Scenario 2:** Given an order with `status=handed_off_to_wms`, when a cancellation arrives, then the engine should reject with `CANCELLATION_NOT_ALLOWED_AFTER_HANDOFF`.

---

## Story 5.9: Cancellation — State Machine & Status Mapping

**Gantt Code:** o4  
**Narrative:** As the **Fulfilment Routing Engineer**, I want to implement minimum external status mapping and state transition legality checks, so that invalid backward transitions are prevented.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given an order with `status=delivered`, when a cancellation event arrives, then it should be rejected with `INVALID_STATE_TRANSITION` and logged to the audit trail.  
**Scenario 2:** Given a status update from the channel (e.g., Shipped, Delivered, Returned), when mapped, then the external status should be translated to the canonical status per channel mapping table.

---

## Story 5.10: Channel Certification — Shopee & Lazada Sandbox

**Gantt Code:** c1, c2  
**Narrative:** As the **Channel Adapter Engineers**, I want to begin sandbox certification for Shopee and Lazada, verifying that E2E flows work against real sandbox endpoints, so that certification issues are found early.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given Shopee sandbox credentials, when the adapter E2E test runs (auth → inbound order → product outbound → stock outbound), then all steps should complete successfully.  
**Scenario 2:** Given Lazada sandbox credentials, when the adapter polls for orders, then it should authenticate and retrieve test orders.

---

## Story 5.11: Channel Certification — TikTok & Amaze Sandbox

**Gantt Code:** c3, c4  
**Narrative:** As the **Channel Adapter Engineers**, I want to begin sandbox certification for TikTok and Amaze/AxtraMall, so that all four channels are validated against real sandbox environments.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given TikTok sandbox credentials, when the adapter runs E2E tests (auth → polling → outbound), then all steps should pass or failures should be documented as certification issues.  
**Scenario 2:** Given Amaze/AxtraMall sandbox credentials, when the adapter runs E2E tests (auth → inbound → outbound), then all steps should complete.

---

## Story 5.12: Sync Telemetry — Queue Age & Retry/DLQ Views

**Gantt Code:** a5  
**Narrative:** As the **Adapter SDK Engineer** (supporting Admin Portal), I want to build the sync telemetry dashboard showing queue age, retry counts, and DLQ state per channel, so that operators can monitor sync health.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the f5 observability pipeline is publishing metrics, when the operator opens the Sync Telemetry dashboard, then it should show queue depth, retry count, and DLQ count per channel, refreshing within 30 seconds.  
**Scenario 2:** Given a channel has messages in the DLQ, when the operator views it, then they should see the message count, oldest message age, and error breakdown.

---

## Story 5.12b: Refresh Token Expiry Dashboard

**Gantt Code:** a5  
**Narrative:** As the **Adapter SDK Engineer** (supporting Admin Portal), I want to build the refresh token expiry dashboard showing per-channel token health status and days-to-expiry, so that operators are notified before tokens expire and can re-run the auth flow.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a channel's refresh token has more than 14 days until expiry, when the operator opens the token health dashboard, then it should show `TOKEN_HEALTHY` with the days remaining. Given the token is within 14 days of expiry, it should show `TOKEN_EXPIRING` with a warning badge and the days remaining.  
**Scenario 2:** Given a channel's refresh token is within the configurable expiry threshold (default 14 days), when the operator logs into the Admin Portal, then a notification banner should appear prompting them to re-run the auth flow for that channel, with a direct link to the auth button.  
**Scenario 3:** Given a token has expired, when the operator views the dashboard, then it should show `TOKEN_EXPIRED` and the channel adapter should emit a `REFRESH_TOKEN_EXPIRED` governance event. The operator should be unable to perform outbound sync until the auth flow is re-run.

---

## Story 5.13: Manual Retry Controls & Immutable Audit

**Gantt Code:** a5  
**Narrative:** As the **Adapter SDK Engineer** (supporting Admin Portal), I want to implement manual retry with preview, permission checks, scope control, rate-limit protection, and immutable audit, so that operator retries are safe and governed.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a sync entry with `PERMANENT_FAILURE`, when an Operator with retry permission clicks "Retry", then a preview should show scope, idempotency impact, and rate-limit protection, and after confirmation, the retry should execute with an immutable audit entry.  
**Scenario 2:** Given an Operator WITHOUT retry permission, when they attempt to trigger a retry, then the UI should disable the retry button and show an insufficient permissions message.

---

## Story 5.14: Observability Dashboards & SLO Alerts

**Gantt Code:** f5  
**Narrative:** As the **DevOps Engineer**, I want to complete operational dashboards with queue age, platform_wait_time, source delay, retry/DLQ counts, and SLO burn-rate alerts, so that the operations team can monitor platform health.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the f5 observability pipeline is live, when the operations dashboard loads, then it should show queue age per domain, platform_wait_time, source_delay, retry/DLQ counts, and channel health status.  
**Scenario 2:** Given an SLO target of p99 ≤ 250ms for order acceptance, when the measured p99 exceeds 250ms for 5 consecutive minutes, then a burn-rate alert should fire and notify on-call.  
**Scenario 3:** Given the audit trail infrastructure, when an operator action occurs, then an immutable event should be written to the audit stream.

---

## Story 5.15: Progressive SIT Phase 1 — Product, Order & Push Mechanism E2E

**Gantt Code:** t1  
**Narrative:** As the **QA Lead**, I want to execute phase 1 of progressive SIT by testing the product and order E2E flows with simulators, including the webhook push pipeline, so that integration defects are discovered early.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given RMS test payloads, mapping rules, and Shopee simulator, when the product E2E test suite runs, then RMS ingestion → channel listing pull (p4) → RMS-vs-channel cross-reference (p2) → diff-based outbound command generation (p3a) → channel acknowledgment → reconciliation (p3b) should all pass.  
**Scenario 2:** Given a Shopee order webhook push payload, when the order E2E test suite runs, then adapter verification → o1c classification (ORDER_CREATED) → o1a archival + Redis dedup → Kafka quorum (202 returned) → o2 normalization → persistence → fulfilment routing should complete and the order should appear in Admin Portal.  
**Scenario 3:** Given a duplicate Shopee order push with the same `push_id` arrives within the Redis TTL window, when the o1a dedup check runs, then it should return 200 OK without archival or duplicate Kafka publish.

---

## Story 5.16: Progressive SIT Phase 1 — Stock, Enrichment & Cross-Domain

**Gantt Code:** t1  
**Narrative:** As the **QA Lead**, I want to execute stock E2E, detail enrichment orchestrator, and cross-domain integration tests, so that all pipelines are validated.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a Stock Service movement event, when the stock E2E test suite runs, then movement ingestion → ledger → ATS update → orchestration → outbound → channel acknowledgment should complete.  
**Scenario 2:** Given a lightweight `order.created` push notification (id only), when the detail enrichment orchestrator (o1d) processes it, then it should coalesce with other notifications within the window, invoke a rate-limited bulk GetOrdersBatch call via the simulator, enrich each order, and publish the canonical payload for o2 normalization.  
**Scenario 3:** Given a product update changes the price, when the cross-domain test runs, then both the product update and price update should reach the channel without interfering with each other.

---

## Story 5.17: Progressive SIT — Backup Polling Recovery

**Gantt Code:** t1  
**Narrative:** As the **QA Lead**, I want to test that the backup safety-net polling recovers missed push notifications, so that no orders are lost when push delivery fails.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given push notification for order "O-200" was intentionally dropped, and the Redis `safety-net:{channel}:processed` set (TTL 1800s) contains orders "O-100" and "O-101", when the 15-minute backup safety-net polling detects "O-200" in its 30-minute time-window overlap scan, then it should verify via SMISMEMBER that "O-200" is not in the Redis set, forward it to o1a, insert it into the set with EX 1800, and produce the governance event `safety-net.scan.complete` with matched_count=2, missed_count=1.

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 5.1 Product Reconciliation — Desired vs Acknowledged | p3b | DEV-05 | QA-03 | 2 | Aug 27 |
| 5.2 Product Drill-Down & Read-Back | p3b | DEV-05 | QA-03 | 2 | Aug 29 |
| 5.3 Listing Read-Back & Stale Detection | p4 | DEV-05 | QA-03 | 3 | Sep 01 |
| 5.4 Price Reconciliation — Failure Classification | r4 | DEV-06 | QA-03 | 2 | Aug 28 |
| 5.5 Stock Reconciliation | i4 | DEV-10 | QA-03 | 2 | Aug 28 |
| 5.6 Stock Reconciliation — Read-Back | i4 | DEV-10 | QA-03 | 2 | Aug 30 |
| 5.7 Fulfilment Routing — Legacy MKP Dispatcher | o3 | DEV-08 | QA-04 | 3 | Sep 02 |
| 5.8 Cancellation — Pre-Fulfilment | o4 | DEV-08 | QA-04 | 2 | Aug 28 |
| 5.9 Cancellation — State Machine & Status Mapping | o4 | DEV-08 | QA-04 | 2 | Sep 01 |
| 5.10 Channel Certification — Shopee & Lazada | c1, c2 | DEV-11 | QA-04 | 3 | Sep 01 |
| 5.11 Channel Certification — TikTok & Amaze | c3, c4 | DEV-12 | QA-04 | 3 | Sep 02 |
| 5.12 Sync Telemetry — Queue Age & DLQ Views | a5 | DEV-04 | QA-06 | 4 | Sep 02 |
| 5.12b Refresh Token Expiry Dashboard | a5 | DEV-04 | QA-06 | 2 | Sep 03 |
| 5.13 Manual Retry Controls & Immutable Audit | a5 | DEV-04 | QA-06 | 4 | Sep 04 |
| 5.14 Observability Dashboards & SLO Alerts | f5 | DEV-01 | QA-01 | 5 | Sep 04 |
| 5.15 SIT Phase 1 — Product, Order & Push E2E | t1 | QA-01 | QA-01 | 5 | Sep 01 |
| 5.16 SIT Phase 1 — Stock, Enrichment & Cross-Domain | t1 | QA-01 | QA-01 | 5 | Sep 04 |
| 5.17 SIT — Backup Polling Recovery | t1 | QA-01 | QA-01 | 2 | Sep 04 |
