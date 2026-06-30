# Sprint 01 Plan — Mobilization & Foundation Kickoff

**Sprint:** 2026-06-29 to 2026-07-10 (10 working days)  
**Team:** 7 Developers + 1 QA + TL (ramps to 9 Dev + 2 QA by Jul 6)  
**Theme:** Scope lock, architecture adoption, canonical contracts, DevOps bootstrap, Kafka/PostgreSQL design

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | Scope lock, architecture ADRs, NFR targets, dependency discovery, contract alignment |
| DEV-01 | DevOps/Platform | Kubernetes/GitOps environment bootstrap, observability foundation |
| DEV-02 | Backend Foundation | Kafka topic topology, PostgreSQL schema design, migration tooling |
| DEV-03 | Contracts & Schema | Canonical Protobuf schemas (all domains), error taxonomy, idempotency strategy |
| DEV-04 | Adapter SDK | SDK skeleton: HTTP client, auth interface, retry taxonomy, telemetry stubs |
| DEV-05 | Product Sync | Product domain model, RMS data model design (*joins Jul 6*) |
| DEV-06 | Price & Promotion | Price/promotion domain model, R10/LDD data model design (*joins Jul 6*) |
| DEV-07 | Order Sync | Order domain model, fulfilment data model design |
| DEV-09 | Stock Sync | Stock domain model, ATS data model design |
| QA-01 | QA Lead | Test strategy, fixture design, acceptance criteria validation |
| QA-02 | Contract QA | Contract validation tests, test data builders (*joins Jul 6*) |

---

## Story 1.1: Kickoff, Scope Lock & Delivery Governance

**Gantt Code:** m1  
**Narrative:** As the **Tech Lead**, I want to lock the delivery scope with agreed exclusions, decision ownership, sprint cadence, release gates, and fallback rules, so that the team has clear boundaries and escalation paths.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the enterprise stakeholders, Product Owner, and Tech Lead, when the kickoff session concludes, then the scope boundary document should list included domains, channels, and explicitly excluded features and be signed off by all parties.  
**Scenario 2:** Given the delivery team, when sprint planning is established, then sprint duration should be fixed at 2 weeks and release gates should have defined pass/fail criteria.

---

## Story 1.2a: Architecture ADRs

**Gantt Code:** m2  
**Narrative:** As the **Tech Lead**, I want to publish implementation ADRs covering service boundaries, topic/schema conventions, partition strategy, and retry/DLQ topology, so that all workstreams build from consistent technical decisions.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the approved architecture diagrams, when architecture adoption is complete, then ADRs should cover service boundaries, topic naming conventions, schema compatibility rules, partition strategy, and retry/DLQ topology.  
**Scenario 2:** Given the ADRs are drafted, when reviewed by at least 2 senior developers, then all feedback should be resolved before the ADRs are finalized.

---

## Story 1.2b: NFR Confirmation & Test Targets

**Gantt Code:** m2  
**Narrative:** As the **Tech Lead**, I want to confirm NFR test targets and sizing assumptions for order acceptance latency, stock update latency, price sync latency, and duplicate outcome tolerance, so that engineering teams have measurable SLOs.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the architecture sizing assumptions, when NFR confirmation is complete, then documented targets should exist for order acceptance latency (p99 ≤ 250ms), stock update latency (p95 ≤ 60s), and price sync latency (p95 ≤ 5min).  
**Scenario 2:** Given the NFR targets, when reviewed with QA, then each target should have a defined measurement method and pass/fail criteria.

---

## Story 1.3: External Dependency Contract Discovery

**Gantt Code:** m3  
**Narrative:** As the **Tech Lead** with domain engineers, I want to confirm contract owners, quotas, payload samples, and error codes for RMS, R10/LDD, Stock Service, and WMS/MFC, so that domain teams have real enterprise contracts to design against.  
**Story Points:** n/a (ongoing discovery, no fixed SP)

