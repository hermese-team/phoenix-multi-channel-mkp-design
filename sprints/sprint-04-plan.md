# Sprint 04 Plan — Outbound Sync & Peak Build

**Sprint:** 2026-08-10 to 2026-08-21 (10 working days)  
**Team:** 12 Developers + 6 QA + TL  
**Theme:** Product outbound commands, fulfilment routing, polling cursors, stock orchestration, TikTok/Amaze adapters, price reconciliation start, listing read-back start

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | Adapter certification readiness, SIT prep, cross-domain E2E reviews |
| DEV-01 | DevOps/Platform | f5 observability (dashboards, alerts), f6 load harness support |
| DEV-02 | Backend Foundation | Infrastructure support, K8s resource tuning |
| DEV-03 | Contracts & Schema | p4 listing read-back schema support, schema registry ops |
| DEV-04 | Adapter SDK | s1/s2 adapter support, a5 design (sync telemetry) |
| DEV-05 | Product Sync | p3a (diff-based outbound command generation from RMS-vs-channel diff), p4 (listing pull + cross-ref completion), a4 (product sync config) |
| DEV-06 | Price & Promotion | r4 (price reconciliation), r3 continue (scheduler) |
| DEV-07 | Order Sync | o1b (polling cursor + backup safety-net), o1d (enrichment orchestrator completion), a2 order monitoring continue |
| DEV-08 | Fulfilment Routing | o3 continue (Redis priority scheduling + MFC dispatch), o4 design (cancellation flow) |
| DEV-09 | Stock Sync + Redis | i2 continue (ATS), i3 design (stock orchestration) |
| DEV-10 | Stock Orchestration | i3 (stock sync orchestration & coalescing) |
| DEV-11 | Shopee/Lazada | c1 (Shopee outbound + push type mapping), c2 (Lazada outbound + push type mapping) |
| DEV-12 | TikTok/Amaze | c3 (TikTok push type mapping + inbound + outbound), c4 (Amaze push type mapping + inbound + outbound) |
| QA-01 | QA Lead | Progressive SIT scenarios, E2E test planning |
| QA-02 | Contract QA | s3 continue (TikTok/Amaze simulators), adapter contract tests |
| QA-03 | Domain QA | p3a outbound tests, r4 reconciliation tests, i3 stock tests |
| QA-04 | Integration QA | c1/c2 outbound tests, a2 order portal tests |
| QA-05 | Performance SDET | f6 load harness, f4 Redis benchmark, i2 ATS performance |
| QA-06 | Admin Portal QA | a3 mapping upload tests, a4 product config tests |

---

## Story 4.1: Product Outbound — Desired-State to Commands

**Gantt Code:** p3a  
**Narrative:** As the **Product Sync Engineer**, I want to transform RMS-vs-channel diff records from the desired-state ledger (action intent: CREATE/UPDATE/DEACTIVATE) into channel-neutral outbound commands with coalescing of obsolete pending updates, so that only the latest product state reaches each channel.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a desired-state record for "SKU-001" on Shopee with `action=UPDATE`, when the command generator processes it, then a Shopee product update command should be dispatched via s1 SDK and the sync ledger should record the dispatch.  
**Scenario 2:** Given two pending desired-state updates for "SKU-001" (v1, v2), when coalescing runs, then only the v2 command should dispatch and v1 should be cancelled as obsolete.

---

## Story 4.2: Product Outbound — SDK Integration & Result Classification

**Gantt Code:** p3a  
**Narrative:** As the **Product Sync Engineer**, I want to integrate outbound commands with the s1 SDK for dispatch and classify results as success, retryable, or permanent failure, so that failures are handled appropriately.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a product update dispatched via s1 SDK returns success, when the result is processed, then the sync ledger should record `SUCCESS` with the channel acknowledgement.  
**Scenario 2:** Given a product update returns a permanent error (listing not found), when classified, then it should be marked `PERMANENT_FAILURE` and a governance event published.

