# Sprint 06 Plan — Finalize Development & Feature Complete

**Sprint:** 2026-09-07 to 2026-09-18 (10 working days)  
**Team:** 12 Developers + 6 QA + TL  
**Theme:** Finalize all domain features, Admin Portal UX polish, channel certification complete, end-to-end feature complete milestone

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | Feature-complete gate review, certification sign-off, cutover prep |
| DEV-01 | DevOps/Platform | f5 complete, production readiness start, environment stabilization |
| DEV-02 | Backend Foundation | Infrastructure hardening, connection pool tuning |
| DEV-03 | Contracts & Schema | Schema registry ops, p4 listing read-back support |
| DEV-04 | Adapter SDK | a5 complete (retry controls), a6 (UX polish support) |
| DEV-05 | Product Sync | p3b complete, p4 complete, a4 complete |
| DEV-06 | Price & Promotion | r4 complete, r3 complete (scheduler finalized) |
| DEV-07 | Order Sync | o1b complete, a2 complete (order monitoring) |
| DEV-08 | Fulfilment Routing | o4 complete, a3 complete (SKU mapping upload) |
| DEV-09 | Stock Sync + Redis | i2 complete, i3 complete, i4 complete |
| DEV-10 | Stock Orchestration | i3 complete, i4 complete |
| DEV-11 | Shopee/Lazada | c1/c2 certification complete, certification fixes (c5a, c5b) |
| DEV-12 | TikTok/Amaze | c3/c4 continue, certification fixes (c5c, c5d) |
| QA-01 | QA Lead | SIT phase 2, feature-complete validation |
| QA-02 | Contract QA | s3 complete, final contract regression |
| QA-03 | Domain QA | Final reconciliation tests, p4 stale-detection tests |
| QA-04 | Integration QA | Channel E2E certification sign-off |
| QA-05 | Performance SDET | f6 complete, load harness scenarios ready |
| QA-06 | Admin Portal QA | a6 UAT hardening, complete regression |

---

## Story 6.1: Shopee Certification & Fixes

**Gantt Code:** c1, c5a  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to complete Shopee sandbox certification and apply any schema mismatches, batch-size, or auth fixes found during certification, so that Shopee adapter is production-ready.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given Shopee sandbox, when the full certification suite runs, then auth, inbound order, product outbound, price outbound, and stock outbound should all pass.  
**Scenario 2:** Given a certification fix is required (e.g., field mapping mismatch), when applied, then the fix should be tested against the sandbox and the certification suite should pass.

---

## Story 6.2: Lazada Certification & Fixes

**Gantt Code:** c2, c5b  
**Narrative:** As the **Shopee/Lazada Adapter Engineer**, I want to complete Lazada sandbox certification with fixes, so that Lazada adapter is production-ready.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given Lazada sandbox, when the full certification suite runs, then all E2E flows should pass with Lazada-specific payload formats.  
**Scenario 2:** Given any certification failures, when the fixes are applied, then the suite should pass successfully.

---

## Story 6.3: TikTok Certification & Fixes

**Gantt Code:** c3, c5c  
**Narrative:** As the **TikTok/Channel Adapter Engineer**, I want to complete TikTok sandbox certification with fixes, so that TikTok adapter is production-ready.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given TikTok sandbox, when the full certification suite runs, then auth, polling order ingestion, and outbound sync should all pass.  
**Scenario 2:** Given any certification issues found, when fixes are applied, then all tests should pass.

---

## Story 6.4: Amaze/AxtraMall Certification & Fixes

**Gantt Code:** c4, c5d  
**Narrative:** As the **TikTok/Channel Adapter Engineer**, I want to complete Amaze/AxtraMall sandbox certification, so that all four channels are production-ready.  
**Story Points:** 2

### Acceptance Criteria
**Scenario 1:** Given Amaze/AxtraMall sandbox, when the full certification suite runs, then all E2E flows should pass.  
**Scenario 2:** Given last-minute fixes needed, when applied, then the certification suite should pass.

---

## Story 6.5: Admin Portal UX Polish — Empty/Loading/Error States

**Gantt Code:** a6  
**Narrative:** As the **Adapter SDK Engineer** (supporting Admin Portal), I want to add empty states, loading spinners, error messages, and permission-defect fixes across all Admin Portal screens, so that the operator experience is polished for UAT.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the order monitoring portal with no matching results, when the operator searches, then an empty state message should display with suggestions.  
**Scenario 2:** Given a slow API call, when loading, then a spinner should show and the UI should not block.  
**Scenario 3:** Given an API error, when it occurs, then a user-friendly error message should display with a retry option.

