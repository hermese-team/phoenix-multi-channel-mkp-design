# Sprint 02 Plan — Domain Ingestion & Integration Layer

**Sprint:** 2026-07-13 to 2026-07-24 (10 working days)  
**Team:** 11 Developers + 4 QA + TL  
**Theme:** Enterprise contract completion, domain ingestion services, Redis foundation, capability registry, Admin Portal design, promotion rules

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | Finalize dependency contracts, ADR reviews, cross-domain sequencing |
| DEV-01 | DevOps/Platform | Continue f1 (K8s), start f5 (observability), support f4 Redis infra |
| DEV-02 | Backend Foundation | Continue f2 (Kafka), continue f3 (PostgreSQL), support domain ingestion |
| DEV-03 | Contracts & Schema | Finalize m4 contracts, support p1/r1 schema refinement |
| DEV-04 | Adapter SDK | Continue s1 (quota, circuit breaker, telemetry), start s2 (capability registry) |
| DEV-05 | Product Sync | Continue p1 (RMS ingestion implementation), start p4 (channel listing pull schema design), start p2 (mapping design) |
| DEV-06 | Price & Promotion | Continue r1 (RMS/LDD implementation), r2 (promotion rules engine) |
| DEV-07 | Order Sync | o1a (webhook intake: archival, Redis dedup, Kafka quorum), o1c (message classifier & router), start o2 (canonical normalization design) |
| DEV-08 | Fulfilment Routing | Support m3 dependency discovery (WMS/MFC contract), design o3 (fulfilment routing) |
| DEV-09 | Stock Sync + Redis | Start f4 (Redis quota primitives), start i1 (stock ingestion design) |
| DEV-10 | Stock Orchestration | Support i1 design, start i2 (ATS calculation design) |
| QA-01 | QA Lead | SIT planning, cross-domain integration scenarios |
| QA-02 | Contract QA | Contract tests for ingestion, s2 capability registry tests |
| QA-03 | Domain QA | p1, r1, r2 functional tests |
| QA-06 | Admin Portal QA | a1 UX flow validation, operator role definition |

---

## Story 2.1: External Dependency Contracts Finalized

**Gantt Code:** m3  
**Narrative:** As the **Tech Lead**, I want to finalize and document confirmed payload samples, error codes, and replay behavior for RMS, RMS/LDD, Stock Service, and WMS/MFC, so that domain teams build against real enterprise contracts.  
**Story Points:** n/a (completion gate)

### Acceptance Criteria
**Scenario 1:** Given RMS, RMS/LDD, Stock Service, and WMS/MFC owners have provided samples, when the ADRs are written, then each should include payload format, versioning, error codes, and replay behavior.  
**Scenario 2:** Given an enterprise API returns an undocumented error code, when the ingestion engine encounters it, then it should classify it as `UNKNOWN_ERROR` and route to DLQ for manual inspection.

---

## Story 2.2: K8s Staging Environment & Observability Start

**Gantt Code:** f1, f5  
**Narrative:** As the **DevOps Engineer**, I want to complete the staging environment promotion and start the observability platform with OpenTelemetry, so that services can be deployed and monitored in a production-like environment.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the staging namespace exists, when a new service image is promoted from dev, then ArgoCD should sync manifests automatically and the service should be reachable via staging ingress.  
**Scenario 2:** Given the OTel collector is deployed, when a sample Go service emits structured logs and metrics, then the collector should receive them and make them queryable.

---

## Story 2.3: Kafka Producer/Consumer Library Completion

**Gantt Code:** f2  
**Narrative:** As the **Backend Foundation Engineer**, I want to complete the shared Kafka producer/consumer Go library with schema registry integration, retry/DLQ routing, and operational dashboards, so that domain services have a safe, observable event publishing pattern.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a consumer processing messages from `phoenix.product.v1`, when processing fails with `PermanentError`, then the message should route to `phoenix.product.v1-dlq`, and when it fails with `TransientError`, then route to `phoenix.product.v1-retry` with delivery delay.  
**Scenario 2:** Given the Kafka dashboard is deployed with consumer group metrics, when a consumer group is behind, then the dashboard should display lag per partition and trigger an alert if lag exceeds 1000.