---

## Story 4.3: Polling Cursor — Distributed Redis Leases

**Gantt Code:** o1b  
**Narrative:** As the **Order Sync Engineer**, I want to implement distributed Redis leases for polling cursor management that prevent concurrent execution across adapter instances, so that polling-based channels ingest orders without duplication.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given two adapter instances attempt to poll the same channel, when the first acquires the Redis lease, then the second should skip with `LEASE_HELD`.  
**Scenario 2:** Given a lease expires (adapter crash), when the lease TTL passes, then another instance should be able to acquire the lease and resume polling.

---

## Story 4.4: Polling Cursor — Persistence, Catch-Up & Backup Safety-Net

**Gantt Code:** o1b  
**Narrative:** As the **Order Sync Engineer**, I want to implement cursor persistence in PostgreSQL, catch-up mode for backfilling, and backup safety-net polling using a Redis `safety-net:{channel}:processed` set (TTL 1800s) to recover missed push notifications, so that the polling framework reliably covers push notification gaps.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given cursor at "cursor_100" and 5 new orders with cursor "cursor_105", when the poll completes, then the cursor should update to "cursor_105" in PostgreSQL.  
**Scenario 2:** Given catch-up mode with date range 2026-07-01 to 2026-07-31, when the adapter runs in catch-up mode, then it should page through all orders respecting rate limits and ingest each via o1c.  
**Scenario 3:** Given backup safety-net polling runs every 15 min per channel with a 30-minute time-window overlap, Redis `safety-net:{channel}:processed` set (TTL 1800s) contains "O-100" and "O-101", and the scan returns "O-100", "O-101", "O-102", when the safety-net checks via SMISMEMBER, then "O-100" and "O-101" should be skipped as already processed, "O-102" should be forwarded to o1a and inserted into the Redis set with EX 1800.

---

## Story 4.4b: Detail Enrichment Orchestrator — Bulk Fetcher & Failure Handling

**Gantt Code:** o1d  
**Narrative:** As the **Order Sync Engineer**, I want to complete the detail enrichment orchestrator with rate-limited bulk API integration via r3 scheduler and partial batch failure handling, so that enriched order data is reliably produced for canonical normalization.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a coalesced batch of 10 `order.created` notifications, when the bulk fetcher invokes the channel API via r3 scheduler, then the API call should respect the channel's per-minute quota and use the minimum batch size that fits within remaining quota.  
**Scenario 2:** Given a bulk API returns 8 enriched payloads and 2 errors (1 retryable, 1 permanent), when partial failure handling runs, then the retryable item should be re-queued for the next batch window, the permanent failure should route to DLQ with a governance event, and the 8 successful items should be published for o2 normalization.

---

## Story 4.5: Fulfilment Routing — Redis Priority Scheduling & MFC Dispatch

**Gantt Code:** o3  
**Narrative:** As the **Fulfilment Routing Engineer**, I want to implement Redis ZSET priority queues for fulfilment scheduling with weighted round-robin (72:8:20 instant/express/normal), SLA deadline preemption (orders within 30 min of deadline bypass weights), and a rate-limited MFC dispatcher with token bucket, so that fulfilment units are dispatched in priority order within MFC's capacity.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given fulfilment units for the same warehouse with instant, express, and normal priorities, when the scheduler runs, then it should dispatch following the 72:8:20 weight ratio over 100 consecutive picks.  
**Scenario 2:** Given a fulfilment unit with `deadline_at` within 30 minutes of the current time, when the scheduler picks, then it should bypass the weight ratio and dispatch the urgent unit immediately regardless of priority type.  
**Scenario 3:** Given MFC's token bucket has 300 tokens and refills at 300/hour, when dispatch requests arrive at sustained rate, then the scheduler should never exceed the available tokens and should defer excess to the next cycle.  
**Scenario 4:** Given a successful MFC POST /request_pick, when the dispatcher completes, then it should record the result in `fulfilment_dispatch`, consume a token, and remove the in-flight guard.  
**Scenario 5:** Given a WMS POST returns a transient HTTP 429, when the dispatcher handles it, then the fulfilment unit should be re-enqueued with exponential backoff and not exceed the retry budget before escalating to DLQ.

