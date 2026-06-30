# Sprint 09 Plan — Cutover & Production Release

**Sprint:** 2026-10-19 to 2026-10-30 (10 working days)  
**Team:** 6 Developers + 4 QA + TL  
**Theme:** Production readiness completion, cutover rehearsal, technical cutover, rollback capability, go-live confirmation

---

## Team Roster

| Code | Role | Sprint Focus |
|------|------|-------------|
| TL | Tech Lead | Cutover command, go/no-go decisions, stakeholder communication |
| DEV-01 | DevOps/Platform | Cutover execution, production monitoring, rollback readiness |
| DEV-04 | Adapter SDK | Production retry/audit verification, permission checks |
| DEV-07 | Order Sync | Order pipeline readiness, acceptance monitoring |
| DEV-09 | Stock Sync / ATS | Stock pipeline readiness, ATS monitoring |
| DEV-11 | Shopee/Lazada | Adapter production monitoring, certification sign-off |
| DEV-12 | TikTok/Amaze | Adapter production monitoring, certification sign-off |
| QA-01 | QA Lead | Release evidence package, production smoke tests |
| QA-04 | Integration QA | Production verification tests |
| QA-05 | Performance SDET | Production load validation |
| QA-06 | Admin Portal QA | Production operator workflow validation |

---

## Story 9.1: Production Readiness Verification

**Gantt Code:** t6  
**Narrative:** As the **DevOps Engineer**, I want to complete the production readiness checklist covering secrets, PII, access control, deployment approvals, and runbooks, so that all items are verified before cutover.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the production readiness checklist, when the DevOps team verifies each item, then secrets management, PII handling, access controls, monitoring, alerting, and runbooks should all pass and any gaps resolved before cutover.  
**Scenario 2:** Given the deployment approval workflow, when a release is promoted to production, then it should require approval from the Tech Lead and QA Lead.

---

## Story 9.2: Cutover Rehearsal (Staging)

**Gantt Code:** t6  
**Narrative:** As the **DevOps Engineer**, I want to execute a final cutover rehearsal in staging with the full team, so that everyone knows their role and the procedure is proven.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given the staging environment, when the rehearsal executes, then writer ownership transfers from legacy to Phoenix per plan, all channels accept Phoenix updates, and monitoring shows healthy metrics.  
**Scenario 2:** Given the system is operating with Phoenix as writer, when rollback executes, then writer ownership returns to legacy and the legacy system resumes all writes without data loss within 30 minutes.

---

## Story 9.3: Technical Cutover Execution

**Gantt Code:** cutover  
**Narrative:** As the **Tech Lead**, I want to execute the technical cutover — transferring production writer ownership from legacy to Phoenix — so that the November 1 business go-live is enabled.  
**Story Points:** 3

### Acceptance Criteria
**Scenario 1:** Given all pre-cutover checks pass (readiness checklist, rehearsal success, business approval), when the cutover window opens, then writer ownership should transfer per the approved cutover plan and each channel should be verified independently.  
**Scenario 2:** Given cutover is complete and 30 minutes of monitoring elapses, then order acceptance, product sync, price sync, stock sync, and fulfilment hand-off should all be healthy.  
**Scenario 3:** Given a critical issue detected during cutover, when the rollback trigger criteria are evaluated, then the TL should have authority to execute rollback within 15 minutes.

---

## Story 9.4: Final Production Verification & Smoke Tests

**Gantt Code:** t4, t5  
**Narrative:** As the **QA Lead**, I want to execute final production verification smoke tests and confirm all UAT and parallel run evidence is complete, so that business stakeholders have confidence for go-live.  
**Story Points:** 4

### Acceptance Criteria
**Scenario 1:** Given the system is live with Phoenix as writer, when QA executes production smoke tests, then order ingestion, product sync, price sync, stock sync, and Admin Portal should all function correctly.  
**Scenario 2:** Given the release evidence package, when reviewed by TL and QA Lead, then it should include SIT results, load/stress test results, resilience test results, UAT sign-off, parallel run reconciliation report, and cutover rehearsal results.

---

## Delivery Commitments

| Story | Gantt Code | Dev Owner | QA Owner | SP | Target |
|-------|-----------|-----------|----------|:---:|--------|
| 9.1 Production Readiness Verification | t6 | DEV-01 | QA-01 | 4 | Oct 22 |
| 9.2 Cutover Rehearsal (Staging) | t6 | DEV-01 | QA-01 | 3 | Oct 24 |
| 9.3 Technical Cutover Execution | cutover | TL | QA-01 | 3 | Oct 30 |
| 9.4 Final Production Verification | t4, t5 | QA-01 | QA-01 | 4 | Oct 30 |