---

## Story 2.4: PostgreSQL Read-Model Views & Migration Finalization

**Gantt Code:** f3  
**Narrative:** As the **Backend Foundation Engineer**, I want to finalize all PostgreSQL migrations with read-model views for Admin Portal queries and tested rollback capability, so that operational screens have efficient query paths.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the `orders` transactional table is partitioned monthly, when an Admin Portal query runs for order search, then it should read from a materialized view optimized for search and never scan the transactional table.  
**Scenario 2:** Given a migration has been applied to a test database, when `make db-rollback` is executed, then the schema should revert to the previous version without data loss.

---

## Story 2.5: Redis Token Bucket Lua Primitives

**Gantt Code:** f4  
**Narrative:** As the **Stock Sync Engineer**, I want to create Redis Lua scripts for atomic token bucket operations with configurable capacity and refill rates, so that channel quota consumption and ATS operations are thread-safe.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a Redis token bucket with capacity=100 and refill_rate=10/s, when `CONSUME(tokens=30)` is called, then 30 tokens should be deducted atomically and remaining should be 70.  
**Scenario 2:** Given a token bucket with remaining=0, after waiting 2 seconds with refill_rate=10/s, then `BALANCE()` should return 20.  
**Scenario 3:** Given 10 concurrent goroutines each calling `CONSUME(tokens=10)` with initial 100 tokens, then exactly 10 should succeed and final balance should be 0.

---

## Story 2.6: Redis Lua Failover & Rate-Limit Fixtures

**Gantt Code:** f4  
**Narrative:** As the **Stock Sync Engineer**, I want to test Redis failover behavior for quota scripts and create test fixtures for rate-limit and token-bucket edge cases, so that quota infrastructure is resilient.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a Redis primary fails during a `CONSUME()` call, when the replica promotes, then the token state should be preserved and no tokens should be lost.  
**Scenario 2:** Given the test fixtures for rate-limit edge cases, when run against the quota infrastructure, then backpressure, 429 handling, and burst consumption should all behave correctly.

---

## Story 2.6b: Auth Token Cache in Redis

**Gantt Code:** f4  
**Narrative:** As the **Stock Sync Engineer**, I want to implement TTL-based access token caching in Redis with automatic expiry, so that channel adapters retrieve valid tokens with low latency without hitting the database on every request.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a valid access_token is stored in Redis with TTL = token_expiry - now, when `GetCachedToken(channel, account_id)` is called, then it should return the cached token. When the TTL has expired, then it should return `nil` and the caller should refresh via the TokenManager.  
**Scenario 2:** Given a token is refreshed and a new token set is stored, when the cache is updated, then the old Redis entry should be overwritten and the new TTL should reflect the new expiry.

---

## Story 2.7: Capability Registry — Field Support Matrix

**Gantt Code:** s2  
**Narrative:** As the **Adapter SDK Engineer**, I want to create the capability registry with per-channel per-operation field support matrix and quota/batch configuration store, so that outbound commands are tailored to each channel's capabilities.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given Shopee supports `title`, `price`, `stock`, `description` for `product_update`, when `GetCapabilities("shopee", "product_update")` is called, then it should return supported fields with `max_batch=50`.  
**Scenario 2:** Given a current capability for Lazada with `max_batch=50`, when updated to `max_batch=100` via REST API, then subsequent queries should return `max_batch=100` and the change should be audited.

---

## Story 2.8: Capability Registry — Writer Ownership & Kill Switches

**Gantt Code:** s2  
**Narrative:** As the **Adapter SDK Engineer**, I want to implement the writer ownership model with kill switches, staged rollout by channel/account/SKU cohort, and certification evidence tracking, so that Phoenix can safely take over writer responsibility from legacy systems.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a channel/cohort marked as `writer=LEGACY`, when an outbound command is generated, then it should be blocked with `WRITER_OWNERSHIP_LEGACY` and logged to the governance topic.  
**Scenario 2:** Given a staged rollout to 10% of SKUs for a channel, when outbound commands are generated, then only the 10% cohort should dispatch and the rest should be skipped.  
**Scenario 3:** Given the kill switch is activated for Shopee, within 60 seconds all Phoenix writes to Shopee should stop.

