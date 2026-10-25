# AGENTS.md: FloodShield Ops

Instructions for AI coding tools (Codex, Antigravity, Cursor, Freebuff, etc.) working in this repo.
Read this file fully before making changes. Follow it over any default habits.

## Project

FloodShield Ops is an autonomous **pre-flood operations agent** for city control rooms (Team Nexora, ChronoForge hackathon, Agentic AI track, theme "Cities of the Future").

Goal given to the agent: *keep critical facilities (hospitals, shelters) reachable during a forecast rain event.*

Core loop: **Sense, Assess, Plan, Verify (simulate), Approve (human), Act (sandbox), Monitor.**
The LLM *proposes* a plan; the simulator *decides* whether it passes. Never let the LLM mark its own plan as verified.

**Pilot area:** Bengaluru, Mahadevapura corridor (Outer Ring Road, Marathahalli, Bellandur, Sarjapur Road).
Starting bounding box (tune after checking data): south 12.90, north 12.99, west 77.65, east 77.76.
**Replay scenario:** the early September 2022 Bengaluru flood event. Rainfall readings are taken from public news reports of KSNDMC data (about 125-129 mm in a few hours at Doddanekundi and Marathahalli). Confirm exact dates and figures from the cited sources before writing them in the README.

## Hard rules

1. **Built from scratch.** Do not copy or adapt any existing project. Libraries, APIs and public datasets are fine, and must be listed in the README acknowledgments.
2. **No secrets in git.** The repo is public. Never hard-code API keys. Read them from `.env`. `.env` is git-ignored; commit only `.env.example` with placeholder values. Never create or commit any other env file.
3. **Stay in your folder.** Only edit files in the area you were asked to work on (see Ownership). If you need a change elsewhere, say so instead of editing it.
4. **Small, explainable changes.** Every teammate must be able to explain all code in the repo to judges. Prefer simple, readable code. No clever abstractions, no big rewrites late in the build.
5. **Run it before saying it works.** Start the app or run the relevant script and confirm the behavior.
6. **Keep the contracts below.** Do not rename or reshape the JSON fields without updating this file and telling the team.
7. **Sandbox only.** No real alerts, SMS, emails or dispatch. "Dispatch" writes to the audit log and shows in the UI.
8. **Human in the loop.** No action reaches status `executed_sandbox` without operator approval.
9. **Responsible use.** Use only open data. No personal data. Label the simulation as a decision-support model, not a prediction guarantee.

## Stack

- Frontend: React + Vite + Tailwind CSS, Leaflet for maps.
- Backend / orchestrator: Node.js + Express.
- Storage: MongoDB (runs, plans, audit log).
- LLM: Gemini API with function calling and structured JSON output. Validate every model output against the schemas below before using it.
- Simulator: small Python service (OSMnx / NetworkX) for road graph, flooded edges and reachability.
- Data: Open-Meteo (forecast and history), OpenStreetMap via Overpass/OSMnx (roads, hospitals, shelters), open elevation data. Cache everything in `/data/cache` so replay mode works offline.

## Folder layout and ownership

```
/frontend    Person C: map dashboard, action cards, score panel
/backend     Person B: orchestrator, Gemini planner, tools, API, audit log
/simulator   Person A: road graph, hotspot scoring, reachability simulation
/data/cache  cached replay data (committed, small)
/docs        architecture diagram, notes
README.md    detailed README (required by organizers)
AGENTS.md    this file
```

## Reachability Score (single shared definition)

`score = (facilities reachable from the dispatch origin within T minutes) / (total facilities)`

- Facilities: hospitals and shelters in the pilot area.
- Dispatch origin: one fixed point (configurable in `/simulator/config`).
- T: 30 minutes by default.
- Reachable means a path exists on the road graph with flooded edges removed and closed roads removed, with travel time from road length and speed.
- Report `baselineScore` (do nothing, flooded edges removed), and `planScore` (plan applied).

## Approved synthetic simulation contract