---

## Story 4.6: Stock Orchestration — ATS to Desired Stock Commands

**Gantt Code:** i3  
**Narrative:** As the **Stock Orchestration Engineer**, I want to convert ATS changes into channel-specific desired stock commands with coalescing of rapid changes, so that stock updates reach channels efficiently.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given ATS change 100→95 for S001:TENT-01, when the orchestrator processes it, then a desired stock command with `quantity=95` should be queued for Shopee.  
**Scenario 2:** Given three rapid ATS changes 100→95→92→90, when coalesced, then only the final command with quantity=90 should dispatch.

---

## Story 4.7: Stock Orchestration — Campaign Prioritization & Scheduling

**Gantt Code:** i3  
**Narrative:** As the **Stock Orchestration Engineer**, I want to implement campaign SKU prioritization and r3 quota scheduler integration, so that priority stock updates are dispatched first without exceeding rate limits.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given campaign SKU "CAMP-TENT-01" and regular "TENT-01" both pending, when the r3 scheduler processes the queue, then the campaign SKU should dispatch first.  
**Scenario 2:** Given a channel quota window is full, when a stock command arrives, then it should be queued and dispatched in the next window without data loss.

---

## Story 4.8: Shopee Outbound — Product, Price & Stock Sync

**Gantt Code:** c1  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement outbound product, price, and stock synchronization for Shopee through the s1 SDK with correct HMAC signing and field mapping, so that Phoenix pushes updates to Shopee.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a Shopee product update command with valid payload, when dispatched via s1 SDK, then the SDK should sign with HMAC and return `SUCCESS` with the channel acknowledgement.  
**Scenario 2:** Given a Shopee price update with a new effective price of $80.00 (base=$100.00 with active 20%-off promotion), when the adapter transforms it, then it should send the effective price of $80.00 (not the $100.00 base) using Shopee-specific field names per the capability registry.  
**Scenario 3:** Given Shopee quota is exhausted, when a command arrives, then it should be queued by r3 and dispatched in the next quota window.  
**Scenario 4:** Given a UPC is marked with `price_field=MANUAL` for Shopee, when a price update command arrives for that UPC, then the adapter should skip the price up-sync to Shopee and emit a `MANUAL_FIELD_SKIPPED` event.

---

## Story 4.9: Lazada Outbound — Product, Price & Stock Sync

**Gantt Code:** c2  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to implement outbound product, price, and stock synchronization for Lazada through the s1 SDK with OAuth and correct field mapping, so that Phoenix pushes updates to Lazada.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a Lazada stock command with `quantity=50`, when transformed via capability registry, then the payload should use Lazada's field naming convention and include OAuth bearer token.  
**Scenario 2:** Given a Lazada price update with effective price of $85.00 (base=$100.00 with $15 fixed discount promotion), when the adapter transforms it, then it should send the effective price of $85.00 (not the $100.00 base) using Lazada field names.  
**Scenario 3:** Given a Lazada product update that fails with validation error, when classified, then it should be marked `PERMANENT_FAILURE` with the Lazada error code.  
**Scenario 4:** Given the Lazada OAuth token needs refresh, when the s1 SDK detects expiry, then it should refresh automatically and retry the request.  
**Scenario 5:** Given a UPC is marked with `price_field=MANUAL` for Lazada, when a price update command arrives, then the adapter should skip the price up-sync to Lazada and emit a `MANUAL_FIELD_SKIPPED` event.

---

## Story 4.10: TikTok Adapter — OAuth Flow, Push Type Mapping & Inbound Orders

