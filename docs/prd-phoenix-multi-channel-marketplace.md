# Phoenix Multi-Channel Marketplace — Product Requirements Document

**Document status:** Draft for sponsor, Product, Engineering, Operations, Security, and enterprise-integration review  
**Version:** 1.0  
**Date:** 2026-06-23  
**November business go-live:** 2026-11-01  
**Technical cutover target:** 2026-10-30  
**Primary source:** [`phoenix-november-1-2026-milestone-proposal.md`](phoenix-november-1-2026-milestone-proposal.md)  
**Architecture baseline:** [`phoenix-target-architecture-250-ops.md`](phoenix-target-architecture-250-ops.md)  
**Roadmap baseline:** [`phoenix-multi-channel-marketplace-proposal.md`](phoenix-multi-channel-marketplace-proposal.md)

## 1. Purpose and reading guide

This PRD defines Phoenix Multi-Channel Marketplace as both:

1. A tightly bounded production MVP for November 1, 2026.
2. A multi-phase commerce-control platform that can progressively assume stock, catalog, order-lifecycle, mart-channel, and operational-intelligence responsibilities.

The distinction is deliberate. A requirement marked **NOV-1** is required for the November milestone. A requirement marked **LATER** is not part of the November commitment and requires separate funding, planning, and acceptance. A requirement marked **FOUNDATION** is implemented in November only to the minimum depth required to operate the MVP safely and is extended later.

| Marker | Meaning | November commitment |
|---|---|---|
| **NOV-1** | Production functionality required for the November milestone | Yes, subject to channel readiness gates |
| **FOUNDATION** | Shared capability delivered at MVP depth and designed for extension | Yes, at explicitly stated MVP depth |
| **LATER-P2** | Stock correctness and full order lifecycle | No |
| **LATER-P3** | Full catalog and seller-center capability | No |
| **LATER-P4** | Dynamic allocation and mart-channel scale | No |
| **LATER-P5** | Advanced operational intelligence and optimization | No |
| **LATER-P6** | Scoped legacy decommission | No |

Where this PRD conflicts with an implementation detail, the business scope and acceptance criteria in this PRD take precedence; architecture decisions must still satisfy the approved non-functional requirements.

## 2. Executive summary and strategic “why”

### 2.1 Business problem

The current marketplace estate is dominated by batch-oriented .NET workloads and a tightly coupled SQL Server data model. It carries valuable business knowledge but creates recurring operational problems:

- Large product, price, promotion, and stock jobs compete for shared resources.
- Double-date campaign changes create concentrated midnight demand that is difficult to drain before launch deadlines.
- A slow or failing marketplace API can delay unrelated channels.
- Full-table and repeated updates waste scarce marketplace API quota.
- Operators cannot reliably separate source delay, Phoenix/legacy processing delay, and seller-platform delay.
- Failure recovery depends too heavily on manual investigation and job reruns.
- Duplicate or parallel writers create a risk of conflicting external state.
- Adding a channel requires rediscovering integration behavior embedded in old adapters.
- The current platform does not provide a dependable foundation for real-time ATS, reservations, or dynamic stock allocation.

The problem is therefore not simply infrastructure cost. It is lost campaign readiness, oversell exposure, slow recovery, limited channel agility, and high operational effort.

### 2.2 Opportunity

Phoenix creates one governed control plane for six marketplace channels:

- Shopee
- Lazada
- TikTok
- WeChat
- Amaze
- Makro Pro

The commercial opportunity is to make the existing assortment more consistently available, correctly priced, campaign-ready, and orderable across all supported channels. Phoenix does not manufacture demand; it removes technical causes that prevent the business from capturing demand already available through those channels.

Expected value levers are:

- More eligible SKUs synchronized before campaign deadlines.
- Fewer missed or incorrectly priced campaign listings.
- Faster recovery from marketplace and integration failures.
- Lower manual reconciliation and rerun effort.
- Reduced blast radius when one channel is unhealthy.
- Faster onboarding of future marketplace and mart channels.
- Later reduction of overselling through real-time ATS and reservations.
- Later improvement of sell-through through demand-aware allocation.

No unvalidated revenue number is committed in this PRD. Before go-live, Product and Finance must baseline campaign GMV at risk, failed-SKU rate, oversell cost, manual support effort, cancellation rate, and channel-specific lost-availability time so benefits can be measured credibly.

### 2.3 Strategic objective

The November release follows a **breadth-first MVP** strategy:

> Establish Phoenix as a production-grade, event-driven control plane across six marketplace channels for updates to existing mapped products, price/promotion synchronization, and inbound order synchronization—without attempting complete seller-center, inventory, or fulfilment parity.

Breadth-first means the first release proves common contracts, channel isolation, operability, reconciliation, and safe migration across the requested channel portfolio. Depth is deliberately deferred where it would threaten the date.

### 2.4 November product promise

By November 1, Phoenix will:

- Synchronize agreed attributes for existing mapped product listings.
- Synchronize regular price and promotion changes using approved Auto/Manual and clubpack rules.
- Receive marketplace orders through bidirectional channel adapters using webhooks where supported and overlap-safe polling otherwise.
- Durably accept raw orders into Kafka before acknowledgement.
- Normalize, validate, deduplicate, persist, and asynchronously hand accepted orders to the existing fulfilment estate.
- Provide retries, DLQ handling, replay, reconciliation, feature flags, writer controls, and operational dashboards.
- Support Shopee, Lazada, and TikTok as Wave 1 committed channels.
- Support WeChat, Amaze, and Makro Pro in production only when their readiness gates pass; otherwise operate them in shadow/dry-run under the pre-approved fallback.

### 2.5 What November does not promise

The November release does not promise real-time stock accuracy, oversell prevention, new listing creation, complete order-status/AWB workflows, mart channels, WMS replacement, BI, or advanced optimization. These are separately funded later phases described in detail in Section 15.

## 3. Product vision, principles, and success measures

### 3.1 Vision

Phoenix is the provider-neutral commerce control plane that keeps enterprise product, price, promotion, stock, and order intent synchronized with external selling channels through durable events, explicit desired state, channel-isolated adapters, and operator-visible outcomes.

### 3.2 Product principles

1. **Never lose an accepted order.** A webhook is acknowledged only after Kafka quorum commit.
2. **Send intent, not repeated noise.** Delta detection and desired-version coalescing prevent unnecessary external calls.
3. **One writer per scope.** Phoenix and legacy cannot write the same domain/channel/cohort simultaneously.
4. **Channels fail independently.** One channel outage must not stop another.
5. **Quotas are business constraints.** More pods cannot bypass an external API contract.
6. **Every outcome is explainable.** Operators can trace source, decision, attempt, response, and final state.
7. **Business correctness precedes speed.** Invalid prices, mappings, transitions, and duplicates are quarantined rather than forced through.
8. **Replay is designed, not improvised.** Events, payload evidence, idempotency, and ledgers support safe deterministic recovery.
9. **WMS remains external.** Phoenix owns integration and commerce state, not warehouse execution.
10. **Shared libraries provide mechanics.** Channel-specific behavior remains isolated in each adapter.

### 3.3 Outcome metrics

| Outcome | November target | Later target |
|---|---:|---:|
| Valid mapped product deltas reaching acknowledged or terminal classified state | ≥99.5% | ≥99.9% with automated drift repair |
| Duplicate business outcomes for same order/version | 0 | 0 |
| Accepted orders lost after Kafka acknowledgement | 0 | 0 |
| Price/promotion changed-SKU acceptance | p95 ≤5 minutes when quota envelope permits | Predictive campaign readiness and automated protection |
| Order visibility | p99 ≤3 seconds | Same while reservation/status depth increases |
| Channel-isolation incidents | No cross-channel stoppage caused by one seller outage | Automated isolation and recovery recommendations |
| Campaign backlog visibility | 100% by channel, priority, and deadline | Forecast and risk score before execution |
| Oversell caused by internal stock latency | Not solved in November; baseline only | Near zero after Phase 2, excluding seller/platform delay |
| Manual reconciliation effort | Baseline and reduce | Progressive reduction through drift repair and automation |

