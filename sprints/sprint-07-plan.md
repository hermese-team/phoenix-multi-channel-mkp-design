# Sprint 07 Plan — SIT, Load & Resilience Testing

**Sprint:** 2026-09-21 to 2026-10-02 (10 working days)  
**Team:** 9 Developers + 6 QA + TL  
**Theme:** Formal SIT completion, load/stress testing (250/500 ops/sec), resilience testing start, production readiness prep

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | SIT defect triage, resilience scenario sign-off, cutover rehearsal prep |
| DEV-01 | DevOps/Platform | Load/stress environment, production readiness (t6 start) |
| DEV-02 | Backend Foundation | Infrastructure tuning for load tests, Kafka/PostgreSQL optimization |
| DEV-03 | Contracts & Schema | Schema registry ops, defect triage support |
| DEV-04 | Adapter SDK | SIT defect fixes, retry/DLQ scenario support |
| DEV-05 | Product Sync | SIT defect fixes, reconciliation evidence |
| DEV-07 | Order Sync | SIT defect fixes, order pipeline stabilization |
| DEV-08 | Fulfilment Routing | SIT defect fixes, fulfilment hand-off stabilization |
| DEV-09 | Stock Sync / ATS | SIT defect fixes, stock pipeline stabilization |
| DEV-11 | Shopee/Lazada | SIT defect fixes, adapter stabilization |
| DEV-12 | TikTok/Amaze | SIT defect fixes, adapter stabilization |
| QA-01 | QA Lead | SIT phase 2 completion, test evidence |
| QA-02 | Contract QA | Regression suite, contract stability |
| QA-03 | Domain QA | Domain-specific regression testing |
| QA-04 | Integration QA | Cross-domain integration regression |
| QA-05 | Performance SDET | t2 (load/stress), t3 (resilience start) |
| QA-06 | Admin Portal QA | a6 regression, UAT prep |

---

## Story 7.1: SIT Completion — Full Regression Pass

**Gantt Code:** t1  
**Narrative:** As the **QA Lead**, I want to complete SIT with full regression, writer ownership validation, and channel isolation tests, so that all domain flows are validated end-to-end before formal load testing.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the full regression suite, when executed, then product, price, order, stock, and fulfilment flows should all pass without Sev 1/Sev 2 defects.  
**Scenario 2:** Given writer ownership is enforced, when `writer=PHOENIX` for channel X, then Phoenix writes are confirmed, and when `writer=LEGACY`, Phoenix skips with a governance event.  
**Scenario 3:** Given one channel API is down (simulated), when other channels process orders, then the outage should not block other channels.

---

## Story 7.2: Load Testing — 250 orders/sec Baseline

**Gantt Code:** t2  
**Narrative:** As the **Performance SDET**, I want to execute the 250 orders/sec baseline load test for 2 minutes, so that order acceptance meets the p99 ≤ 250ms SLO and zero orders are lost.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the load harness generates 250 orders/sec for 2 minutes, when the system processes them, then p99 latency should be ≤ 250ms for order acceptance and zero orders should be lost.  
**Scenario 2:** Given the load test completes, when metrics are collected, then the throughput should be exactly 30,000 orders accepted, and p99, p95, and p50 latencies should be reported.

---

## Story 7.3: Load Testing — 500 ops/sec Burst Headroom

**Gantt Code:** t2  
**Narrative:** As the **Performance SDET**, I want to execute the 500 orders/sec burst test for 2 minutes with concurrent price/promo and stock bursts, so that the system handles 2x peak load without degradation.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the load harness generates 500 orders/sec for 2 minutes (2x peak), when processed, then all 60,000 orders should be accepted and no component should crash or exhaust memory.  
**Scenario 2:** Given a 500 ops/sec scenario with concurrent price updates for 500 SKUs and 1000 stock movements, when processed, then all price and stock updates should complete within their SLOs.  
**Scenario 3:** Given the load test completes, when resources are inspected, then CPU, memory, and Kafka lag should all be within acceptable thresholds.

---

## Story 7.4: Resilience — Pod & Broker Failure

**Gantt Code:** t3  
**Narrative:** As the **Performance SDET**, I want to test pod failure and Kafka broker failure scenarios, so that failover and replay correctness are proven.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a consumer pod processing orders, when the pod is terminated, then no accepted orders should be lost and another pod should resume processing within 30 seconds.  
**Scenario 2:** Given a 3-broker Kafka cluster, when one broker fails, then producers should continue publishing to remaining brokers and no committed messages should be lost.

---

## Story 7.5: Resilience — External API Outage & Retry Storm

**Gantt Code:** t3  
**Narrative:** As the **Performance SDET**, I want to test external API outage with retry storm protection, so that the system does not exhaust channel quotas on retries during an outage.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the Shopee API is unavailable, when outbound commands fail with connection errors, then the system should queue them with backoff and NOT exhaust all quota tokens on retries during the outage.  
**Scenario 2:** Given the API recovers after 5 minutes, when outbound commands resume, then all queued commands should be dispatched without data loss.

---

## Story 7.6: Production Readiness — Secrets, Access & Runbooks

**Gantt Code:** t6  
**Narrative:** As the **DevOps Engineer**, I want to begin production readiness preparation: secrets management, PII compliance, access control, deployment approval workflows, and runbook documentation, so that the system is ready for cutover.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given a secrets management solution (Vault/K8s Secrets), when a service starts, then it should read secrets from the secure store and secrets should NOT be in environment variables or config files.  
**Scenario 2:** Given the operations team, when reviewing runbooks, then runbooks should exist for deployment, rollback, incident response, Kafka rebalance, PostgreSQL failover, and Redis failover.

---

## Story 7.7: Production Readiness — Monitoring & Alerting Validation

**Gantt Code:** t6  
**Narrative:** As the **DevOps Engineer**, I want to validate that all monitoring dashboards and alerts are working correctly in the staging environment, so that the operations team can rely on them during go-live.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the production monitoring dashboards are configured, when the staging deployment mirrors production, then all dashboards should show live data and all SLO burn-rate alerts should be functional.  
**Scenario 2:** Given a test alert condition (e.g., Kafka consumer lag > 1000), when triggered, then the alert should fire and notify the configured on-call channel within 1 minute.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 7.1 SIT Completion — Full Regression | t1 | QA-01 | QA-01 | 5 | Sep 28 |
| 7.2 Load Testing — 250 ops/sec Baseline | t2 | QA-05 | QA-05 | 4 | Sep 25 |
| 7.3 Load Testing — 500 ops/sec Burst | t2 | QA-05 | QA-05 | 4 | Sep 30 |
| 7.4 Resilience — Pod & Broker Failure | t3 | QA-05 | QA-05 | 3 | Sep 28 |
| 7.5 Resilience — API Outage & Retry Storm | t3 | QA-05 | QA-05 | 3 | Oct 01 |
| 7.6 Production Readiness — Secrets & Runbooks | t6 | DEV-01 | QA-01 | 3 | Sep 28 |
| 7.7 Production Readiness — Monitoring & Alerting | t6 | DEV-01 | QA-01 | 3 | Oct 01 |