**Gantt Code:** c3  
**Narrative:** As the **TikTok/Channel Adapter Engineer**, I want to build the TikTok adapter with OAuth authorization code flow, push type mapping to canonical event types consumed by o1c, and polling-based order ingestion using the o1b framework, so that TikTok orders enter the Phoenix pipeline.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the TikTok auth button is clicked and the callback URL receives the auth_code, when the OAuth flow executes, then the state/CSRF token should be validated, the auth_code should be exchanged for an access_token and refresh_token via `TokenManager.ExchangeAuthCode()`, and the token set should be persisted to the `channel_credentials` table and Redis cache.  
**Scenario 2:** Given a valid access_token is cached in Redis, when a TikTok API call is made, then the OAuth bearer token should be injected. If the access_token expires, the TokenManager should auto-refresh via the refresh_token, persist the new set, and retry.  
**Scenario 3:** Given a TikTok push notification with event type `TRADE_ORDER_CREATED`, when the adapter processes it, then it should map to canonical `ORDER_CREATED` and forward to o1c for classification. Given an `ITEM_STOCK_UPDATE` push, map to `STOCK_CHANGED`.  
**Scenario 4:** Given the TikTok adapter polls with cursor "cursor_50", when 2 new orders are found, then they should be ingested via o1c and the cursor should advance.

---

## Story 4.11: TikTok Adapter — Outbound Product & Stock Sync

**Gantt Code:** c3  
**Narrative:** As the **TikTok/Channel Adapter Engineer**, I want to implement TikTok outbound product and stock synchronization with channel-specific field mapping, so that Phoenix pushes updates to TikTok.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a TikTok product update command, when transformed and dispatched, then the TikTok-specific field mapping should be applied and the result classified.  
**Scenario 2:** Given a TikTok stock update with quantity, when dispatched, then it should use the correct TikTok API endpoint and payload format.

---

## Story 4.12: Amaze/AxtraMall Adapter — Auth, Push Type Mapping & Inbound Orders

**Gantt Code:** c4  
**Narrative:** As the **TikTok/Channel Adapter Engineer**, I want to build the Amaze/AxtraMall adapter with auth flow integration via s1 TokenManager, push type mapping to canonical event types, and polling-based order ingestion, so that Amaze/AxtraMall orders enter the Phoenix pipeline.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the Amaze auth flow completes and tokens are persisted via the s1 TokenManager, when the polling adapter runs, then it should use the cached access_token from Redis for API calls. If the token expires, the TokenManager should auto-refresh.  
**Scenario 2:** Given an Amaze push notification with event type `order.placed`, when the adapter processes it, then it should map to canonical `ORDER_CREATED` and forward to o1c for classification.  
**Scenario 3:** Given the Amaze polling adapter is configured, when new orders exist since the last cursor, then they should be ingested through o1c and the cursor should advance.  
**Scenario 4:** Given the Amaze API returns an auth error (401), when the adapter detects it, then the TokenManager should attempt a refresh and retry. If the refresh also fails, emit a `REFRESH_TOKEN_EXPIRED` governance event.

---

## Story 4.13: Amaze/AxtraMall Adapter — Outbound Sync

**Gantt Code:** c4  
**Narrative:** As the **TikTok/Channel Adapter Engineer**, I want to implement Amaze/AxtraMall outbound product and stock synchronization with channel-specific payload format, so that Phoenix pushes updates to Amaze/AxtraMall.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a stock command for Amaze with quantity=50, when dispatched via s1 SDK, then the channel-specific format should be used and the sync result recorded.  
**Scenario 2:** Given an Amaze product update command, when the capability registry indicates unsupported fields, then those fields should be stripped from the payload.

---

## Story 4.14: Price Reconciliation — Desired vs Acknowledged

**Gantt Code:** r4  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to start the price reconciliation engine that compares desired price/promotion state against acknowledged channel state and classifies failures, so that price sync issues are identified.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given desired price and acknowledged price match for SKU-001 on Shopee, when reconciliation runs, then status should be `IN_SYNC`.  
**Scenario 2:** Given desired=$15.00 but acknowledged=$14.50 (drift), when reconciliation runs, then status should be `DRIFTED` with `drift_amount=0.50`.

