# Sprint 08 Plan — UAT, Parallel Run & Resilience Completion

**Sprint:** 2026-10-05 to 2026-10-16 (10 working days)  
**Team:** 8 Developers + 6 QA + TL  
**Theme:** UAT execution, parallel run with legacy comparison, resilience testing completion, critical defect fixing

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | UAT triage, parallel run review, cutover go/no-go |
| DEV-01 | DevOps/Platform | Production readiness complete, cutover rehearsal support |
| DEV-03 | Contracts & Schema | Defect triage, schema compatibility fixes |
| DEV-04 | Adapter SDK | UAT retry/audit workflow fixes, a5 stabilization |
| DEV-05 | Product Sync | UAT product/certification issues, parallel run |
| DEV-07 | Order Sync | UAT order workflow issues, parallel run |
| DEV-08 | Fulfilment Routing | UAT fulfilment/cancellation issues |
| DEV-09 | Stock Sync / ATS | UAT stock issues, parallel run |
| DEV-11 | Shopee/Lazada | UAT adapter issues, certification fixes |
| DEV-12 | TikTok/Amaze | UAT adapter issues, certification fixes |
| QA-01 | QA Lead | Release evidence, test completion report |
| QA-02 | Contract QA | Regression suite final pass |
| QA-03 | Domain QA | t5 (parallel run execution) |
| QA-04 | Integration QA | t4 (UAT execution with business users) |
| QA-05 | Performance SDET | t3 (resilience testing complete) |
| QA-06 | Admin Portal QA | a6 UAT support, operator workflow validation |

---

## Story 8.1: UAT — Business Validation (Product & Price)

**Gantt Code:** t4  
**Narrative:** As the **Integration QA Lead**, I want to execute UAT with business users validating product mappings and price/promotion behavior, so that the business confirms correctness before go-live.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given business users with product mapping test scenarios, when they execute UAT, then product SKU→listing mappings should produce correct channel outcomes and any incorrect mappings logged as defects.  
**Scenario 2:** Given business users with price/promotion scenarios, when they validate effective pricing on channels, then the correct prices and promotions should be applied and guardrails should quarantine suspicious prices.

---

## Story 8.2: UAT — Operations Validation (Orders, Stock, Admin Portal)

**Gantt Code:** t4  
**Narrative:** As the **Integration QA Lead**, I want to execute UAT with operations users validating order handling, stock outcomes, and Admin Portal workflows, so that operators confirm readiness.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given operators with order handling scenarios, when they execute UAT, then order ingestion, fulfilment routing, and cancellation flows should behave as specified.  
**Scenario 2:** Given operators with Admin Portal scenarios, when they validate order monitoring, mapping upload, product sync config, and retry controls, then all screens should work correctly and exception handling should show clear messages.  
**Scenario 3:** Given UAT test evidence is collected, when the sign-off is requested, then all test cases should be documented with pass/fail status and signed off by business stakeholders.

---

## Story 8.3: Parallel Run — Product & Price Reconciliation

**Gantt Code:** t5  
**Narrative:** As the **Domain QA**, I want to execute parallel run comparing Phoenix vs legacy outputs for product and price domains, so that drift is quantified before writer transfer.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given Phoenix and legacy both process the same RMS product feed for 24 hours, when the parallel run compares outputs, then Phoenix product updates should match or improve upon legacy outcomes.  
**Scenario 2:** Given Phoenix and legacy both process the same R10/LDD price feed, when compared, then effective prices on channels should match within acceptable tolerance.

---

## Story 8.4: Parallel Run — Order & Stock Reconciliation

**Gantt Code:** t5  
**Narrative:** As the **Domain QA**, I want to execute parallel run comparing Phoenix vs legacy for order acceptance and stock sync, so that no duplicate or lost outcomes occur.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given Phoenix and legacy both ingest the same order stream in parallel for 24 hours, when compared, then Phoenix should accept all orders that legacy accepted and no duplicate orders should be created on channels.  
**Scenario 2:** Given the parallel run completes, when the reconciliation report is generated, then it should include drift analysis per domain/channel with a writer-transfer readiness recommendation.

---

## Story 8.5: Resilience — Redis Failover & Replay Correctness

**Gantt Code:** t3  
**Narrative:** As the **Performance SDET**, I want to complete resilience testing with Redis failover and replay correctness validation, so that no-loss acceptance evidence is produced.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a Redis primary fails, when the replica promotes, then ATS state should be preserved and no stock operations should be lost during failover.  
**Scenario 2:** Given a full replay of 24 hours of Kafka events, when the replay completes, then the PostgreSQL state should match the pre-replay state and no duplicate events should be created on channels.

---

## Story 8.6: Resilience — Duplicate Suppression & No-Loss Evidence

**Gantt Code:** t3  
**Narrative:** As the **Performance SDET**, I want to verify zero duplicate business outcomes during all failure scenarios and produce no-loss acceptance evidence, so that the system meets correctness guarantees.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a series of injection scenarios (pod failures, broker failures, network partitions), when the system recovers from each, then order records should show zero duplicate business outcomes and the idempotency key table should have no duplicate entries.  
**Scenario 2:** Given all resilience tests are complete, when the evidence report is compiled, then it should include each test scenario, the outcome, and a no-loss attestation.

---

## Story 8.7: Cutover Rehearsal — Kill Switch & Writer Transfer

**Gantt Code:** t6  
**Narrative:** As the **DevOps Engineer**, I want to complete cutover rehearsal preparation including kill switch verification and writer transfer procedure testing, so that the technical cutover is proven.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given an incident requiring fallback to legacy, when the kill switch is activated for Shopee, then Phoenix should stop writing within 60 seconds and the legacy system should resume without gap.  
**Scenario 2:** Given writer for a channel has been transferred from legacy to Phoenix, when the rollback plan is executed, then writer ownership should return to legacy within 5 minutes without data loss or duplicate writes.

---

## Story 8.8: Cutover Rehearsal — Full Dress Rehearsal

**Gantt Code:** t6  
**Narrative:** As the **DevOps Engineer**, I want to execute a full cutover dress rehearsal in staging covering writer transfer, monitoring validation, and rollback, so that the team is confident in the cutover procedure.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the staging environment mirrors production, when the cutover rehearsal is executed, then writer ownership should transfer per the plan, all channels should accept Phoenix updates, and monitoring should show healthy metrics.  
**Scenario 2:** Given the system is operating with Phoenix as writer, when the rollback procedure is executed, then writer ownership should return to legacy and the legacy system should resume all writes without data loss within 30 minutes.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 8.1 UAT — Business Validation (Product & Price) | t4 | QA-04 | QA-04 | 4 | Oct 10 |
| 8.2 UAT — Operations Validation (Orders, Stock, Portal) | t4 | QA-04 | QA-04 | 4 | Oct 14 |
| 8.3 Parallel Run — Product & Price | t5 | QA-03 | QA-03 | 3 | Oct 12 |
| 8.4 Parallel Run — Order & Stock | t5 | QA-03 | QA-03 | 2 | Oct 14 |
| 8.5 Resilience — Redis Failover & Replay | t3 | QA-05 | QA-05 | 3 | Oct 10 |
| 8.6 Resilience — Duplicate Suppression & Evidence | t3 | QA-05 | QA-05 | 3 | Oct 14 |
| 8.7 Cutover Rehearsal — Kill Switch & Writer Transfer | t6 | DEV-01 | QA-01 | 3 | Oct 11 |
| 8.8 Cutover Rehearsal — Full Dress Rehearsal | t6 | DEV-01 | QA-01 | 3 | Oct 15 |