## 4. Personas and jobs to be done

### 4.1 E-Commerce and Campaign Manager

**Goals**

- Know whether mapped products, prices, and promotions will be accepted before a campaign deadline.
- Understand which SKUs are blocked and why.
- Prevent a suspicious price or expired promotion from reaching a seller channel.
- Activate or stop a channel/cohort safely without engineering intervention.

**November needs**

- Campaign backlog and estimated drain time.
- Desired-versus-acknowledged status by SKU and channel.
- Auto/Manual, clubpack, effective-date, and override visibility.
- Approval-aware override and kill-switch controls.

**Later needs**

- Stock readiness, campaign risk score, predictive allocation, digital-twin rehearsal, and promotion guardrails.

### 4.2 Marketplace Operations Specialist

**Goals**

- Resolve mapping, validation, platform, and order exceptions quickly.
- Replay only safe events after remediation.
- Reconcile channel state without spreadsheets and ad-hoc database queries.

**November needs**

- Search by channel, account, SKU, order, correlation ID, and error class.
- Operations cases with owner, reason, age, attempts, and next action.
- Controlled retry/replay with audit trail.
- Writer ownership and feature-flag visibility.

### 4.3 Operations/Support Engineer and SRE

**Goals**

- Determine whether an incident originates in an enterprise source, Phoenix, or a seller platform.
- Protect paid orders and campaign-critical traffic during degradation.
- Roll back a bad adapter without affecting other channels.

**November needs**

- Queue age, Kafka health, API quota, success/error classes, circuit state, and platform wait time.
- Per-channel kill switches and canary rollback.
- Runbooks for replay, DLQ, cutover, and failover.

### 4.4 Merchandising/Product Data Steward

**Goals**

- Maintain trustworthy enterprise-to-seller SKU mappings.
- Understand why a product update was skipped.
- Prevent inactive, incomplete, or unmapped products from creating unsafe writes.

### 4.5 Fulfilment Integration Owner

**Goals**

- Receive one idempotent accepted-order hand-off.
- Reject malformed or unsupported orders with a stable reason.
- Provide status events later without exposing WMS internals to Phoenix.

### 4.6 Security and Compliance Reviewer

**Goals**

- Ensure credentials and customer PII are protected.
- Trace privileged actions and data access.
- Verify software supply-chain and runtime controls before production.

### 4.7 Marketplace API as a system persona

Each seller channel behaves like a strict external actor with its own authentication, payload rules, endpoint semantics, error taxonomy, quota scope, batch size, maintenance windows, webhook behavior, and certification process.

The provisional planning constraint is 100 requests/minute per unconfirmed seller quota scope, with 80 requests/minute for normal work and 20 reserved for urgent/retry work. This is not assumed to be a certified Shopee, Lazada, or other channel limit until contract discovery confirms it.

### 4.8 Enterprise systems as system personas

RMS, RMS/LDD, Stock Service, WMS/MFC, DHL, and Auto POS have independent rate, concurrency, retry, and contract constraints. Dedicated connector/rate-limiter workloads protect each dependency. The MFC value of 300 requests/hour is a working example pending confirmation, not a universal enterprise quota.

## 5. Scope boundary: the line in the sand

### 5.1 November in scope

| Domain | November capability |
|---|---|
| Product | RMS ingestion, versioned deltas, existing seller-SKU mapping, agreed attribute updates, inactive handling, reconciliation |
| Price/promotion | RMS/LDD ingestion, regular/promotion calculation, dates, Auto/Manual, override, clubpack, delta sync, quota-aware scheduling |
| Orders | Adapter webhook/poll ingress, raw archival, Kafka acceptance, canonical normalization, idempotency, persistence, cancellation-before-acceptance, fulfilment hand-off |
| Channels | Shopee, Lazada, TikTok; WeChat, Amaze, Makro Pro conditional on gates |
| Operations | Search, queue and SLA views, errors, DLQ, replay, reconciliation, kill switches, feature flags, writer ownership, audit |
| Platform | Kafka, PostgreSQL ledgers and monthly OMS partitions, object storage, rate-counter/cache Redis, telemetry, Kubernetes delivery controls |

### 5.2 Explicit November exclusions

- Real-time ATS and production Redis inventory state.
- Stock reservation, release, expiry, safety stock, and allocation.
- Stock synchronization to seller channels.
- Brand-new listing creation.
- Category discovery, seller category onboarding, and category-specific attribute authoring.
- Image/video transformation and media synchronization.
- Campaign, voucher, bundle-deal, add-on-deal, or advertising creation inside seller platforms.
- Full order-status/AWB state machines.
- Split fulfilment and package orchestration.
- Auto POS capture unless minimal reuse is explicitly approved without displacing committed scope.
- Shopee Mart, LINE MAN Mart, Grab Mart, and Hato Mart.
- WMS screens and operations, including receiving, IBT, picking, packing, printing, AWB generation, pallet, truck, and warehouse task management.
- ClickHouse, analytical warehouse migration, BI, management reporting, and ad-hoc analytics.
- AI optimization or autonomous remediation.

### 5.3 Scope governance

- Scope additions after July 3 require an equal or larger removal.
- A conditional channel that misses a gate moves to shadow scope; testing is not compressed.
- Product update must not be reinterpreted as full listing lifecycle.
- Order synchronization must not be represented as solved oversell prevention.
- Operational dashboards are in scope; executive analytics and BI are not.
- Any change to a requirement marked NOV-1 requires Product Owner, Tech Lead, QA, and sponsor impact review.

## 6. November functional requirements by domain

### 6.1 Product synchronization MVP

#### Operating model

RMS snapshots or changes are accepted through the enterprise connector boundary and archived. The product service compares the new version with the last accepted enterprise state, emits only meaningful deltas, resolves each enterprise product to existing seller listings, validates update eligibility, and creates desired-state commands for each enabled channel. Channel adapters transform those commands into seller-specific requests and record acknowledgements or classified failures.

#### Requirements

| ID | Requirement | Phase |
|---|---|---|
| PROD-001 | Ingest RMS snapshots or change feeds with source version, extraction time, checksum, and immutable payload reference | NOV-1 |
| PROD-002 | Compute insert, update, deactivate, and unchanged decisions deterministically | NOV-1 |
| PROD-003 | Suppress outbound commands when the effective seller-facing state has not changed | NOV-1 |
| PROD-004 | Resolve enterprise PLU/SKU to channel, account, seller SKU, listing ID, and mapping version | NOV-1 |
| PROD-005 | Update only existing mapped listings and only the essential attributes approved in the channel capability matrix | NOV-1 |
| PROD-006 | Reject or quarantine unmapped, ambiguous, inactive, incomplete, and unsupported updates with stable reason codes | NOV-1 |
| PROD-007 | Preserve Auto/Manual ownership so Phoenix cannot overwrite a manually owned attribute | NOV-1 |
| PROD-008 | Create desired-state records containing entity version, payload hash, priority, deadline, and reconciliation key | FOUNDATION |
| PROD-009 | Dynamically batch commands within the certified channel/endpoint maximum; correctness cannot depend on batch size 100 | NOV-1 |
| PROD-010 | Reconcile desired state with adapter acknowledgement and provide SKU/channel drill-down | NOV-1 |
| PROD-011 | Support replay of a source snapshot without resending unchanged state | NOV-1 |
| PROD-012 | Provide a configurable full reconciliation schedule, initially daily | NOV-1 |

#### Business rules

- An unmapped product produces an operation case, never a speculative listing.
- Deactivation is treated as a high-risk state transition and must use channel-certified semantics.
- A source version older than the accepted version is ignored or quarantined.
- Multiple pending desired states for the same channel/account/listing may be coalesced to the latest version before sending.
- A sent or legally significant external result is never erased; supersession is explicit.

#### November acceptance

- At least 99.5% of valid mapped deltas reach acknowledged or terminal classified state.
- Replaying the same snapshot generates no duplicate seller write.
- Inactive and unmapped records cannot cause unsafe updates.
- Desired-versus-acknowledged reconciliation is searchable by channel and SKU.