### Acceptance Criteria
**Scenario 1:** Given the RMS enterprise owner is engaged, when samples are requested, then at least one snapshot and one change-feed payload should be received, and the versioning strategy should be documented.  
**Scenario 2:** Given the R10/LDD enterprise owner is engaged, when samples are requested, then at least one regular price and one promotion payload should be received, and the timezone handling convention should be confirmed.

---

## Story 1.4a: Canonical Domain Schemas (Product & Price)

**Gantt Code:** m4  
**Narrative:** As the **Contracts Engineer**, I want to define canonical Protobuf schemas for Product and Price/Promotion domains with versioning and compatibility rules, so that product and price services have stable, evolvable contracts.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the Proto definitions in `proto/phoenix/product/v1/` and `proto/phoenix/price/v1/`, when `make proto-gen` is executed, then all `.proto` files should compile to valid Go types and pass `go build ./...`.  
**Scenario 2:** Given the Product schema with SKU, title, description, attributes, status, version, when a product is serialized and deserialized, then all fields should round-trip correctly and the version should be preserved.  
**Scenario 3:** Given a new optional field added to the schema, when a backward-compatibility check runs, then old serialized data should deserialize without error.

---

## Story 1.4b: Canonical Schemas (Stock, Order, Fulfilment) + Fixtures

**Gantt Code:** m4  
**Narrative:** As the **Contracts Engineer**, I want to define canonical Protobuf schemas for Stock, Order, and Fulfilment domains and create canonical test fixtures, so that remaining domain teams have stable contracts and test data.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the Proto definitions for Stock, Order, and Fulfilment, when `make proto-gen` is executed, then all schemas should compile to Go types with correct field mappings.  
**Scenario 2:** Given an Order fixture built with `NewOrderBuilder().WithChannel("shopee").WithLineItems(3).Build()`, when validated, then all required fields should have non-zero values and validation should pass.  
**Scenario 3:** Given fully-populated fixtures for each domain schema, when serialized to protobuf binary and deserialized, then the deserialized object should match the original field-by-field.

---

## Story 1.5a: Kubernetes Cluster & CI Pipeline

**Gantt Code:** f1  
**Narrative:** As the **DevOps Engineer**, I want to provision the Kubernetes dev cluster with GitOps and set up the CI pipeline that builds, lints, tests, and containerizes Go services, so that every service can be deployed from a single pipeline.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given infrastructure-as-code repository, when `terraform apply` is executed, then the dev namespace should exist with resource quotas and ArgoCD/Flux should sync from the Git repository.  
**Scenario 2:** Given a sample Go service with a Dockerfile, when commits are pushed to a feature branch, then the CI pipeline should build, lint, test, and push a container image tagged with the commit SHA.

---

## Story 1.5b: Deployment Manifests & Progressive Delivery

**Gantt Code:** f1  
**Narrative:** As the **DevOps Engineer**, I want to create Helm chart templates and deployment manifests for all service types with progressive delivery (rolling update, health checks, resource limits), so that services deploy safely with zero-downtime rollouts.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a Helm chart for a Go microservice, when deployed to the dev namespace, then the pod should start with correct resource limits, readiness probe, and liveness probe.  
**Scenario 2:** Given a new version of the service is deployed, when the rolling update executes, then zero downtime should occur and the old pods should terminate only after new pods are healthy.

---

## Story 1.5c: Environment Promotion Pipeline

**Gantt Code:** f1  
**Narrative:** As the **DevOps Engineer**, I want to implement the dev→staging→prod environment promotion pipeline with GitOps and rollback capability, so that changes flow through environments with approval gates.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a passing CI build on the main branch, when the GitOps controller detects the change, then the staging namespace should receive the updated image and the rollout should complete within 5 minutes.  
**Scenario 2:** Given a failed deployment in staging, when the rollback is triggered, then the previous stable version should be restored within 2 minutes.

---