---

## Story 4.15: Listing Read-Back — Channel Listing Ingestion

**Gantt Code:** p4  
**Narrative:** As the **Product Sync Engineer**, I want to continue populating the `channel_listings` table by pulling existing product data from seller centers via channel read-back APIs and cross-referencing against the RMS product master, so that the initial match status is established before outbound commands are generated.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a Shopee listing read-back API returns listing data for SKU-001, when processed, then the channel listing state should be stored in the `channel_listings` table with the RMS product version at read-back time.  
**Scenario 2:** Given the read-back API returns a 429 rate-limit error, when the adapter handles it, then it should back off and retry in the next quota window.

---

## Story 4.16: Price Read-Back from Seller Centers

**Gantt Code:** p4  
**Narrative:** As the **Product Sync Engineer**, I want to ingest current price data from seller centers via channel read-back APIs and cross-reference against Phoenix desired effective prices, so that price drift caused by seller-center manual edits is detected and flagged for operator review.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a Shopee listing price read-back returns $90.00 but Phoenix desired effective price is $80.00 (drift of $10.00), when the price read-back engine cross-references, then it should flag the price drift with `PRICE_DRIFT_DETECTED` and log the drift amount.  
**Scenario 2:** Given the read-back price matches Phoenix desired effective price, when cross-referenced, then it should be marked `PRICE_VERIFIED` and no alert should be raised.  
**Scenario 3:** Given a UPC is marked with `price_field=MANUAL` for Shopee, when price read-back detects a different price, then the engine should NOT attempt to overwrite the seller-center price and should log a `MANUAL_PRICE_READ_BACK_ONLY` info event.

---

## Story 4.18: Admin Portal — Order Detail & Fulfilment Status

**Gantt Code:** a2  
**Narrative:** As the **Order Sync Engineer** (supporting Admin Portal), I want to complete the order monitoring portal with fulfilment status display, raw evidence links, and pagination, so that operators can inspect order state.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given an order handed off to WMS, when viewed in the portal, then it should show `fulfilment_status=HANDED_OFF` with correlation_id and a link to raw evidence in object storage.  
**Scenario 2:** Given a search returns more than 50 results, when the operator scrolls, then pagination should load the next page without resetting filters.

---

## Story 4.19: Admin Portal — Product Sync & Price Config

**Gantt Code:** a4  
**Narrative:** As the **Product Sync Engineer** (supporting Admin Portal), I want to create the product sync and price field configuration screen with per-channel/cohort auto/manual toggle for both product attributes and price fields, so that operators can control which fields sync to which channels.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the product sync config screen, when an Operator sets "SKU-001 title" to `MANUAL`, then subsequent product sync should NOT overwrite the Shopee title and the change should be audited.  
**Scenario 2:** Given the config screen with effective dating, when the operator sets a future effective date, then the config should not activate until that date.  
**Scenario 3:** Given the price field config section, when an Operator sets "UPC-001 price" to `MANUAL` for Shopee, then subsequent price sync to Shopee should be skipped for that UPC and a `MANUAL_PRICE_FIELD` audit entry should be created.  
**Scenario 4:** Given a UPC has `price_field=MANUAL` for Shopee but `AUTO` for Lazada, when a price update arrives, then the price should sync to Lazada but not to Shopee.

---

## Story 4.20: Load & Stress Test Harness — Generators

**Gantt Code:** f6  
**Narrative:** As the **Performance SDET**, I want to build the load/stress test harness with synthetic order/price/stock event generators and configurable channel API simulators, so that 250/500 ops/sec scenarios can be executed.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the f6 load harness, when the order generator runs at 250 aggregate ops/sec across all channel simulators for 2 minutes, then 30,000 valid canonical Order protobufs should be produced across all channels.  
**Scenario 2:** Given the channel API simulators (Shopee + Lazada + TikTok + Amaze) configured for aggregate load testing, when 250 requests/sec are sent across all simulators, then all should receive a valid response within 500ms and no simulator errors should occur.  
**Scenario 3:** Given the measurement scripts, when a 250 ops/sec scenario completes, then latency distribution, throughput, and error rate should be reported.