---

## Story 6.6: Admin Portal UX Polish — Accessibility & UAT Hardening

**Gantt Code:** a6  
**Narrative:** As the **Adapter SDK Engineer** (supporting Admin Portal), I want to implement basic accessibility (keyboard navigation, screen reader labels) and address UAT feedback, so that the Admin Portal meets usability standards.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given keyboard-only navigation, when the operator uses Tab and Enter to navigate order monitoring, mapping upload, and retry controls, then all interactive elements should be reachable and activatable.  
**Scenario 2:** Given UAT feedback from operator workflow testing, when the feedback is addressed, then workflows should be polished and confirmation wording improved.

---

## Story 6.7: Scheduler & Price Reconciliation Finalized

**Gantt Code:** r3, r4  
**Narrative:** As the **Price & Promotion Sync Engineer**, I want to finalize the quota-aware scheduler and price reconciliation with all edge cases handled and exportable reports, so that the price pipeline is production-ready.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given a channel with zero quota (rate-limited), when commands arrive, then they should be queued without error and dispatch when quota is restored.  
**Scenario 2:** Given the price reconciliation engine has run, when the operator exports the report, then it should be a CSV with SKU, channel, desired_price, acknowledged_price, drift_status, last_sync_at.

---

## Story 6.8: Feature-Complete Gate Verification

**Gantt Code:** devdone  
**Narrative:** As the **Tech Lead**, I want to verify that all Gantt-scoped features pass their acceptance criteria before the development-complete gate, so that the project transitions from feature development to integrated testing.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the complete set of E2E test suites, when executed against the latest build, then product, price, order, stock, and fulfilment E2E flows should all pass and all four channel adapters should have passing certification.  
**Scenario 2:** Given the defect tracker, when the feature-complete gate is evaluated, then there should be zero open Sev 1/Sev 2 defects and all known limitations documented.  
**Scenario 3:** Given the Admin Portal is deployed, when an operator logs in, then order monitoring, mapping upload, product sync config, and sync telemetry screens should all be functional.

---

## Story 6.9: SIT Phase 2 — Full Regression

**Gantt Code:** t1  
**Narrative:** As the **QA Lead**, I want to execute SIT phase 2 with full regression across all domains, retries, DLQ, replay, and reconciliation, so that the system is validated before formal testing.  
**Story Points:** 5

### Acceptance Criteria
**Scenario 1:** Given the full regression suite, when executed, then product, price, order, stock, and fulfilment flows should all pass, and channel isolation (one outage does not block others) should be validated.  
**Scenario 2:** Given a transient failure scenario, when the retry mechanism engages, then the message should be retried with backoff and eventually succeed. Given a permanent failure, it should route to DLQ.  
**Scenario 3:** Given writer ownership enforcement, when a channel is `writer=PHOENIX`, then Phoenix should write, and when `writer=LEGACY`, it should skip with a governance event.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 6.1 Shopee Certification & Fixes | c1, c5a | DEV-11 | QA-04 | 3 | Sep 12 |
| 6.2 Lazada Certification & Fixes | c2, c5b | DEV-11 | QA-04 | 3 | Sep 14 |
| 6.3 TikTok Certification & Fixes | c3, c5c | DEV-12 | QA-04 | 3 | Sep 15 |
| 6.4 Amaze/AxtraMall Certification & Fixes | c4, c5d | DEV-12 | QA-04 | 2 | Sep 16 |
| 6.5 Admin Portal UX — Empty/Loading/Error States | a6 | DEV-04 | QA-06 | 3 | Sep 14 |
| 6.6 Admin Portal UX — Accessibility & UAT Hardening | a6 | DEV-04 | QA-06 | 3 | Sep 17 |
| 6.7 Scheduler & Price Reconciliation Finalized | r3, r4 | DEV-06 | QA-03 | 4 | Sep 15 |
| 6.8 Feature-Complete Gate Verification | devdone | TL | QA-01 | 3 | Sep 18 |
| 6.9 SIT Phase 2 — Full Regression | t1 | QA-01 | QA-01 | 5 | Sep 18 |