### 6.2 Price and promotion synchronization MVP

#### Operating model

RMS/LDD price and promotion inputs are versioned and evaluated against effective dates, seller mapping, ownership policy, overrides, and clubpack quantity. Phoenix computes the seller-facing desired price, applies guardrails, generates commands only when the desired value changes, and schedules them according to campaign priority and certified API capacity.

#### Requirements

| ID | Requirement | Phase |
|---|---|---|
| PRICE-001 | Ingest regular price, promotion price, promotion identity, start/end time, source version, and applicable product/store scope | NOV-1 |
| PRICE-002 | Calculate the effective price at a specified business time with explicit timezone handling | NOV-1 |
| PRICE-003 | Activate and expire promotions deterministically at their effective boundaries | NOV-1 |
| PRICE-004 | Respect Auto/Manual ownership and approved override precedence | NOV-1 |
| PRICE-005 | Apply approved clubpack quantity and rounding rules using versioned configuration | NOV-1 |
| PRICE-006 | Compare the calculated desired state with last desired and acknowledged seller state | NOV-1 |
| PRICE-007 | Quarantine zero, negative, malformed, implausible, or policy-violating prices | NOV-1 |
| PRICE-008 | Assign campaign priority and deadline to each command | NOV-1 |
| PRICE-009 | Enforce a distributed quota across all adapter replicas for the certified channel/account/credential/endpoint/operation scope | NOV-1 |
| PRICE-010 | Use an initial 80/20 normal-versus-urgent/retry budget until certified configuration replaces it | NOV-1 |
| PRICE-011 | Measure effective batch fill, success ratio, items/minute, pending items, and estimated drain time | NOV-1 |
| PRICE-012 | Expose a pre-campaign readiness view and block/waive workflow when backlog cannot drain before the deadline | NOV-1 |
| PRICE-013 | Record seller acknowledgement, validation rejection, rate limit, transient failure, and permanent failure distinctly | NOV-1 |
| PRICE-014 | Reconcile desired regular/promotion state with seller-observed state where the API permits read-back | FOUNDATION |

#### Precedence model

The detailed formula requires business sign-off, but the engine must make precedence explicit and testable. A typical decision sequence is:

1. Resolve the active mapping and clubpack quantity.
2. Determine whether the seller field is Auto or Manual.
3. If Manual, retain the approved manual value and record why Phoenix skipped calculation.
4. If Auto, evaluate active promotion against the business timestamp.
5. Apply approved override rules.
6. Apply clubpack multiplication and currency rounding.
7. Apply safety guardrails.
8. Compare with last desired state and create a command only when changed.

#### November acceptance

- Changed SKU p95 reaches seller acceptance within five minutes when the set fits the certified quota and effective batch envelope.
- If the set cannot fit, Phoenix shows forecast completion and risk before release rather than claiming a false SLA.
- Auto/Manual, clubpack, effective-date, expiry, override, and rounding fixtures pass for every production channel.
- Combined replicas remain within the configured quota during normal work, retry storms, restart, and rebalance.
- Batch sizes 1, 20, 50, and 100 are tested where APIs allow.

### 6.3 Bidirectional seller-channel adapters

#### Operating model

Each channel has an isolated Go deployment using a shared adapter SDK. The deployment owns both inbound channel mechanics and outbound seller calls. A shared API Gateway/WAF protects public webhooks but is not a separate Phoenix application workload.

Inbound responsibilities:

- Receive signed webhooks where supported.
- Verify signature, timestamp, nonce, replay window, content type, and payload size.
- Poll orders with distributed leases and overlap-safe cursors where webhooks are absent or insufficient.
- Archive the raw payload and append an adapter-validated transport envelope to Kafka.
- Return webhook success only after Kafka quorum acknowledgement.

Outbound responsibilities:

- Authenticate to seller APIs.
- Transform canonical commands to channel-specific payloads.
- Enforce distributed quota, concurrency, batching, retry, timeout, and circuit-breaker policies.
- Normalize responses and publish results to Kafka.

Requirements:

| ID | Requirement | Phase |
|---|---|---|
| ADP-001 | Deploy and release each channel adapter independently | NOV-1 |
| ADP-002 | Use separate inbound, polling, and outbound worker pools to prevent starvation | NOV-1 |
| ADP-003 | Keep at least two replicas per production channel across failure domains | NOV-1 |
| ADP-004 | Share SDK mechanics without placing channel-specific mapping or error semantics in the shared library | FOUNDATION |
| ADP-005 | Maintain a versioned channel capability registry for auth, webhook, polling, endpoints, quotas, batch, fields, errors, and certification evidence | NOV-1 |
| ADP-006 | Support per-channel/account/domain feature flags and writer ownership | NOV-1 |
| ADP-007 | Open a circuit for one unhealthy channel/operation without blocking other channels | NOV-1 |
| ADP-008 | Preserve idempotency/request keys and payload hashes for every external write | NOV-1 |
| ADP-009 | Emit normalized metrics, traces, results, and error reason codes | NOV-1 |
| ADP-010 | Support sandbox contract fixtures and captured-response regression tests | FOUNDATION |

### 6.4 Order ingestion, normalization, and hand-off MVP

#### Operating model

The channel adapter durably accepts raw orders into Kafka. `order-ingestion-service` then converts channel payloads to the canonical order model, validates business completeness, resolves duplicates, and commits authoritative order state to the existing monthly partition model. An asynchronous hand-off service sends accepted orders through the versioned fulfilment contract. Phoenix records outcome and retries safely; it does not execute warehouse work.

#### Requirements

| ID | Requirement | Phase |
|---|---|---|
| ORD-001 | Consume adapter-validated raw orders from Kafka, retaining payload evidence and source metadata | NOV-1 |
| ORD-002 | Normalize channel order, line, customer/address, payment summary, tax/reference, cancellation, and timestamp fields to canonical contracts | NOV-1 |
| ORD-003 | Validate required fields, mapping, currency, totals, quantity, and supported fulfilment attributes | NOV-1 |
| ORD-004 | Suppress duplicates using channel, seller account, external order ID, and source version/idempotency key | NOV-1 |
| ORD-005 | Treat duplicate delivery as one business outcome while preserving attempt evidence | NOV-1 |
| ORD-006 | Persist orders, items, lifecycle history, packages where available, and external references using the existing monthly OMS partitions | NOV-1 |
| ORD-007 | Maintain non-partitioned reference lookups required for global business-key lookup and partition pruning | NOV-1 |
| ORD-008 | Handle out-of-order events without moving lifecycle state backwards | NOV-1 |
| ORD-009 | Ingest cancellation before fulfilment acceptance where supported and publish a canonical cancellation outcome | NOV-1 |
| ORD-010 | Hand accepted orders asynchronously to the existing fulfilment estate through a versioned idempotent contract | NOV-1 |
| ORD-011 | Separate Phoenix acceptance time, hand-off time, and external fulfilment time | NOV-1 |
| ORD-012 | Route missing mappings, unsupported data, and business validation failures to an operations case | NOV-1 |
| ORD-013 | Support controlled replay without duplicate hand-off | NOV-1 |
| ORD-014 | Expose searchable order timeline from adapter acceptance through hand-off outcome | NOV-1 |

#### Canonical order minimum

- Phoenix order ID and external order ID.
- Channel, seller account, store/fulfilment node where supplied.
- Source event/version, creation/payment/update timestamps, and timezone.
- Customer token/reference and delivery address subject to PII rules.
- Currency, item subtotal, discount, shipping, tax, and total.
- Lines with seller SKU, resolved enterprise SKU/PLU, quantity, unit price, discount, and status.
- Payment status/type summary without storing prohibited payment secrets.
- Channel status, canonical status, cancellation reason, notes, and external references.
- Correlation, causation, trace, idempotency, and payload-reference fields.

#### November acceptance

