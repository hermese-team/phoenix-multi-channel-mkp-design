# DevOps Kickoff Meeting — Sprint 1

**Purpose:** Align on infrastructure foundation that all 7 domain teams depend on  
**Attendees:** DevOps Team, DEV-02 (Backend Foundation), TL  
**Duration:** 90 minutes  
**Prerequisites:** Read Sprint 1 Plan, architecture01-pmc.md §2.3, §6–§7

---

## Goals

1. **Lock the K8s + CI/CD delivery plan** for Sprint 1 — dev cluster, GitOps pipeline, Helm conventions
2. **Define the local dev environment contract** — Docker Compose stack all developers will use
3. **Agree Kafka/Redpanda provisioning approach** — cluster vs container, topic automation, schema registry
4. **Confirm PostgreSQL strategy** — managed service vs in-cluster, migration tooling, partition conventions
5. **Align on NFR sizing assumptions** — CPU/memory/disk baselines per service, Kafka retention, connection budgets

---

## Agenda

### 1. Kubernetes Cluster & GitOps Bootstrap (30 min)

**Context:** Three services stories depend on this (f1: 1.5a/b/c = 11 MD). All domain teams need a namespace to deploy by Jul 13.

**Decisions needed:**

| Item | Options | Decision |
|------|---------|----------|
| K8s distribution | EKS / GKE / AKS / on-prem | |
| GitOps tool | ArgoCD / Flux | |
| CI platform | GitHub Actions / GitLab CI / Jenkins | |
| Namespace strategy | Per-domain (product, price, order, stock, adapters) vs per-team | |
| Container registry | ECR / GCR / Docker Hub / private registry | |
| Ingress controller | nginx-ingress / traefik / ALB | |
| Secrets management | External Secrets / Vault / K8s Secrets + SOPS | |

**Acceptance criteria to confirm:**
- Dev namespace provisioned with resource quotas and ArgoCD/Flux sync this week
- CI pipeline builds a sample Go service, lints, tests, pushes image tagged with commit SHA
- Helm chart skeleton exists for Go microservice with readiness/liveness probes and resource limits
- Dev→staging promotion pipeline design is drafted

**Deliverable:** ADR for infrastructure stack decisions + repo skeleton with CI pipeline by end of Sprint 1.

---

### 2. Local Development Environment (15 min)

**Context:** All 7+ developers need a consistent local environment immediately. The Docker Compose stack from Sprint 1 scaffolding must include the services domain teams depend on.

**Required in Docker Compose:**

| Service | Purpose | Port |
|---------|---------|------|
| PostgreSQL 16 | Local database for development | 5432 |
| Redpanda (Kafka) | Event backbone + schema registry | 9092 / 9641 |
| Redis 7 | Local cache / ATS simulation | 6379 |
| MinIO | S3-compatible object storage | 9000 / 9001 |
| (Optional) Schema registry UI | Visual schema inspection | 8081 |

**Questions:**
- Should we add a Kafka UI (Redpanda Console, AKHQ) to the stack?
- Who maintains the `docker-compose.yml` and how are version bumps communicated?
- Should there be a `make dev-up` / `make dev-down` convention?

**Deliverable:** Working `docker compose up -d` with all services healthy, verified by all developers this sprint.

---

### 3. Kafka/Redpanda Provisioning (20 min)

**Context:** Story 1.6a (f2, 5 SP) requires Kafka topic creation and schema registry by Jul 7. Story 1.6b (f2, 5 SP) needs producer/consumer libraries by Jul 10.

**For the DevOps team:**

| Topic | Our env needs | Timeline |
|-------|---------------|----------|
| Dev cluster Kafka | Do we provision a 3-broker Redpanda cluster or use a managed service? | Sprint 1 |
| Schema registry | Part of Redpanda or separate? Should be accessible from local dev | Sprint 1 |
| Topic creation automation | Terraform provider vs `kafka-topics.sh` vs script in repo | Sprint 1 |
| Retry/DLQ topic pattern | Confirm naming: `{domain}.v1-retry`, `{domain}.v1-dlq` | Sprint 1 |
| Dashboard | Redpanda Console / Prometheus + Grafana for consumer lag | Sprint 2 |

**Decision needed:** What is the minimal Kafka setup that unblocks domain development while we build the production-grade topology?

**NFR sizing to confirm (from Story 1.2b):**
- 6 partitions per domain topic (product, price, stock, order, fulfilment, sync-result)
- RF=3, min.insync.replicas=2, acks=all
- Retention period for dev vs staging vs prod

**Deliverable:** Kafka topic creation script (`make kafka-topics`) + schema registry accessible from DEV-02 by Jul 7.

---

### 4. PostgreSQL Strategy (15 min)

**Context:** Story 1.7a (f3, 4 SP) needs migration scripts and domain tables by Jul 9. Story 1.7b (f3, 4 SP) needs partitions and read-model views by Jul 10.

**For the DevOps team:**

| Item | Purpose | Timeline |
|------|---------|----------|
| Dev database | Part of Docker Compose — does this suffice or do we need a shared dev DB? | Sprint 1 |
| Migration tooling | golang-migrate / goose / in-house — what integrates best? | Sprint 1 |
| Read replica for queries | Only needed in staging/prod — confirm when to provision | Sprint 3+ |
| Connection pooling | PgBouncer in the cluster? | Sprint 2 |

**Decision needed:** Confirming migration framework and whether shared dev database is needed beyond local Docker Compose.

**Deliverable:** Migration tooling selected and `make db-migrate` / `make db-rollback` commands working by Jul 9.

---

### 5. NFR Sizing & Resource Planning (10 min)

**Context:** Story 1.2b defines SLOs and sizing assumptions that impact infrastructure provisioning.

**Key numbers to validate:**

| Parameter | Target | Implication |
|-----------|--------|-------------|
| Order acceptance | p99 ≤ 250ms at 250 ops/sec | Kafka + app latency budget |
| Stock update | p95 ≤ 60s | Quota-aware scheduling, not raw throughput |
| Price sync | p95 ≤ 5min | Batch delivery, not real-time |
| Storage envelope | 1–2 TB over 3 years for PostgreSQL | Retention and archive planning |
| Kafka retention | 7 days hot then object storage | Disk sizing at 500 GB/broker starting point |
| Redis ATS | 2x peak memory headroom | Key count estimation for store×SKU |
| Channel quota | 100 req/min per channel with 80/20 split | Outbound capacity planning |

**Questions:**
- Are the disk sizing and retention assumptions acceptable for the DevOps team's budget/capacity?
- What monitoring/alerting infrastructure is needed from day 1 vs later?

---

## Action Items

| # | Action | Owner | Due |
|---|--------|-------|-----|
| 1 | Publish ADR with K8s, GitOps, CI stack decisions | DevOps | Jul 3 |
| 2 | Create repo structure with CI pipeline + Helm chart skeleton | DevOps | Jul 3 |
| 3 | Deliver working `docker-compose.yml` (PG + Redpanda + Redis + MinIO) | DevOps | Jul 1 |
| 4 | Deliver `make kafka-topics` script with Retry/DLQ convention | DevOps + DEV-02 | Jul 7 |
| 5 | Deliver `make db-migrate` with golang-migrate | DevOps + DEV-02 | Jul 9 |
| 6 | Confirm NFR sizing assumptions in shared doc | TL + DevOps | Jul 10 |