## Story 1.6a: Kafka Topic Creation & Schema Registry

**Gantt Code:** f2  
**Narrative:** As the **Backend Foundation Engineer**, I want to create the Kafka topic topology with correct partitioning, replication, and schema registry integration for all domains, so that domain teams have a durable event backbone.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the Kafka cluster is running, when `make kafka-topics` executes, then topics for product, price, stock, order, fulfilment, and sync-result should exist with 6 partitions and replication-factor 3.  
**Scenario 2:** Given each domain topic `phoenix.{domain}.v1`, when the topology is verified, then `phoenix.{domain}.v1-retry` and `phoenix.{domain}.v1-dlq` should also exist with matching partition count.  
**Scenario 3:** Given a Protobuf schema registered for a topic, when a message with an incompatible schema is produced, then the schema registry should reject it.

---

## Story 1.6b: Kafka Producer/Consumer Conventions & Dashboards

**Gantt Code:** f2  
**Narrative:** As the **Backend Foundation Engineer**, I want to implement shared Go producer/consumer wrappers with retry/DLQ routing and operational dashboards, so that domain services have safe, observable event publishing patterns.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a Go producer using the shared library, when a Protobuf message is published, then the schema should be auto-registered (if new) or validated (if existing), and the message should include the partition key.  
**Scenario 2:** Given a message processing fails with `PermanentError`, when the consumer handles it, then it should route to the `-dlq` topic, and when it fails with `TransientError`, it should route to the `-retry` topic with delivery delay.  
**Scenario 3:** Given the Kafka dashboard is deployed, when a consumer group lags, then the dashboard should display lag per partition and trigger an alert if lag exceeds 1000 messages.

---

## Story 1.7a: PostgreSQL Domain Table Migrations

**Gantt Code:** f3  
**Narrative:** As the **Backend Foundation Engineer**, I want to create PostgreSQL migration scripts for all domain tables (products, prices, stock movements, orders, idempotency keys, sync ledger) with proper indexes and foreign keys, so that domain services can persist state.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the migration directory with up/down scripts, when `make db-migrate` is executed, then tables for products, product_prices, stock_movements, orders, order_lines, idempotency_keys, and sync_ledger should exist with primary keys and indexes.  
**Scenario 2:** Given a migration has been applied, when `make db-rollback` is executed, then the schema should revert to the previous version without data loss for pre-existing tables.

---

## Story 1.7b: Order Partitions, Audit Tables & Read-Model Views

**Gantt Code:** f3  
**Narrative:** As the **Backend Foundation Engineer**, I want to implement monthly time partitions for orders, audit trail tables, idempotency key expiration, and read-model views for Admin Portal queries, so that operational screens do not overload transactional tables.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the `orders` table DDL with monthly partitions, when inspected, then it should have CHECK constraints per month and a `CREATE TABLE orders_y2026m07 PARTITION OF orders` template.  
**Scenario 2:** Given the `idempotency_keys` table with `created_at`, when a key is older than 90 days, then the cleanup job should delete it without blocking writes.  
**Scenario 3:** Given the read-model views for order search and product sync status, when an Admin Portal query runs, then it should read from materialized views without scanning transactional tables.

---

## Story 1.8a: Adapter SDK — Auth Interface & Retry Taxonomy

**Gantt Code:** s1  
**Narrative:** As the **Adapter SDK Engineer**, I want to create the shared adapter SDK with the `AuthProvider` interface and configurable `Retrier` with exponential backoff and retry classification, so that channel adapters have consistent auth and retry mechanics.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the `AuthProvider` interface with `SignRequest(req *http.Request) error`, when implementations exist for `ShopeeHMACProvider` and `LazadaOAuthProvider`, then both should satisfy the interface and inject correct auth headers.  
**Scenario 2:** Given a `Retrier` configured with max=3 and backoff=100ms, when a request fails with `PermanentError`, then the retrier should return immediately without retrying, and when it fails with `TransientError`, then it should retry with exponential backoff (100ms, 200ms, 400ms).  
**Scenario 3:** Given the retry taxonomy supports immediate, deferred, and permanent classifications, when an error is created with code `CHANNEL_QUOTA_EXCEEDED`, then `RetryClass()` should return `Deferred`.