The following graph, travel times, and facility mappings are synthetic demo data. They are not verified Bengaluru infrastructure and must not be presented as real-world measurements.

- Scenario ID: `blr-2022-09-replay`.
- Approved dispatch origin: `node_001`.
- Approved reachability limit: 30 minutes.
- Default synthetic flooded edges: `edge_002` and `edge_003`.
- The graph contains exactly these eight synthetic edges:

| Edge ID | From node | To node | Travel time |
|---|---|---|---:|
| `edge_001` | `node_001` | `node_002` | 5 min |
| `edge_002` | `node_002` | `node_003` | 5 min |
| `edge_003` | `node_003` | `node_004` | 5 min |
| `edge_004` | `node_001` | `node_005` | 8 min |
| `edge_005` | `node_005` | `node_004` | 7 min |
| `edge_006` | `node_002` | `node_006` | 4 min |
| `edge_007` | `node_006` | `node_004` | 6 min |
| `edge_008` | `node_005` | `node_006` | 3 min |

- The six agreed synthetic facility mappings are:

| Facility ID | Name | Graph node |
|---|---|---|
| `fac_001` | Sakra World Hospital | `node_004` |
| `fac_002` | Manipal Hospital Varthur Road | `node_006` |
| `fac_003` | Rainbow Children's Hospital Marathahalli | `node_003` |
| `fac_004` | Mahadevapura Community Center Shelter | `node_005` |
| `fac_005` | Bellandur Relief Staging Post | `node_002` |
| `fac_006` | Marathahalli Sports Complex Relief Camp | `node_004` |

- `threshold` is configurable. `0.80` is a provisional default, not a final approval. The effective threshold must be returned in `SimulationResult`, and `passed` must be calculated as `planScore >= threshold`.
- Baseline and planned calculations use the same initial flooded-edge list. Planned `road_closure` actions modify only the planned graph; they do not change `floodedEdgeIds` in the result.
- `SimulationResult.perFacility` must contain exactly six unique facility entries, one for each agreed facility. Each entry contains `facilityId`, `reachableBefore`, `reachableAfter`, `minutesBefore`, and `minutesAfter`. Travel times are numeric when reachable and `null` when unreachable.

### Simulation error responses

Simulator errors use this JSON shape:

```json
{ "error": { "code": "INVALID_REQUEST", "message": "string", "actionId": "optional" } }
```

- HTTP 400: `INVALID_REQUEST`.
- HTTP 422: `UNSUPPORTED_ACTION`.
- HTTP 404: `SCENARIO_NOT_FOUND`.
- Include `actionId` when the error applies to a specific action.

### Synthetic simulation contract tests

Tests must cover the following without using real infrastructure data:

- Default `edge_002` and `edge_003` flooding isolates `node_003` as specified by the synthetic graph tests.
- Alternative routes behave according to the approved edge table.
- Configurable thresholds change `passed` using `planScore >= threshold`.
- Invalid and unsupported actions never return a successful simulation result.

## Agent tools (backend)

`get_forecast`, `get_road_graph`, `score_hotspots`, `simulate_plan`, `draft_advisory`, `request_approval`, `log_decision`.

Planner loop: propose plan, call `simulate_plan`, if `passed` is false then revise (max 3 iterations), then `request_approval`. Log every step.

## JSON contracts

All coordinates are WGS84 `lat`, `lng` numbers. All timestamps are ISO 8601 strings. IDs are strings.

### Scenario
```json
{
  "scenarioId": "blr-2022-09-replay",
  "mode": "replay",
  "areaName": "Bengaluru - Mahadevapura corridor",
  "bbox": { "south": 12.90, "north": 12.99, "west": 77.65, "east": 77.76 },
  "rainfall": { "totalMm": 125, "durationHours": 6, "hourlyMm": [5, 10, 20, 35, 35, 20] },
  "source": "short note on where the numbers come from"
}
```
`mode` is `"live"` or `"replay"`.