---

## Story 2.9: RMS Ingestion — Batch & Replay Completion

**Gantt Code:** p1  
**Narrative:** As the **Product Sync Engineer**, I want to complete the RMS ingestion engine with full batch processing, incremental change feed handling, source delay measurement, and integration with the desired-state ledger, so that product data flows reliably from RMS to the product topic.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given 1000 RMS product snapshots in a batch, when the engine processes them, then all should be persisted to PostgreSQL and Product events published to `phoenix.product.v1`.  
**Scenario 2:** Given 5 products changed out of 1000 since the last snapshot, when the incremental change feed is processed, then only 5 Product events should be published, each with delta fields only.  
**Scenario 3:** Given a snapshot for SKU with version=5 already ingested, when replayed, then it should be rejected with `DUPLICATE_EVENT`.

---

## Story 2.9b: Channel Listing Pull — Schema Design & Cross-Reference Prep

**Gantt Code:** p4  
**Narrative:** As the **Product Sync Engineer**, I want to design the channel listing pull schema, cross-reference engine, and match-status data model, so that once channel adapters are available, we can pull existing listings from seller platforms and match them against the RMS product master.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the `channel_listings` table is designed, when inspected, then it should have columns for channel, account_id, listing_id, sku_or_reference, title, price, status, listing_url, fetched_at, and a nullable foreign key reference to the RMS product SKU (null until matched).  
**Scenario 2:** Given the cross-reference engine design, when an RMS product and a channel listing are compared, then the engine should return a match status: `MATCHED` (SKU match + fields in sync), `FIELD_DRIFTED` (SKU match but fields differ), `MISSING_ON_CHANNEL` (RMS product not found on channel), `MISSING_IN_RMS` (channel listing has no RMS counterpart), or `DEACTIVATED_ON_CHANNEL`.  
**Scenario 3:** Given RMS test data and a Shopee simulator returning test listings, when the cross-reference engine processes them, then it should correctly classify each listing status and persist the results to the `channel_listings` table.

**Gantt Code:** r1  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to complete the RMS/LDD price ingestion engine with bulk load, effective-date windows, product/store scope resolution, and replay handling, so that price data flows reliably from RMS/LDD to the price topic.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given 10,000 RMS price records with effective dates, when the engine processes them, then all should be persisted to `product_prices` and Price events published in batches.  
**Scenario 2:** Given a price event that has already been ingested (duplicate source_version), when replayed, then it should be rejected with `DUPLICATE_EVENT`.  
**Scenario 3:** Given a price record with both product-level and store-level scope, when `GetEffectivePrice(sku, store, timestamp)` is called, then the store-level price should take precedence.

---

## Story 2.11: Promotion Business Rules Engine

**Gantt Code:** r2  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to implement the promotion business rules engine with precedence, manual ownership, clubpack multiplication, and rounding, so that promotions are calculated deterministically.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a clubpack promotion with multiplicand=4 and base price=$5.00, when `CalculatePromoPrice()` is called, then the result should be $20.00.  
**Scenario 2:** Given a SKU marked as `pricing_owner=MANUAL` on Lazada, when an RMS price update arrives, then the engine should preserve the manual price and emit a `MANUAL_OVERRIDE_PRESERVED` event.  
**Scenario 3:** Given a UPC is marked with `price_field=MANUAL` for Shopee only, when an RMS price update arrives, then the engine should skip the price up-sync to Shopee but still sync to Lazada, and emit a `MANUAL_FIELD_SKIPPED` event with the channel and field name.

---

## Story 2.12: Promotion Guardrails & Price Quarantine

**Gantt Code:** r2  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to implement price guardrails that quarantine suspicious price changes (drops >50%, increases >10x) and notify operators, so that pricing mistakes do not reach channels.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given a base price of $100.00 and a promotion setting price to $40.00 (60% drop), when evaluated, then the engine should flag it as `QUARANTINED_PRICE_DROP` and not publish until operator review.  
**Scenario 2:** Given a quarantined promotion, when the operator reviews and approves it, then the promotion should be published and the quarantine removed.

---

## Story 2.13: Effective Price Calculation — Base Price + Promotion Combination