---

## Story 1.8b: Adapter SDK — Circuit Breaker, Quota & Telemetry

**Gantt Code:** s1  
**Narrative:** As the **Adapter SDK Engineer**, I want to implement the circuit breaker per endpoint, distributed quota integration with Redis, and telemetry publishing of adapter result events to Kafka, so that channel adapters have safe, observable outbound mechanics.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given a `CircuitBreaker` with threshold=5 and half-open timeout=30s, when 5 consecutive requests fail, then subsequent requests should fail-fast with `ErrCircuitOpen`, and after 30s the first request should be allowed as a probe.  
**Scenario 2:** Given a `QuotaAwareTransport` configured with 100 requests/min, when a request exceeds the quota, then it should be queued and dispatched in the next window.  
**Scenario 3:** Given a completed adapter SDK call (success or failure), when the result is published, then a `SyncResult` event should be produced to `phoenix.sync.result.v1` with status, latency, and error code.

---

## Story 1.9a: RMS Snapshot Ingestion

**Gantt Code:** p1  
**Narrative:** As the **Product Sync Engineer**, I want to implement RMS snapshot ingestion that parses enterprise snapshots into canonical Product protobufs and persists them to PostgreSQL, so that the product master is available in Phoenix.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given an RMS sample snapshot payload with known fields, when the ingestion engine parses it, then it should produce a valid canonical Product with all mapped fields populated and the source_version extracted.  
**Scenario 2:** Given 1000 RMS product snapshots in a batch, when the engine processes them, then all should be persisted to PostgreSQL and Product events published to `phoenix.product.v1`.

---

## Story 1.9b: Product Delta Engine & Replay Handling

**Gantt Code:** p1  
**Narrative:** As the **Product Sync Engineer**, I want to implement the product delta engine that computes insert/update/deactivate/unchanged decisions from version comparison and handles replay safety, so that only changed products produce events.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given an existing product with version=5, when a snapshot with version=3 arrives, then it should be rejected with `STALE_SOURCE_VERSION` and no event published.  
**Scenario 2:** Given 5 products changed out of 1000, when the incremental change feed is processed, then only 5 Product events should be published, each containing only the changed fields.  
**Scenario 3:** Given a snapshot for SKU with version=5 was already ingested, when the same snapshot is replayed, then it should be rejected with `DUPLICATE_EVENT` and no duplicate event published.

---

## Story 1.10a: R10/LDD Price Ingestion & Timezone Normalization

**Gantt Code:** r1  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to implement effective-dated price ingestion from R10/LDD with UTC timezone normalization and overlapping promotion detection, so that price data has a correct time-aware history.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given an R10 event with `effective_start: "2026-07-15T08:00:00+07:00"`, when normalized, then the stored `effective_start` should be `2026-07-15T01:00:00Z`.  
**Scenario 2:** Given 10,000 R10 price records with effective dates, when the engine processes them, then all should be persisted to the `product_prices` table and Price events published in batches.  
**Scenario 3:** Given a promotion with `effective_start=2026-08-01`, when queried at `2026-07-15`, then `IsEffectiveAt()` should return false.

---

## Story 1.10b: Promotion Precedence & Overlap Resolution

**Gantt Code:** r1  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to implement promotion overlap resolution with precedence ordering and product/store scope resolution, so that the correct promotion applies at any point in time.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given two promotions for the same SKU with overlapping date ranges and different precedence values, when both are stored, then `BestEffectivePrice(sku, timestamp)` should return the higher-precedence promotion.  
**Scenario 2:** Given a promotion with a product-level scope and another with store-level scope, when the engine resolves scope, then the more specific scope should take precedence within its applicable boundaries.