- Durable acceptance at 250 orders/second for two minutes.
- Headroom test at 500 orders/second for two minutes.
- p99 channel-adapter receipt to Kafka quorum acknowledgement ≤250 ms.
- p99 internal order visibility ≤3 seconds.
- No acknowledged order lost during pod, broker, or availability-zone failure testing.
- Duplicate, out-of-order, cancellation, mapping failure, and fulfilment outage scenarios pass automated tests.

### 6.5 Operational control plane

#### Requirements

| ID | Requirement | Phase |
|---|---|---|
| OPS-001 | Search by channel, account, product/SKU, order, event, correlation ID, campaign, and error code | NOV-1 |
| OPS-002 | Show queue age, pending count, oldest item, success rate, retries, DLQ, and terminal failures by channel/domain | NOV-1 |
| OPS-003 | Show source delay, Phoenix queue/processing time, platform wait, and platform processing separately | NOV-1 |
| OPS-004 | Show desired, sent, acknowledged, superseded, retrying, failed, and reconciled state | NOV-1 |
| OPS-005 | Provide channel/account/domain/SKU-cohort kill switches and feature flags | NOV-1 |
| OPS-006 | Show current Phoenix-versus-legacy writer ownership and prevent conflicting activation | NOV-1 |
| OPS-007 | Create operational cases with reason, severity, owner, age, evidence, comments, and resolution | NOV-1 |
| OPS-008 | Permit authorized retry/replay only after previewing scope and idempotency impact | NOV-1 |
| OPS-009 | Record immutable audit events for login, configuration, override, replay, retry, kill switch, writer transfer, and approval | NOV-1 |
| OPS-010 | Present campaign drain forecast and quota headroom | NOV-1 |
| OPS-011 | Provide maintenance-window and dependency-health configuration so known outages do not create uncontrolled retry storms | FOUNDATION |
| OPS-012 | Export operational evidence for incident/UAT review without becoming a BI/reporting platform | NOV-1 |

#### Roles

| Role | Minimum permissions |
|---|---|
| Viewer | Read operational state and evidence |
| Operator | Assign cases, retry approved transient failures, pause scoped traffic |
| Campaign Manager | Manage campaign priority/deadline and approved business overrides |
| Release Manager | Change writer ownership, activate channel/cohort, execute rollback |
| Administrator | Manage configuration and role assignment; cannot bypass audit |
| Security Auditor | Read security/audit evidence without operational write access |

High-risk actions require reason entry and, where configured, two-person approval.

### 6.6 Configuration and capability governance

This is an added product requirement because external integration behavior changes independently of Phoenix releases.

| ID | Requirement | Phase |
|---|---|---|
| CFG-001 | Version all mapping, quota, batch, endpoint, retry, timeout, clubpack, override, and feature-flag configuration | NOV-1 |
| CFG-002 | Record effective time, author, approver, reason, previous value, and rollback value | NOV-1 |
| CFG-003 | Validate configuration before activation and support dry-run impact preview | FOUNDATION |
| CFG-004 | Support scoped rollout by environment, channel, account, operation, and cohort | NOV-1 |
| CFG-005 | Prevent secrets from entering configuration history, Kafka, logs, or UI | NOV-1 |
| CFG-006 | Maintain API/certification evidence and review expiry date per channel capability | FOUNDATION |

### 6.7 Enterprise connector boundary

Enterprise systems do not call business-service internals directly. Each source/dependency is isolated behind connector pods that exchange versioned events through Kafka and pace outbound calls according to that system's contract.

| ID | Requirement | Phase |
|---|---|---|
| ENT-001 | Provide dedicated connector deployments for RMS, RMS/LDD, Stock Service, WMS/MFC, DHL, and Auto POS when the corresponding domain is activated | FOUNDATION |
| ENT-002 | Keep Kafka between enterprise connectors and business services for burst absorption, replay, and independent pacing | FOUNDATION |
| ENT-003 | Configure rate, concurrency, timeout, retry, circuit breaker, and maintenance windows independently per system/endpoint/operation | NOV-1 for RMS, RMS/LDD, and WMS/MFC; later for other inactive flows |
| ENT-004 | Archive source/request/response evidence according to data classification and retain a searchable reference | NOV-1 |
| ENT-005 | Measure source availability and delay separately from Phoenix processing and dependency wait time | NOV-1 |
| ENT-006 | Prevent connector retries or autoscaling from exceeding a certified external quota | NOV-1 |
| ENT-007 | Support contract simulation so domain development and testing are not blocked by unstable sandboxes | FOUNDATION |

### 6.8 Platform foundation

| ID | Requirement | Phase |
|---|---|---|
| PLAT-001 | Provide Kafka quorum across three independent failure domains with schema registry and versioned topics | NOV-1 |
| PLAT-002 | Provide highly available PostgreSQL using the existing monthly OMS partition design and separate domain schemas/roles | NOV-1 |
| PLAT-003 | Use Redis-compatible storage in November only for distributed quotas and disposable cache; production ATS is disabled | NOV-1 |
| PLAT-004 | Provide object storage for immutable source/raw payloads, replay, and reconciliation evidence | NOV-1 |
| PLAT-005 | Deploy services on the shared Kubernetes platform using topology spread, disruption budgets, bounded resources, and GitOps | NOV-1 |
| PLAT-006 | Provide OpenTelemetry collection and searchable short-retention operational logs without making logs a source of business truth | NOV-1 |
| PLAT-007 | Support progressive delivery, channel/cohort canary, automated rollback signal, and immutable signed artifacts | NOV-1 |
| PLAT-008 | Keep deployment/provider terminology portable; product behavior must not depend on one cloud vendor's proprietary service | FOUNDATION |

## 7. Channel and capability matrix

### 7.1 November delivery commitment

| Capability | Shopee | Lazada | TikTok | WeChat | Amaze | Makro Pro |
|---|---|---|---|---|---|---|
| Existing mapped product updates | Commit | Commit | Commit | Conditional | Conditional | Conditional |
| Price delta | Commit | Commit | Commit | Conditional | Conditional | Conditional |
| Promotion delta | Commit | Commit | Commit | Conditional | Conditional | Conditional |
| Order ingestion | Commit | Commit | Commit | Conditional | Conditional | Conditional |
| Idempotent fulfilment hand-off | Commit | Commit | Commit | Conditional | Conditional | Conditional |
| New listing creation | Later | Later | Later | Later | Later | Later |
| Production ATS/reservation | Later | Later | Later | Later | Later | Later |
| Full status/AWB workflow | Later | Later | Later | Later | Later | Later |

Conditional becomes production commitment only when API readiness, credentials, mappings, end-to-end alpha, certification, and dress-rehearsal gates pass. Otherwise the channel remains shadow-only without being treated as a release failure.

### 7.2 API discovery matrix

The following must be completed by July 3 and maintained in the capability registry. This PRD intentionally does not invent platform behavior.

| Channel | Signed webhook | Polling | Product update | Price/promo | Read-back | Quota scope | Batch maximum/effective | Certification |
|---|---|---|---|---|---|---|---|---|
| Shopee | Confirm | Confirm | Confirm fields | Confirm operations | Confirm | Confirm | Confirm/test | Required evidence |
| Lazada | Confirm | Confirm | Confirm fields | Confirm operations | Confirm | Confirm | Confirm/test | Required evidence |
| TikTok | Confirm | Confirm | Confirm fields | Confirm operations | Confirm | Confirm | Confirm/test | Required evidence |
| WeChat | Confirm | Confirm | Confirm fields | Confirm operations | Confirm | Confirm | Confirm/test | Required evidence |
| Amaze | Confirm | Confirm | Confirm fields | Confirm operations | Confirm | Confirm | Confirm/test | Required evidence |
| Makro Pro | Confirm | Confirm | Confirm fields | Confirm operations | Confirm | Confirm | Confirm/test | Required evidence |

For every operation, discovery must capture authentication, credential scope, endpoint, HTTP method, idempotency support, request/response schema, rate and concurrency limit, batch rules, timeout, retry guidance, `429` behavior, maintenance behavior, webhook retry policy, ordering semantics, sandbox fidelity, and production certification owner.