---

## Story 4.21: Load Harness — 500 ops/sec Scenarios

**Gantt Code:** f6  
**Narrative:** As the **Performance SDET**, I want to create 500 ops/sec burst scenarios and failure injection configurations for the load harness, so that headroom and retry-storm behavior can be tested.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the load harness configured for 500 ops/sec burst, when run for 2 minutes, then 60,000 orders should be generated with p99 latency recorded.  
**Scenario 2:** Given the failure injection configuration (simulate 429, 503, timeouts), when the harness runs, then the adapter SDK retry behavior should be exercised and metrics captured.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 4.1 Product Outbound — Desired-State to Commands | p3a | DEV-05 | QA-03 | 3 | Aug 14 |
| 4.2 Product Outbound — SDK Integration & Result Classification | p3a | DEV-05 | QA-03 | 2 | Aug 15 |
| 4.3 Polling Cursor — Distributed Redis Leases | o1b | DEV-07 | QA-04 | 2 | Aug 14 |
| 4.4 Polling Cursor — Persistence, Catch-Up & Backup Safety-Net | o1b | DEV-07 | QA-04 | 2 | Aug 15 |
| 4.4b Detail Enrichment Orchestrator — Bulk Fetcher & Failure Handling | o1d | DEV-07 | QA-04 | 3 | Aug 18 |
| 4.5 Fulfilment Routing — Redis Priority Scheduling & MFC Dispatch | o3 | DEV-08 | QA-04 | 5 | Aug 21 |
| 4.6 Stock Orchestration — ATS to Desired Stock Commands | i3 | DEV-10 | QA-03 | 3 | Aug 16 |
| 4.7 Stock Orchestration — Campaign Prioritization | i3 | DEV-10 | QA-03 | 3 | Aug 19 |
| 4.8 Shopee Outbound — Product, Price & Stock Sync | c1 | DEV-11 | QA-04 | 5 | Aug 20 |
| 4.9 Lazada Outbound — Product, Price & Stock Sync | c2 | DEV-11 | QA-04 | 5 | Aug 20 |
| 4.10 TikTok — OAuth Flow, Push Type Mapping & Inbound Orders | c3 | DEV-12 | QA-04 | 5 | Aug 17 |
| 4.11 TikTok — Outbound Product & Stock Sync | c3 | DEV-12 | QA-04 | 3 | Aug 20 |
| 4.12 Amaze/AxtraMall — Auth, Push Type Mapping & Inbound Orders | c4 | DEV-12 | QA-04 | 3 | Aug 18 |
| 4.13 Amaze/AxtraMall — Outbound Sync | c4 | DEV-12 | QA-04 | 2 | Aug 21 |
| 4.14 Price Reconciliation Start | r4 | DEV-06 | QA-03 | 3 | Aug 19 |
| 4.15 Listing Read-Back — Channel Ingestion | p4 | DEV-05 | QA-03 | 3 | Aug 20 |
| 4.16 Price Read-Back from Seller Centers | p4 | DEV-05 | QA-03 | 3 | Aug 21 |
| 4.18 Admin Portal — Order Detail & Fulfilment Status | a2 | DEV-07 | QA-06 | 3 | Aug 19 |
| 4.19 Admin Portal — Product Sync & Price Config | a4 | DEV-05 | QA-06 | 4 | Aug 21 |
| 4.20 Load Harness — Generators & 250 Aggregate ops/sec | f6 | QA-05 | QA-05 | 5 | Aug 19 |
| 4.21 Load Harness — 500 Aggregate ops/sec & Failure Injection | f6 | QA-05 | QA-05 | 3 | Aug 21 |