### Facility
```json
{ "id": "fac_001", "type": "hospital", "name": "string", "lat": 12.95, "lng": 77.70, "nodeId": "graph node id" }
```
`type` is `"hospital"` or `"shelter"`.

### Hotspot
```json
{
  "id": "hs_001",
  "name": "string",
  "lat": 12.93,
  "lng": 77.68,
  "riskScore": 0.82,
  "reasons": ["low elevation", "near waterway", "heavy forecast rain"],
  "floodedEdgeIds": ["edge_123", "edge_456"]
}
```
`riskScore` is 0 to 1.

### Action
```json
{
  "actionId": "act_001",
  "type": "road_closure",
  "target": { "edgeIds": ["edge_123"], "label": "string" },
  "rationale": "why this action",
  "evidence": ["hotspot hs_001", "rainfall forecast"],
  "confidence": 0.7
}
```
`type` is one of `"road_closure"`, `"diversion"`, `"pump_prepositioning"`, `"ambulance_staging"`.

### Plan
```json
{
  "planId": "plan_001",
  "scenarioId": "blr-2022-09-replay",
  "iteration": 1,
  "actions": [ "...Action objects..." ],
  "status": "proposed"
}
```
`status` is one of `"proposed"`, `"verified"`, `"rejected"`, `"approved"`, `"executed_sandbox"`.

### SimulationResult
```json
{
  "planId": "plan_001",
  "baselineScore": 0.40,
  "planScore": 0.85,
  "threshold": 0.8,
  "passed": true,
  "perFacility": [
    { "facilityId": "fac_001", "reachableBefore": false, "reachableAfter": true, "minutesBefore": null, "minutesAfter": 18 }
  ],
  "floodedEdgeIds": ["edge_123"]
}
```

`SimulationResult.perFacility` must contain all six unique agreed facilities. `threshold` is the effective configurable threshold, and `passed` is true exactly when `planScore >= threshold`.

### AuditEntry
```json
{
  "ts": "2026-10-24T12:00:00Z",
  "runId": "run_001",
  "actor": "planner",
  "event": "plan_proposed",
  "payload": {}
}
```
`actor` is one of `"sentinel"`, `"risk"`, `"planner"`, `"verifier"`, `"comms"`, `"operator"`.

## API (backend, `/api`)

- `GET  /api/scenario/:scenarioId` returns Scenario, with facilities and hotspots.
- `POST /api/run` with `{ "scenarioId": "..." }` returns `{ "runId": "..." }`.
- `GET  /api/run/:runId` returns `{ status, steps[], plan, simulation }`.
- `POST /api/plan/:planId/approve` returns the updated Plan.
- `GET  /api/audit?runId=...` returns AuditEntry[].

Simulator service:
- `POST /simulate` with `{ "scenarioId": "...", "actions": [ ... ] }` returns SimulationResult.
- Backend integration may additionally send `planId` as an optional correlation id and `threshold` as an optional score-threshold override; the simulator echoes `planId` and uses `0.80` only when `threshold` is omitted. Public replay requests must not send `floodedEdgeIds`; replay flood observations remain simulator-owned.
- `GET  /hotspots?scenarioId=...` returns Hotspot[].
- `GET  /facilities?scenarioId=...` returns Facility[].

During early development, build against mock JSON that matches these shapes so the three parts do not block each other.

## Git

- Public repo. Commit **often** (every 30-60 minutes), because regular commits are part of the evaluation.
- Commit under your own account, with clear messages (for example `simulator: compute baseline reachability`).
- One branch per person; merge small and frequently. Pull before you push.
- Before every push, check that no `.env` or key is staged.

## README (required, graded)

Keep `README.md` detailed: problem, solution, architecture diagram, tech stack, setup and run steps, features, demo walkthrough, limitations, team contributions, and **acknowledgments** for every API, dataset, library, model and AI coding tool used.

## Feature freeze

Core flow first: data, hotspots, baseline score, plan, simulate, before/after score on screen. Freeze new features at hour 18. After that, only fixes, polish, README, demo video and submission.