---

## Story 1.11a: Canonical Test Fixture Builders

**Gantt Code:** m4  
**Narrative:** As the **QA Engineer**, I want to create builder-pattern test fixtures for all domain schemas with sensible defaults, so that domain and adapter tests use consistent, maintainable test data.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a `NewProductBuilder().WithSKU("TEST-001").WithStatus(Status_ACTIVE).Build()`, when the fixture is validated, then all required fields should have non-zero values and validation should pass.  
**Scenario 2:** Given builders for Product, Price, Stock, Order, and Fulfilment, when each is used with minimal overrides, then all should produce valid, realistic domain objects.

---

## Story 1.11b: Contract Round-Trip & Validation Tests

**Gantt Code:** m4  
**Narrative:** As the **QA Engineer**, I want to create automated contract validation tests that verify protobuf serialization round-trips and schema constraints for all domains, so that contract regressions are caught by CI.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a fully-populated fixture for each domain schema, when serialized to protobuf binary and deserialized, then the deserialized object should match the original field-by-field and the byte representation should be deterministic.  
**Scenario 2:** Given a Product instance with an empty SKU, when `ValidateProduct()` is called, then it should return a validation error with code `INVALID_SKU`.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 1.1 Kickoff & Scope Lock | m1 | TL | QA-01 | 4 | Jul 01 |
| 1.2a Architecture ADRs | m2 | TL | QA-01 | 4 | Jul 07 |
| 1.2b NFR Confirmation & Targets | m2 | TL | QA-01 | 4 | Jul 10 |
| 1.3 Dependency Discovery | m3 | TL | QA-02 | - | ongoing |
| 1.4a Canonical Schemas (Product & Price) | m4 | DEV-03 | QA-02 | 5 | Jul 07 |
| 1.4b Canonical Schemas (Stock, Order, Fulfilment) + Fixtures | m4 | DEV-03 | QA-02 | 5 | Jul 10 |
| 1.5a K8s Cluster & CI Pipeline | f1 | DEV-01 | QA-01 | 4 | Jul 07 |
| 1.5b Deployment Manifests & Progressive Delivery | f1 | DEV-01 | QA-01 | 4 | Jul 09 |
| 1.5c Environment Promotion Pipeline | f1 | DEV-01 | QA-01 | 3 | Jul 10 |
| 1.6a Kafka Topics & Schema Registry | f2 | DEV-02 | QA-02 | 5 | Jul 07 |
| 1.6b Producer/Consumer Conventions & Dashboards | f2 | DEV-02 | QA-02 | 5 | Jul 10 |
| 1.7a PostgreSQL Domain Table Migrations | f3 | DEV-02 | QA-02 | 4 | Jul 09 |
| 1.7b Order Partitions, Audit & Read-Models | f3 | DEV-02 | QA-02 | 4 | Jul 10 |
| 1.8a SDK Auth Interface & Retry Taxonomy | s1 | DEV-04 | QA-02 | 5 | Jul 08 |
| 1.8b SDK Circuit Breaker, Quota & Telemetry | s1 | DEV-04 | QA-02 | 5 | Jul 10 |
| 1.9a RMS Snapshot Ingestion | p1 | DEV-05 | QA-03 | 3 | Jul 10 |
| 1.9b Product Delta Engine & Replay | p1 | DEV-05 | QA-03 | 3 | Jul 10 |
| 1.10a R10/LDD Price Ingestion & Timezone | r1 | DEV-06 | QA-03 | 4 | Jul 09 |
| 1.10b Promotion Precedence & Overlap | r1 | DEV-06 | QA-03 | 4 | Jul 10 |
| 1.11a Test Fixture Builders | m4 | QA-02 | QA-02 | 3 | Jul 09 |
| 1.11b Contract Round-Trip Tests | m4 | QA-02 | QA-02 | 3 | Jul 10 |