## 8. Integration and interface requirements

### 8.1 Enterprise integrations

| System | November use | Later use | Contract requirement |
|---|---|---|---|
| RMS | Product snapshots/changes | Full catalog lifecycle input | Versioned source, checksum, extraction time, replayable payload |
| RMS/LDD | Price and promotion input | Guardrails and richer campaign rules | Effective-dated, timezone-explicit, versioned contract |
| Stock Service | Not activated for production stock in November | Stock movements/snapshots for ATS | Ordered/replayable movement identity and reconciliation snapshot |
| WMS/MFC | Accepted-order hand-off | Full status and cancellation compensation | Idempotent hand-off, stable reason codes, per-system quota; 300 requests/hour example pending confirmation |
| DHL | Not required beyond agreed minimal existing flow | Delivery status/hand-off integration | Shipment/status identity, retry and webhook rules |
| Auto POS | Normally excluded in November | Idempotent sale capture | Request key, eligibility, transaction mapping, stable response |

Each integration has a dedicated connector and distributed rate limiter. Kafka separates external-system pacing from business-service processing.

### 8.2 Event envelope

Every event must include:

```text
event_id, event_type, schema_version, occurred_at, accepted_at,
producer, correlation_id, causation_id, trace_id,
channel_id, seller_account_id, aggregate_type, aggregate_id,
aggregate_version, partition_key, idempotency_key,
campaign_id, priority, deadline_at, payload_reference, pii_classification
```

Events use versioned Protobuf or Avro contracts registered in the schema registry. Compatibility is backward by default. Breaking changes require a new topic or controlled dual-publish migration.

### 8.3 Canonical product model

Minimum fields include enterprise product/PLU identity, source version, status, localized name where approved, brand, barcode, unit/UOM, pack/clubpack quantity, approved essential attributes, channel mapping, ownership mode, and payload evidence.

### 8.4 Canonical price/promotion model

Minimum fields include enterprise product, store/scope, currency, regular price, promotion price, promotion identity/type, effective start/end, timezone, source version, Auto/Manual mode, override reference, clubpack quantity, rounding policy, calculated desired value, and validation result.

### 8.5 Fulfilment hand-off contract

The November contract must:

- Accept a stable Phoenix order ID and external order reference.
- Be idempotent for repeated delivery.
- Return accepted, retryable, or rejected with stable reason.
- Avoid exposing Phoenix to internal WMS task details.
- Preserve correlation ID and timestamps.
- Define cancellation behavior before external acceptance.
- Operate within the confirmed WMS/MFC rate and concurrency limits.

### 8.6 Contract ownership

Each contract has a business owner, technical owner, schema owner, compatibility policy, fixture set, change-notice period, and production support contact. Consumers may not read another service's database tables directly.

## 9. Data requirements

### 9.1 Authoritative state

PostgreSQL is authoritative for orders, mappings, desired/sent/acknowledged ledgers, configuration, operation cases, audit, and idempotency outcomes. Kafka is the durable event/replay backbone, not the sole business query store.

### 9.2 Existing OMS monthly partitions

Phoenix reuses the delivered `phoenix-oms-mkp-service` model:

- Monthly `orders` partitions by `created_at`.
- Monthly `order_items` partitions by `order_created_at`.
- Monthly `order_status_history` partitions by `created_at`.
- Monthly `packages` partitions by `order_created_at`.
- Non-partitioned `order_refs` and `package_refs` for global lookup and partition routing.
- Default partitions as safety nets.
- Idempotent creation of the next three months of partitions.
- Guarded archive tooling that refuses current/future periods.

Queries missing the required partition timestamp are performance defects.

### 9.3 Object storage

Object storage retains immutable RMS/LDD source snapshots, raw seller order payloads, adapter request/response evidence where permitted, reconciliation artifacts, and Kafka archive/recovery material. PostgreSQL stores references and searchable metadata rather than duplicating large payloads.

### 9.4 Retention

| Data | Initial requirement |
|---|---|
| Raw Kafka order events | 7 days hot, then archive |
| Domain/retry events | 7–14 days according to replay need |
| Order and audit state | Retain according to approved legal/business policy; architecture envelope assumes three years |
| Raw object payloads | Policy-defined by source, PII classification, and replay need |
| Operational logs | Short retention for support/security; not a BI store |
| Idempotency records | At least the maximum source redelivery/replay window plus business retention requirement |

Exact PII and legal retention periods require approval before production.

### 9.5 Data quality

Phoenix must measure missing mappings, invalid attributes, stale source versions, duplicate external IDs, price anomalies, total mismatches, unknown statuses, and reference-integrity failures. Data-quality failures become owned operation cases with source attribution; they are not silently repaired.

## 10. Non-functional requirements

### 10.1 Scale and throughput

| Parameter | Requirement |
|---|---:|
| Peak daily orders | 50,000/day |
| Peak accepted rate | 250 orders/second |
| Peak duration | Up to 2 minutes |
| Peak-window orders | 30,000 |
| Headroom test | 500 orders/second for 2 minutes |
| Product catalog | 200,000 SKUs |
| Average order lines for sizing | 5; validate with production evidence |
| Expected lifecycle amplification | 6–10 events/order |
| Three-year order count at daily peak | Approximately 54.75 million |
| Initial PostgreSQL three-year planning envelope | 1–2 TB including indexes and operational headroom; validate with measured baskets and retention |

Order volume does not define outbound SKU capacity. Seller API quotas and effective batch size determine synchronization drain time.

### 10.2 Latency and availability

| Capability | November SLO |
|---|---:|
| Channel-adapter receipt to Kafka quorum acknowledgement | p99 ≤250 ms at 250 orders/s |
| Order-ingestion availability | 99.99% monthly excluding invalid input and seller outage |
| Internal order visibility | p99 ≤3 seconds |
| Duplicate suppression | 100% for same channel/order/version key |
| Price/promotion changed SKU | p95 ≤5 minutes when quota envelope permits |
| Product delta publication | Within 15 minutes after source availability; daily reconciliation |
| Platform-adjusted external API success | ≥99.5% with seller outage reported separately |

### 10.3 Durability and recovery

- Kafka replication factor 3 with `min.insync.replicas=2` and producer `acks=all`.
- No acknowledgement when Kafka cannot reach quorum.
- Recovery point objective: zero committed Kafka events; no more than one minute of derived-state exposure.
- Availability-zone recovery target: ≤15 minutes.
- Regional failover target: ≤60 minutes after incident declaration.
- At least 24 hours of projected peak-day consumer-lag reserve.
- Restore, replay, monthly partition, and writer-fencing procedures must be rehearsed.

### 10.4 Isolation and scalability

- Per-channel adapters deploy independently with at least two replicas.
- A channel outage or bad release cannot stop another channel.
- Internal Kafka consumers scale from CPU, request rate, and lag age.
- Adapter autoscaling responds to inbound load and health; it never bypasses outbound quota.
- Inbound, polling, and outbound adapter workers use separate bounded concurrency pools.
- Campaign traffic can pause low-priority catalog/reconciliation traffic.

### 10.5 Operability

- Every production service emits OpenTelemetry metrics, logs, and traces.
- Correlation survives HTTP, Kafka, database, and external API boundaries.
- SLO alerts use burn rate and actionable ownership.
- Runbooks cover channel outage, source delay, Kafka quorum loss, database failover, DLQ, replay, bad release, writer rollback, and regional recovery.

### 10.6 Accessibility and usability

- Operational UI supports current approved corporate browser versions.
- Status cannot be communicated by color alone.
- Destructive/high-risk actions require clear scope, impact preview, confirmation, and audit.
- Common investigations should not require direct database access.

## 11. Rate limiting, prioritization, and backpressure

### 11.1 Seller-channel policy

Until certified otherwise:

- Maximum planning rate: 100 requests/minute per quota scope.
- Normal budget: 80 requests/minute.
- Urgent/retry reserve: 20 requests/minute.
- Advertised bulk ceiling: up to 100 items/request.
- Guaranteed batch: unknown; discover per operation.