**Gantt Code:** r1  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to build the effective price calculation engine that deterministically combines base price with all active promotions at a given business timestamp, so that the final sellable price sent to channels includes promotion effects.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a base price of $100.00 and an active 20%-off promotion, when `CalculateEffectivePrice(sku, store, timestamp)` is called, then the result should be $80.00.  
**Scenario 2:** Given a base price of $100.00 and a fixed-discount promotion of $15.00, when calculated, then the result should be $85.00.  
**Scenario 3:** Given a base price of $100.00 and no active promotion, when calculated, then the result should be $100.00 (base price unchanged).  
**Scenario 4:** Given overlapping promotions with precedence=10 and precedence=20, when calculated, then the higher-precedence promotion (20) should apply to produce the effective price.  
**Scenario 5:** Given a promotion expires at 2026-08-01T00:00:00Z, when `CalculateEffectivePrice()` is called at 2026-08-01T00:00:01Z, then the promotion should no longer apply and the effective price should equal the base price.

---

## Story 2.15: Webhook Intake — Raw Archival, Redis Dedup & Kafka Quorum

**Gantt Code:** o1a  
**Narrative:** As the **Order Sync Engineer**, I want to build the shared push/webhook intake infrastructure with raw payload archival to object storage, Redis fast-path dedup, and Kafka quorum acknowledgement for all push types (order, product, price, stock status), so that all channel adapters use a consistent, durable inbound pipeline returning HTTP 202 immediately.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given an incoming push payload (order webhook, product update notification, or price change event), when the intake pipeline receives it, then the raw payload should be stored in MinIO/S3 with a content-addressable reference and the Kafka event should contain the storage URI.  
**Scenario 2:** Given a valid push payload published to the correct domain topic (`order.ingest.<channel>.v1`, `product.notification.v1`, or `price.notification.v1`), when Kafka producer receives ISR acknowledgement, then the payload should be considered accepted and return HTTP 202.  
**Scenario 3:** Given an incoming push with a duplicate `push_id` already processed within the TTL window (e.g., 5 minutes), when the Redis fast-path dedup check runs, then it should return HTTP 200 (OK, already processed) without archival or Kafka publish.

---

## Story 2.15b: Webhook Message Classifier & Router

**Gantt Code:** o1c  
**Narrative:** As the **Order Sync Engineer**, I want to build the shared webhook message classifier and router that inspects incoming push payloads and routes them to the correct domain Kafka topic, so that downstream domain processors receive type-appropriate messages.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given an incoming push payload from Shopee with topic header `order.created`, when the classifier inspects it, then it should map to canonical event type `ORDER_CREATED` and publish to `order.ingest.shopee.v1`. Given a payload with `product.updated`, it should map to `PRODUCT_UPDATED` and publish to `product.notification.v1`.  
**Scenario 2:** Given an unknown or unmappable push type, when the classifier receives it, then it should route to a dead-letter topic with `UNKNOWN_PUSH_TYPE` and emit a governance event.

---

## Story 2.16: Order Ingestion — Worker Pool Isolation

**Gantt Code:** o1a  
**Narrative:** As the **Order Sync Engineer**, I want to implement worker pool isolation with separate pools for inbound webhooks, polling, and outbound processing, so that backpressure in one path does not block others.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given the inbound webhook pool is saturated with requests, when a polling-based order arrives, then it should be processed by the polling pool without waiting for the webhook pool.  
**Scenario 2:** Given the outbound pool is blocked due to channel API unavailability, when new inbound orders arrive, then they should be accepted and queued without being blocked by the outbound backpressure.

---

## Story 2.17: Admin UX Flows & Role Definitions

**Gantt Code:** a1  
**Narrative:** As the **Adapter SDK Engineer** (supporting Admin Portal), I want to define operator roles (Viewer, Operator, Admin, Super-Admin) and screen navigation hierarchy with permission boundaries, so that the Admin Portal is built on a secure authorization model.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given roles Viewer, Operator, Admin, Super-Admin, when the role matrix is reviewed, then each role should have clearly defined screen access and executable actions.  
**Scenario 2:** Given an Operator role user, when they log into the Admin Portal, then they should see Order Monitoring, Mapping Upload, and Dashboard, but NOT User Management or System Configuration.

