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