The limiter key includes channel, account, credential, endpoint, and operation as required by the certified scope. Capacity is not multiplied across replicas or accounts without evidence.

Priority from highest to lowest:

1. Paid-order acknowledgement and legally required status transition.
2. Reservation-driven stock protection after Phase 2.
3. Campaign price/promotion and top-SKU stock.
4. General stock.
5. Product/catalog changes.
6. Full reconciliation and repair.

### 11.2 Drain forecast

```text
effective_items_per_minute = allowed_requests_per_minute
                           × observed_batch_fill
                           × observed_success_ratio

drain_minutes = pending_items / effective_items_per_minute
```

The UI must never imply that increasing pods solves a seller quota bottleneck. If the deadline cannot be met, the system recommends changed-SKU filtering, pre-staging, larger certified batch, quota negotiation, scope reduction, or business waiver.

### 11.3 Enterprise dependency policy

Every enterprise connector has its own distributed limit, concurrency pool, timeout, retry budget, circuit breaker, and maintenance calendar. Kafka absorbs bursts; consumers pace calls to the dependency contract. MFC's 300 requests/hour is treated as an example until formally confirmed.

## 12. Resilience, exceptions, and error governance

### 12.1 Error taxonomy

| Class | Examples | Required behavior |
|---|---|---|
| Immediate transient | Connection reset, bounded network interruption | Few jittered retries within request budget |
| Deferred transient | `429`, `5xx`, timeout, dependency outage | Retry topic with increasing delay; honor server retry timing |
| Business exception | Missing mapping, invalid transition, incomplete order, suspicious price | No blind retry; create operation case |
| Permanent external rejection | Unsupported field/value, revoked listing | Terminal classified state with remediation reason |
| Poison event | Schema or handler defect | Quarantine event/partition, alert engineering, replay after fix |
| Security rejection | Bad signature, replayed nonce, unauthorized credential | Reject, audit, alert according to severity; never retry as business traffic |

### 12.2 DLQ requirements

- DLQ records retain original event reference, attempts, timestamps, error class, handler version, configuration version, and remediation owner.
- DLQ is not a dumping ground; every class has an SLA and owner.
- Replay requires preview of event count, date range, scope, current desired version, and idempotency consequence.
- Replayed events receive a replay correlation while preserving original causation.
- Bulk replay supports rate limiting, pause, cancellation, and progress visibility.

### 12.3 Circuit breakers and kill switches

- Circuit breakers operate by channel/account/endpoint/operation.
- Automatic opening must preserve commands in Kafka/ledger.
- Operator kill switches can stop inbound acknowledgement, polling, or outbound writes independently where safe.
- Paid orders already acknowledged cannot be silently discarded when a switch is activated.
- Recovery uses controlled half-open probes and visible approval when required.

### 12.4 Degraded modes

| Failure | Expected behavior |
|---|---|
| Seller API unavailable | Queue commands, open circuit, continue other channels |
| Kafka lacks quorum | Do not acknowledge new webhooks; alert immediately |
| PostgreSQL unavailable | Kafka acceptance may continue; projections pause and recover from events |
| Object storage unavailable | Apply approved bounded policy; never lose required payload evidence silently |
| Fulfilment unavailable | Keep hand-off durable, retry within its quota, expose order age |
| Bad adapter release | Canary rollback and replay after correction |
| Legacy/Phoenix ownership ambiguity | Fail closed for writes and require ownership resolution |

## 13. Security, privacy, and compliance

| ID | Requirement | Phase |
|---|---|---|
| SEC-001 | Validate webhook signature, timestamp, nonce, replay window, payload size, and decompression limits | NOV-1 |
| SEC-002 | Use OAuth/OIDC for users and workload identity/mTLS where supported for services | NOV-1 |
| SEC-003 | Store seller and enterprise credentials in an approved secrets manager with rotation and access audit | NOV-1 |
| SEC-004 | Encrypt Kafka, PostgreSQL, Redis persistence, object storage, backups, and all network traffic | NOV-1 |
| SEC-005 | Minimize, tokenize, or field-encrypt customer PII and restrict decryption by workload identity | NOV-1 |
| SEC-006 | Enforce least-privilege Kubernetes, topic, schema, database, object, and UI RBAC | NOV-1 |
| SEC-007 | Generate immutable audit evidence for privileged and business-impacting actions | NOV-1 |
| SEC-008 | Run SAST, dependency/image scanning, SBOM, secret scanning, signed-artifact verification, and admission controls | NOV-1 |
| SEC-009 | Define PII retention, deletion, residency, incident notification, and data-subject handling before production | NOV-1 |
| SEC-010 | Complete threat modeling for webhooks, replay, credential theft, event poisoning, privilege escalation, and supply chain | NOV-1 |

No secret, full payment credential, or unnecessary customer PII may be placed in Kafka events, logs, traces, or operator comments.

## 14. November rollout, gates, and acceptance

### 14.1 Delivery strategy

The target is Option A: all six channels with the narrow MVP. Option B is the pre-approved fallback: Shopee, Lazada, and TikTok production; WeChat, Amaze, and Makro Pro shadow-only when readiness gates are missed.

### 14.2 Gates

| Gate | Due | Pass condition | Failure response |
|---|---|---|---|
| Adapter source audit | 2026-06-26 | Relevant .NET behavior and configuration traceable | Re-estimate; remove assumed reuse saving |
| API readiness | 2026-07-03 | Current docs, auth, quotas, batches, contacts, errors known | Affected conditional channel moves to shadow |
| Test access | 2026-07-10 | Working credentials and sandbox/test account | Channel moves to shadow |
| Fulfilment contract | 2026-07-10 | Versioned idempotent hand-off and test endpoint | Order go-live blocked independently |
| Mapping approval | 2026-07-17 | Product, price, promotion, order mappings signed off | Freeze unsupported fields |
| Certification booking | 2026-08-14 | Required vendor slots confirmed | Escalate or shadow |
| Wave alpha | Sep 4/11/18 | Wave happy path and retry path pass | Do not advance that channel |
| Certification/UAT | 2026-10-16 | Vendor and business approvals complete | Keep shadow-only |
| Dress rehearsal | 2026-10-23 | Cutover, rollback, replay, reconciliation pass | No ownership transfer |
| Technical cutover | 2026-10-30 | Approved writer transfer and production checks | Roll back to legacy |
| Business go-live | 2026-11-01 | Hypercare staffed and dashboards healthy | Execute incident/cutback plan |

### 14.3 Shadow and parallel run

- Wave 1 completes at least ten business days of shadow comparison.
- Later waves complete at least five business days.
- Shadow mode consumes real/masked production-equivalent input, calculates outcomes, and records comparison without external writes.
- Comparison includes mapping, payload hash, desired value, skip reason, timing, and expected external operation.
- Differences are classified as Phoenix defect, legacy defect, approved behavior change, source-data issue, or unsupported capability.
- Production ownership changes only after the approved mismatch threshold is met.

### 14.4 Cross-cutting definition of done

- Stable event ID, correlation ID, idempotency key, and auditable outcome exist for every accepted command/order.
- No unresolved Severity 1 or Severity 2 defect.
- Load, skew, soak, chaos, security, and failover tests pass.
- Channel outage does not stop another channel.
- Kill switch, replay, rollback, writer fencing, and recovery are demonstrated.
- Runbooks, dashboards, alerts, on-call ownership, and hypercare schedule are approved.
- Required channel certification and business UAT are signed.

### 14.5 Test scenarios

Testing must include hot SKUs, large baskets, duplicate and out-of-order webhooks, polling overlap, cancellation races, retries, `429`, timeout-after-success, smaller-than-advertised batches, malformed payloads, mapping drift, promotion boundary time, one-AZ loss, broker loss, PostgreSQL failover, bad adapter release, poison event, and fulfilment outage.

## 15. Later phases and investment case

Later phases are not hidden November scope. Each phase requires its own business case, detailed planning, and release gates.

### 15.1 Phase 2 — Stock correctness and full order lifecycle

