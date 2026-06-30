# Plan: Replace OSIM -> Stock Service across 8 files

## Context

Change all references to "OSIM" as a stock data source to "Stock Service".
Topic name `osim.stock.snapshot.received` becomes `stock.snapshot.received`
(dropping the redundant "stock"). Service name `osim-stock-service` becomes
`stock-service`.

## Replacement rules

| Category | Before | After | Notes |
|---|---|---|---|
| Prose | OSIM | Stock Service | Also handles ERP/R10/OSIM, etc. |
| Service names | osim-stock-service | stock-service | kebab-case Go service name |
| Kafka topics | osim.stock.snapshot.received | stock.snapshot.received | Drop redundant stock |
| Mermaid node labels | OSIM["OSIM stock"] | StockService["Stock Service"] | Space-safe ID |
| Mermaid edges | OSIM <--> ENT | StockService <--> ENT | Matches new node ID |
| Mermaid participants | participant S as OSIM / order event | participant S as Stock Service / order event | Label only |
| drawio XML node | <b>OSIM</b> | <b>Stock Service</b> | HTML-encoded values |
| drawio XML prose | RMS, R10/LDD, OSIM | RMS, R10/LDD, Stock Service | In tables and text |

## Files and changes

### File 1: docs/proposal01-pmc-marketplace.md (14 changes)

1. L39: `RMS, OSIM, R10` -> `RMS, Stock Service, R10`
2. L46: `OSIM only` -> `Stock Service only`
3. L46: `from OSIM` -> `from Stock Service`
4. L47: `OSIM stock events` -> `Stock Service stock events`
5. L83: `osim-stock-service` -> `stock-service`
6. L107: `RMS/R10/OSIM` -> `RMS/R10/Stock Service`
7. L118: `osim.stock.snapshot.received` -> `stock.snapshot.received`
8. L138: `RMS/OSIM` -> `RMS/Stock Service`
9. L255: `OSIM stock ingestion` -> `Stock Service stock ingestion`
10. L272: `OSIM stock delta ingestion` -> `Stock Service stock delta ingestion`
11. L436: `OSIM delta ingestion` -> `Stock Service delta ingestion`
12. L489: `OSIM stock snapshot and delta ingestion` -> `Stock Service stock snapshot and delta ingestion`
13. L608: `OSIM/R10/RMS` -> `Stock Service/R10/RMS`

### File 2: Plan Nov 1 PMC.md (12 changes)

All 12 are simple OSIM -> Stock Service in prose.
- L24: dependency listing
- L68: Stock Sync workstream description
- L118: Gantt task name
- L223: external dependency table
- L245: task detail table
- L287: duration justification
- L339: OSIM stock ingestion rationale
- L356: scope guardrails
- L402: stock contract dependency
- L423: scope exclusion
- L432: enterprise contract gate
- L485: glossary entry (rename key + keep definition)

### File 3: docs/architecture01-pmc.md (8 changes)

1. L105: `OSIM["OSIM stock"]` -> `StockService["Stock Service"]`
2. L125: `OSIM <--> ENT` -> `StockService <--> ENT`
3. L150: inside `["RMS / R10-LDD / OSIM / WMS-MFC / DHL / Auto POS"]`
4. L165: inside `["RMS / R10-LDD / OSIM ingestion processors"]`
5. L293: `OSIM / order event` -> `Stock Service / order event`
6. L535: prose `OSIM`
7. L542: table `OSIM`
8. L821: `OSIM delta` -> `Stock Service delta`

### File 4: scripts/generate_phoenix_proposal_pdf.py (5 changes)

1. L275: `"OSIM stock"` -> `"Stock Service"`
2. L311: `"ERP/R10/OSIM\nsnapshot"` -> `"ERP/R10/Stock Service\nsnapshot"`
3. L587: `"ERP/R10/OSIM ingestion"` -> `"ERP/R10/Stock Service ingestion"`
4. L677: `"OSIM delta` -> `"Stock Service delta`
5. L766: `"Late source data from R10/RMS/OSIM"` -> `"Late source data from R10/RMS/Stock Service"`

### File 5: docs/prd-phoenix-multi-channel-marketplace.md (4 changes)

1. L218: `OSIM, WMS/MFC, DHL` -> `Stock Service, WMS/MFC, DHL`
2. L478: `RMS, R10/LDD, OSIM, WMS/MFC` -> `RMS, R10/LDD, Stock Service, WMS/MFC`
3. L539: `OSIM` in table -> `Stock Service`
4. L846: `OSIM stock ingestion` -> `Stock Service stock ingestion`

### File 6: docs/phoenix-high-level-architecture.drawio (3 changes)

XML-encoded values. Replace inside each value attribute:
1. L23: `<b>OSIM</b><br>Stock events / snapshots` -> `<b>Stock Service</b><br>Stock events / snapshots`
2. L35: `<b>OSIM connector pods x2</b>` -> `<b>Stock Service connector pods x2</b>`
3. L138: In pod-count table row: `RMS, R10/LDD, OSIM, WMS/MFC` -> `RMS, R10/LDD, Stock Service, WMS/MFC`

### File 7: gantt-chart/app.js (2 changes)

1. L48: `RMS, R10/LDD, OSIM, and WMS/MFC` -> `RMS, R10/LDD, Stock Service, and WMS/MFC`
2. L368: `"OSIM stock ingestion and stock ledger"` -> `"Stock Service stock ingestion and stock ledger"`

### File 8: docs/proposal02-nov1-milestone.md (1 change)

1. L511: `OSIM stock delta ingestion and durable stock ledger` -> `Stock Service stock delta ingestion and durable stock ledger`

## Execution order (simplest to most complex)

1. proposal02-nov1-milestone.md (1 change)
2. gantt-chart/app.js (2 changes)
3. prd-phoenix-multi-channel-marketplace.md (4 changes)
4. generate_phoenix_proposal_pdf.py (5 changes)
5. architecture01-pmc.md (8 changes - watch mermaid formatting)
6. Plan Nov 1 PMC.md (12 changes)
7. proposal01-pmc-marketplace.md (14 changes - includes service/topic renames)
8. phoenix-high-level-architecture.drawio (3 changes - XML encoding)

## Verification

After all changes, run:
```
grep -rn '\bOSIM\b' .
```

Confirm zero remaining references. Then verify drawio renders correctly in
diagrams.net.

## Effort estimate

~20-30 minutes for a developer familiar with the tools. Bulk of changes are
mechanical OSIM -> Stock Service; the 3 special cases (mermaid ID, topic name,
service name) require individual attention.