---

## Story 2.18: Admin Audit Trail & Retry Authorization

**Gantt Code:** a1  
**Narrative:** As the **Adapter SDK Engineer** (supporting Admin Portal), I want to implement the immutable audit trail for all state-changing actions and retry authorization rules including two-person approval model, so that the Admin Portal meets governance requirements.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given an Operator triggers a manual retry, when the action is executed, then an immutable audit record should be created with user, action, timestamp, scope, and previous state.  
**Scenario 2:** Given a retry action requires two-person approval, when the first Operator initiates it, then it should be held for approval and only execute after the second Operator approves.

---

## Story 2.19: Stock Service Ingestion Design & Movement Identity

**Gantt Code:** i1  
**Narrative:** As the **Stock Sync Engineer**, I want to design the Stock Service ingestion engine that consumes uniquely-identified stock movements and appends them to an ordered ledger, so that ATS calculation has a reliable, replayable event source.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a stock movement with unique `movement_id="M001"`, `sku="TENT-01"`, `store="S001"`, `delta=-5`, when ingested, then a new row should be appended to the `stock_movements` ledger with auto-incrementing sequence per store+SKU.  
**Scenario 2:** Given movement_id="M001" was already ingested, when the same movement_id arrives again, then it should be rejected with `DUPLICATE_MOVEMENT`.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 2.1 Dependency Contracts Finalized | m3 | TL | QA-02 | - | Jul 17 |
| 2.2 K8s Staging & Observability Start | f1, f5 | DEV-01 | QA-01 | 4 | Jul 19 |
| 2.3 Kafka Producer/Consumer Library | f2 | DEV-02 | QA-02 | 5 | Jul 17 |
| 2.4 PostgreSQL Read-Models & Finalize | f3 | DEV-02 | QA-02 | 4 | Jul 18 |
| 2.5 Redis Token Bucket Lua Primitives | f4 | DEV-09 | QA-05 | 4 | Jul 17 |
| 2.6 Redis Lua Failover & Rate-Limit Fixtures | f4 | DEV-09 | QA-05 | 3 | Jul 19 |
| 2.6b Auth Token Cache in Redis | f4 | DEV-09 | QA-05 | 2 | Jul 21 |
| 2.7 Capability Registry — Field Support Matrix | s2 | DEV-04 | QA-02 | 5 | Jul 18 |
| 2.8 Capability Registry — Writer Ownership & Kill Switches | s2 | DEV-04 | QA-02 | 5 | Jul 22 |
| 2.9 RMS Ingestion — Batch & Replay | p1 | DEV-05 | QA-03 | 5 | Jul 22 |
| 2.9b Channel Listing Pull — Schema & Cross-Reference Prep | p4 | DEV-05 | QA-03 | 3 | Jul 24 |
| 2.10 RMS/LDD Price Ingestion Complete | r1 | DEV-06 | QA-03 | 5 | Jul 22 |
| 2.11 Promotion Business Rules Engine | r2 | DEV-06 | QA-03 | 3 | Jul 16 |
| 2.12 Promotion Guardrails & Quarantine | r2 | DEV-06 | QA-03 | 2 | Jul 17 |
| 2.13 Effective Price Calculation (Base + Promotion) | r1 | DEV-06 | QA-03 | 4 | Jul 22 |
| 2.15 Webhook Intake — Archival, Dedup & Kafka Quorum | o1a | DEV-07 | QA-04 | 4 | Jul 18 |
| 2.15b Webhook Message Classifier & Router | o1c | DEV-07 | QA-04 | 3 | Jul 22 |
| 2.16 Order Ingestion — Worker Pool Isolation | o1a | DEV-07 | QA-04 | 2 | Jul 19 |
| 2.17 Admin UX Flows & Role Definitions | a1 | DEV-04 | QA-06 | 4 | Jul 18 |
| 2.18 Admin Audit Trail & Retry Authorization | a1 | DEV-04 | QA-06 | 3 | Jul 24 |
| 2.19 Stock Ingestion Design & Movement Identity | i1 | DEV-09 | QA-03 | 4 | Jul 24 |
