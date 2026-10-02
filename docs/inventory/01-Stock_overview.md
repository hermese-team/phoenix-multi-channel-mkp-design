# Inventory Domain — Overview

Status: Draft (shared information / requirements gathering)
Owner: DEV-09 (Stock Sync / ATS), DEV-10 (Stock orchestration)

## 1. Purpose

This document shares the information and requirements gathered for the Phoenix **inventory domain**: how enterprise stock is sourced, computed, and eventually synchronized to seller channels. It is the entry point for the inventory documentation set (`docs/inventory/*`).

## 2. Domain context

Phoenix treats stock as an enterprise-controlled signal that must be reconciled, protected, and propagated:

- **Source of truth:** the enterprise "Stock Service" system, queried via REST per store location (see [Section 3](#3-stock-service-api)). Stock Service does not push events; Phoenix polls it on a configurable interval (tentatively every 10 minutes).
- **Phoenix responsibilities (later phases):**
  - Consume uniquely identified stock movements/snapshots, archive evidence, reject stale versions, publish ordered movements (INV-201).
  - Maintain a durable stock ledger in PostgreSQL (INV-202).
  - Compute real-time **Available-to-Sell (ATS)** per store/SKU in Redis with atomic Lua scripts (INV-203).
  - Reservation lifecycle: reserve on approved channel status, release on cancel/expiry/failure (INV-204).
  - Safety stock per store/SKU/channel (INV-205) and baseline channel allocation (INV-206).
  - Stock up-sync: push changed ATS to channels through channel-isolated quota queues (INV-207).

Stock is keyed by **store location + SKU**; `hash(store_id, sku_id)` is the partition key for single-writer inventory mutation.

## 3. Stock Service API

"Stock Service" is the enterprise system that holds stock per store location. It exposes a REST API to query on-hand stock for a given store; Phoenix polls it.

### 3.1 Endpoint

```
POST {base}/ppe/amaze-mobile-bff/stock/v2/stores/{store_id}/search
```

- **Base URL (non-prod):** `https://nonprod-api-o2o-3rdparty.lotuss.com`
- **`store_id`** — path parameter identifying the store location.

### 3.2 Known store locations (store_id)

All 3 stores are in scope for Phoenix stock sync.

| store_id | Store | Managing system |
|----------|-------|-----------------|
| 7888 | Wangnoi | Cainiao WMS |
| 7886 | Samkok | Cainiao WMS |
| 9812 | (MFC store) | MFC WCS |

### 3.3 API constraints

- **Per-call limit:** max **100 items** (SKUs) per request.
- **No multi-store queries** — each store must be called separately (1 request per store).
- **Ingestion mode:** Phoenix **polls** this API on a configurable interval (tentatively every **10 minutes**). Stock Service does not push events.
- **SKU→store association:** each SKU is associated with exactly **1 store**. If stock is available at multiple stores, the store with the most stock wins; the default is **7888** (Wangnoi).

### 3.6 Headers

| Header | Value / purpose |
|--------|-----------------|
| `correlationId` | Request correlation ID for tracing (free-form, e.g. `Testing`) |
| `X-API-KEY` | API key for authentication (`f5e6163c-f35d-43a4-9c45-53926e032b9b` for non-prod) |
| `Content-Type` | `application/json` |

### 3.7 Request body

| Field | Type | Description |
|-------|------|-------------|
| `items` | array of SKU IDs | SKUs to query stock for, max 100 (e.g. `[50548802, 50840542]`) |

### 3.8 Sample call

```bash
curl --location 'https://nonprod-api-o2o-3rdparty.lotuss.com/ppe/amaze-mobile-bff/stock/v2/stores/7886/search' \
--header 'correlationId: Testing' \
--header 'X-API-KEY: f5e6163c-f35d-43a4-9c45-53926e032b9b' \
--header 'Content-Type: application/json' \
--data '{
    "items": [
        50548802,
        50840542
    ]
}'
```

### 3.9 Response schema

Example response (store 7886):

```json
{
  "status": {
    "code": 200,
    "message": "Success"
  },
  "data": {
    "storeNo": "7886",
    "items": [
      {
        "itemNo": "50548802",
        "onHandQty": 9999,
        "lastModified": "1787633785619"
      },
      {
        "itemNo": "50840542",
        "onHandQty": 9999,
        "lastModified": "1787633785377"
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status.code` | int | HTTP-like status code (200 = success) |
| `status.message` | string | Status message |
| `data.storeNo` | string | Store the response belongs to |
| `data.items[].itemNo` | string | SKU ID |
| `data.items[].onHandQty` | number | Quantity on hand |
| `data.items[].lastModified` | epoch millis | Last modified timestamp of the stock record |

> Note: `onHandQty` of 9999 in the sample is a test/placeholder value, not a production quantity.

## 4. Open questions / requirements to confirm

1. Production base URL and API key provisioning process (coming).
2. Does the API support fetching all SKUs for a store in one call, or must Phoenix track and send the full SKU list per store (and how is the SKU→store mapping maintained)?
3. Rate limits, concurrency, and retry guidance beyond the 100-item / single-store constraint.
4. Error responses and failure semantics (partial failure, missing SKU handling).
5. Whether `lastModified` can be used for incremental polling (only fetch changed SKUs) or the full list must be polled every cycle.
6. Which SKU list applies to each store (product assortment per store).

## 5. Related references

- `docs/prd-phoenix-multi-channel-marketplace.md` — §15.1 Phase 2 (INV-201..207)
- `docs/proposal01-pmc-marketplace.md` — Stock Sync / ATS design intent
- `docs/architecture01-pmc.md` — inventory service, ATS Lua, ledger, partition model
- `docs/phoenix-high-level-architecture.drawio` — Stock Service connector placement