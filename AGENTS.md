# Phoenix Multi-Channel Marketplace — Agent Guidelines

## User Story Creation: Backend TDD Blueprint

When writing backend user stories for this project, always follow this structure:

### 1. Core Narrative (Value Focus)

Use the **System Actor** approach for system-to-system actions:

```
As a [System Role / Channel API / Channel Manager]
I want to [Action performed by the backend]
So that [Business value achieved]
```

### 2. Technical Context & Scope

Define boundaries, APIs involved, data formats, idempotency keys, and downstream dependencies. This prevents scope creep during TDD cycles.

### 3. Story Points

Each user story MUST have a story point value that reflects effort in mandays.
- **Maximum:** 5 story points per story (1 SP = 1 MD).
- If a story exceeds 5 SP, it MUST be split into multiple smaller stories.
- Typical sizes: 2 SP (small), 3 SP (medium), 5 SP (large but safe).
- Add `**Story Points:** N` to each story.

### 4. Scenario-Based Acceptance Criteria (Given-When-Then)

Each scenario translates directly into a test case:

```
Scenario N: [Scenario Name]
Given [precondition/state]
When [action is performed]
Then [expected outcome]
```

Include scenarios for:
- **Happy Path** — the primary success case
- **Edge Case / Error Handling** — validation failures, missing data
- **Idempotency / Duplicate Guard** — replay safety
- **Failure / Retry** — transient vs permanent classification

---

## Sprint Plan Structure

Each sprint plan must include:
- **Sprint dates and team assignment** (who is responsible for what)
- **User stories** in the TDD blueprint format above (each ≤5 SP)
- **Delivery commitments** table (story, owner, QA owner, SP, target date)
- **Dependencies & blockers** table
- **Definition of Done**

---

## Project Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.22+ |
| Events | Kafka (Redpanda) via Avro/Protobuf |
| Schemas | Protobuf (`.proto` → Go codegen) |
| State DB | PostgreSQL 16 with time partitions |
| Cache/ATS | Redis 7 with Lua scripting |
| Object Store | S3-compatible (MinIO for local dev) |
| Deployment | Kubernetes (deferred — Docker Compose for now) |
| Admin Frontend | React / Next.js |
| Local Dev | Docker Compose (Redpanda + PostgreSQL + Redis + MinIO) |
| Testing | Go `testing` + `testify` + `testcontainers-go` |

---

## Service Role Codes

| Code | Role | Likely Sprint Assignments |
|------|------|--------------------------|
| DEV-02 | Backend/platform foundation engineer | Project scaffolding, PostgreSQL, Kafka setup |
| DEV-03 | Shared contracts and schema engineer | Protobuf schemas, error taxonomy, idempotency |
| DEV-04 | Shared adapter SDK engineer | HTTP client, auth, retry, circuit-breaker |
| DEV-05 | Product Sync engineer | Product domain, RMS ingestion, price/promo |
| DEV-06 | Price and Promotion Sync engineer | Price engine, promotion rules |
| DEV-07 | Order Sync engineer | Order ingestion, normalization |
| DEV-08 | Fulfilment routing engineer | WMS hand-off, routing |
| DEV-09 | Stock Sync / ATS engineer | Stock ingestion, ATS, Redis |
| DEV-10 | Stock orchestration engineer | Coalescing, outbound stock sync |
| DEV-11 | Shopee/Lazada adapter engineer | Channel-specific adapters |
| DEV-12 | TikTok/channel adapter engineer | Channel-specific adapters |
| QA-02 | API and contract automation QA | Contract tests, fixture framework, mock APIs |

---

## TDD Workflow

1. **Write the test first** — Given-When-Then scenarios as Go test functions
2. **Run the test** — it should fail (red)
3. **Write the minimum production code** to pass the test
4. **Run the test** — it should pass (green)
5. **Refactor** — clean up while keeping tests green
6. **Commit** with a message that references the story/scenario