**Indicative timing:** November 2026–February 2027  
**Indicative effort:** 700–820 MD  
**Primary sponsor proposition:** reduce oversell, cancellation, manual stock correction, and incomplete order hand-offs.

#### Features and operation

| ID | Feature | How it works | Business benefit |
|---|---|---|---|
| INV-201 | Stock Service stock ingestion | Consume uniquely identified stock movements and snapshots, archive evidence, reject stale versions, and publish ordered movements | Replaces slow batch dependence with an auditable stock stream |
| INV-202 | Durable stock ledger | Record every movement, source, reason, version, and reconciliation result in PostgreSQL | Makes stock discrepancies explainable and recoverable |
| INV-203 | Real-time ATS | Redis maintains available-to-sell per store/SKU/allocation pool; atomic Lua applies movements and deductions | Faster, race-safe sellable stock decisions |
| INV-204 | Reservation lifecycle | Reserve on approved channel status, release on cancel/expiry/failure, and deduplicate repeated events | Prevents the same units being promised twice internally |
| INV-205 | Safety stock | Subtract configurable protection quantities by store/SKU/channel | Absorbs physical and timing uncertainty |
| INV-206 | Baseline allocation | Divide ATS using approved percentage/channel rules with floors and caps | Controls exposure across channels consistently |
| INV-207 | Stock up-sync | Send changed ATS only through channel-isolated quota queues | Reduces stale listings and unnecessary API calls |
| ORD-208 | Full order state machine | Map channel, Phoenix, fulfilment, delivery, cancellation, and refund states with legal transitions | Reduces stuck orders and invalid seller updates |
| ORD-209 | Cancellation compensation | Coordinate release and downstream cancellation according to acceptance state | Avoids stranded reservations and conflicting outcomes |
| ORD-210 | External status ingestion | Consume WMS/MFC and DHL canonical statuses through Kafka and map permitted seller transitions | Gives customers and channels more timely status |
| SALE-211 | Auto POS capture | Submit eligible sale capture idempotently and retain transaction mapping | Reduces missing/duplicate sales capture |
| OPS-212 | Oversell root-cause explorer | Join stock movement, reservation, allocation, sync attempt, seller response, and order timeline | Turns oversell investigations from days of log search into a traceable case |

#### Why fund Phase 2

- Oversell and cancellation directly damage margin, customer trust, seller metrics, and operations workload.
- Real-time reservation moves Phoenix from a synchronization utility to a correctness control plane.
- A durable ledger and deterministic replay reduce the financial and operational risk of Redis or integration failures.
- Full state mapping reduces manual status correction and protects seller SLA compliance.

#### Benefits to measure

- Oversell count and value attributable to internal latency.
- Cancellation rate due to unavailable stock.
- Stock discrepancy age and manual correction hours.
- Reservation decision latency and failure rate.
- Seller stock staleness and platform-attributed delay.
- Orders requiring manual status intervention.

### 15.2 Phase 3 — Full catalog and marketplace capability

**Indicative timing:** Q1–Q2 2027  
**Indicative effort:** 360–460 MD  
**Primary sponsor proposition:** accelerate assortment expansion and reduce seller-center manual work.

#### Features and operation

| ID | Feature | How it works | Business benefit |
|---|---|---|---|
| CAT-301 | New listing creation | Build draft listings from enterprise products, apply channel/category requirements, validate, submit, and track moderation | Enables assortment growth without manual re-entry |
| CAT-302 | Category mapping workflow | Map enterprise taxonomy to seller category versions with approval and effective dates | Reduces rejected listings and repeated mapping effort |
| CAT-303 | Attribute templates | Maintain required/conditional attributes by channel/category/brand with completeness scoring | Improves first-time acceptance |
| CAT-304 | Media synchronization | Validate, transform, checksum, upload, and reconcile images/video under platform rules | Produces consistent listings with less manual media handling |
| CAT-305 | Variant and bundle model | Represent parent/variant, pack, bundle, and clubpack relationships consistently | Supports richer assortment and avoids incorrect pack pricing |
| CAT-306 | Moderation workflow | Track draft, submitted, rejected, approved, suspended, and remediation states | Makes seller approval visible and actionable |
| CAT-307 | Seller catalog pull | Periodically read seller state and detect unauthorized or manual drift | Finds divergence before it becomes a customer issue |
| CAT-308 | Automated drift repair | Create reviewed repair commands for approved Phoenix-owned fields | Reduces long-lived inconsistency |
| CAT-309 | Certification suites | Run category and payload fixtures against sandbox/captured contracts | Lowers regression risk as APIs evolve |

#### Why fund Phase 3

- November can update only already mapped listings; growth remains constrained by manual listing creation.
- Category and media automation shortens time from enterprise assortment approval to channel availability.
- Reusable templates turn channel onboarding knowledge into an asset rather than tribal knowledge.
- Drift detection protects brand consistency and reduces silent seller-center changes.

#### Benefits to measure

- Time to list a new SKU across six channels.
- First-submission acceptance rate.
- Manual touches and hours per listing.
- Percentage of eligible assortment live by channel.
- Drift count, age, and repair success.

### 15.3 Phase 4 — Dynamic allocation and mart-channel scale

**Indicative timing:** Q2–Q3 2027  
**Indicative effort:** 700–900 MD  
**Primary sponsor proposition:** improve sell-through and safely open store-level inventory across high-scale mart channels.

#### Features and operation

| ID | Feature | How it works | Business benefit |
|---|---|---|---|
| ALLOC-401 | Sales-velocity allocation | Recalculate channel weights from recent demand while respecting floors, caps, and safety stock | Places scarce stock where it is most likely to sell |
| ALLOC-402 | Health-aware allocation | Reduce exposure to channels with API outage, cancellation, or fulfilment degradation | Avoids trapping stock behind unhealthy channels |
| ALLOC-403 | Campaign-aware allocation | Reserve capacity for campaign SKUs and approved channel priorities | Protects strategic campaign commitments |
| MART-404 | Mart adapter cells | Add Shopee Mart, LINE MAN Mart, Grab Mart, and Hato Mart with store-aware contracts | Opens additional rapid-commerce demand |
| MART-405 | Store-SKU fan-out | Partition and schedule up to 2,000 stores × 10,000 SKUs without full-table blasts | Makes mart scale operationally feasible |
| MART-406 | Store-level quotas | Pace calls by platform, account, store, endpoint, and operation | Prevents one store or channel exhausting shared quota |
| MART-407 | Store exception workflow | Group mapping, closure, stock, and API failures by store and priority | Gives operations a manageable remediation model |
| SIM-408 | 20-million store-SKU simulator | Rehearse realistic changes, hot stores, quota, failure, and recovery before launch | Reduces production surprises and over-provisioning |

#### Why fund Phase 4

- Mart channels multiply the addressable footprint but also multiply synchronization work far beyond order volume.
- Static percentage allocation leaves revenue on the table when channel demand differs.
- Health-aware allocation converts operational signals into commercial protection.
- Store-level simulation prevents a costly launch based on unrealistic uniform-load assumptions.

#### Benefits to measure

- Sell-through and stockout by channel/store.
- Inventory stranded in low-demand or unhealthy channels.
- Mart assortment/store coverage.
- Sync freshness by store/SKU priority.
- Incremental GMV and contribution after controlling for demand.

### 15.4 Phase 5 — Operational intelligence and optimization

**Indicative timing:** Q3–Q4 2027  
**Indicative effort:** 220–320 MD  
**Primary sponsor proposition:** move from reactive operations to predictable campaign execution and assisted decision-making.

| ID | Feature | How it works | Business benefit |
|---|---|---|---|
| INT-501 | Campaign Command Center | Combines eligibility, desired/acknowledged product/price/stock state, quota headroom, backlog, and deadline into readiness | Gives one accountable go/no-go view |
| INT-502 | SLA Autopilot | Pauses low-priority work and reallocates permitted processing budget when campaign or paid-order deadlines are threatened | Protects the work with greatest revenue/customer impact |
| INT-503 | Digital Twin Sync Simulator | Replays planned deltas against certified quotas, batches, failures, and current backlog without external writes | Predicts whether a campaign can finish before launch |
| INT-504 | Smart Promotion Guardrails | Detects suspicious drops, stale promotions, eligibility conflicts, mapping gaps, and clubpack anomalies | Prevents high-impact pricing mistakes |
| INT-505 | Predictive allocation | Uses demand, conversion, margin, campaign, cancellation, and fulfilment health under approved constraints | Improves stock productivity |
| INT-506 | Adapter Certification Lab | Continuously runs captured fixtures, schema compatibility, sandbox calls, quota, retry, and webhook tests | Detects API drift before production |
| INT-507 | AI Operations Assistant | Summarizes incidents and evidence, proposes runbook-grounded next actions, and drafts updates | Reduces investigation and communication time |
| INT-508 | Human-approved replay advisor | Scores replay safety and recommends scope/order without executing autonomously | Speeds recovery while preserving control |

#### Investment guardrails

- Advanced recommendations require explainability, confidence, evidence, and human approval.
- AI cannot change prices, allocation, writer ownership, or replay production events autonomously.
- Model benefit must be proven against a deterministic baseline.
- This is operational intelligence, not a replacement for enterprise BI.

#### Benefits to measure

- Campaigns passing readiness gate before deadline.
- Avoided failed/late SKUs.
- Mean time to detect and resolve incidents.
- Percentage of adapter regressions found before production.
- Operator hours per incident/campaign.
- Incremental allocation benefit versus approved baseline.

### 15.5 Phase 6 — Scoped legacy decommission

**Indicative timing:** after stable capability-by-capability ownership transfer  
**Indicative effort:** 200–240 MD  
**Primary sponsor proposition:** realize run-cost, risk, and maintainability benefits only after Phoenix proves functional ownership.

#### Features and operation

- Reconcile final state by domain, channel, account, and cohort.
- Transfer writer ownership with fencing and rollback window.
- Archive required SQL Server/.NET history and evidence.
- Retire replaced jobs, credentials, adapters, servers, alerts, and support procedures.
- Rehearse DR and restore after dependencies are removed.
- Complete security access cleanup and operations knowledge transfer.

#### Why fund Phase 6

Running old and new indefinitely preserves duplicate cost and operational ambiguity. Decommission converts Phoenix delivery into actual simplification, reduces unsupported technology risk, removes duplicate credentials and jobs, and clarifies ownership. It must follow evidence—not calendar pressure.

#### Benefits to measure

- Legacy infrastructure and license cost retired.
- Number of duplicate jobs/integrations removed.
- Support incidents and specialist dependency reduced.
- Security credentials and attack surface removed.
- Recovery and release lead time improved.

## 16. Prioritization and roadmap dependency

```text
November foundation
    ├── Product/price/order MVP across marketplace channels
    ├── Operability, contracts, evidence, and safe migration
    └── Bidirectional adapter platform
             │
             ├── Phase 2: ATS + reservation + full order lifecycle
             │       └── enables trustworthy stock and status
             ├── Phase 3: full catalog lifecycle
             │       └── enables assortment growth
             └── Phase 4: dynamic allocation + mart scale
                     └── depends on Phase 2 stock correctness

Phases 2–4 provide data and controls for Phase 5 intelligence.
Stable ownership across all required domains enables Phase 6 decommission.
```

Recommended funding sequence:

1. Protect November scope and obtain baseline business metrics.
2. Fund Phase 2 first if oversell/cancellation cost is material; it delivers the strongest correctness benefit.
3. Fund Phase 3 where assortment onboarding speed limits revenue.
4. Fund Phase 4 only with mart business sponsorship and validated store-SKU demand.
5. Fund Phase 5 incrementally after enough reliable operational data exists.
6. Fund Phase 6 as part of each ownership transfer, not as an afterthought.

## 17. Dependencies, assumptions, and open decisions

### 17.1 Required dependencies

- Marketplace API specifications, credentials, test accounts, quota owners, and certification contacts.
- Readable old .NET adapter source and production behavior/configuration.
- Representative RMS, RMS/LDD, seller order, and fulfilment payloads.
- Stable WMS/MFC accepted-order contract and test endpoint.
- Approved canonical mappings and business rules.
- Shared Kubernetes, Kafka, PostgreSQL, object-storage, security, and observability platform support.
- Named business and technical owner for every enterprise system and channel.

### 17.2 Assumptions

- Four engineers start June 22 and two join July 22, with dedicated QA and Tech Lead capacity outside the six engineers.
- Practical November capacity is 510–537 MD across engineering, QA, and lead, against a 490 MD estimate.
- Existing .NET behavior reduces adapter effort by 25–40%; this must be validated.
- Product catalog remains 200,000 SKUs.
- PostgreSQL native monthly partitioning is sufficient at the three-year forecast.
- Shared platform operations cost is outside project service-cost estimates.

### 17.3 Open decisions

| Decision | Owner | Required by |
|---|---|---:|
| Final essential product attributes per channel | Product/Data owners | 2026-07-03 |
| Auto/Manual and override precedence | Campaign/Product owner | 2026-07-17 |
| Clubpack calculation and rounding | Finance/Merchandising | 2026-07-17 |
| Canonical order and cancellation mappings | Order/Fulfilment owners | 2026-07-17 |
| Certified seller quotas and batch sizes | Channel technical owners | 2026-07-03 |
| MFC quota scope and 300/hour example | Fulfilment integration owner | 2026-07-10 |
| PII retention, residency, and deletion | Legal/Security | Before production data |
| Option B activation authority | Sponsor/Product owner | 2026-07-03 |
| November Auto POS inclusion/exclusion | Sponsor/Product/Tech Lead | Scope lock |
| Benefit baselines and financial attribution | Product/Finance | Before shadow run |

## 18. Delivery governance and reporting

Progress is reported by accepted capability, not code completion. The weekly product report includes:

- Requirement status by NOV-1 domain and channel.
- Gate health and decisions needed.
- End-to-end scenario pass rate.
- Shadow mismatch by classification.
- Load/resilience/security evidence status.
- Defect severity and aging.
- Channel quota/certification readiness.
- Scope additions/removals and contingency remaining.
- Business benefit baseline readiness.

The Product Owner owns scope and acceptance. The Tech Lead owns architecture and engineering quality. QA owns evidence completeness. Channel and enterprise owners certify external behavior. The Release Manager owns writer transfer and rollback. The sponsor decides funding and accepts material scope/date trade-offs.

## 19. Glossary

| Term | Meaning |
|---|---|
| ATS | Available to Sell after stock, reservations, safety, and allocation rules |
| Canonical model | Channel-independent business representation |
| Clubpack | A seller listing representing multiple enterprise units |
| Desired state | Latest approved seller-facing value Phoenix intends to achieve |
| DLQ | Dead-letter queue for terminal/quarantined events requiring remediation |
| Drain time | Forecast time required to clear pending work within effective API capacity |
| LDD | Enterprise price/promotion source terminology used with RMS/LDD |
| MFC | Micro-fulfilment center/system within the external fulfilment estate |
| Quota scope | Exact boundary to which an external rate limit applies |
| Shadow mode | Phoenix calculates and records outcomes without owning external writes |
| Writer ownership | Explicit authority for Phoenix or legacy to write a domain/channel/cohort |

## 20. Sponsor approval requested

Approval of this PRD confirms:

1. The November release is the narrow breadth-first MVP defined in Sections 2, 5, 6, and 14.
2. Shopee, Lazada, and TikTok are Wave 1 commitments; WeChat, Amaze, and Makro Pro remain conditional on gates.
3. ATS, stock sync, full listing creation, complete fulfilment/status workflows, mart channels, BI, and advanced intelligence are separately funded later phases.
4. Option B shadow fallback activates automatically for a conditional channel that misses a gate.
5. Scope additions require equal or larger removal after July 3.
6. Business owners will provide mappings, contracts, credentials, quota evidence, certification access, and benefit baselines by the stated dates.
7. Later-phase investment will be evaluated using the measurable business outcomes defined in Section 15.
