# FloodShield Ops
## Operator, Presentation, and Viva Guide

**Project type:** AI-assisted flood-response decision-support dashboard  
**Pilot area:** Bengaluru — Mahadevapura corridor  
**Current demo mode:** Replay / simulated data  
**Primary goal:** Keep critical facilities reachable during a flood scenario

---

## 1. The one-minute explanation

FloodShield Ops is an emergency operations dashboard for city control rooms. It helps an operator load a flood scenario, understand rainfall and risk hotspots, identify hospitals and shelters that may become difficult to reach, review AI-proposed response actions, and verify those actions with a deterministic simulator.

The AI proposes a plan, but it does not verify its own plan. The simulator independently compares the baseline situation with the proposed plan. A human operator must review and approve a verified plan before it can be recorded as a sandbox action.

The current demonstration uses clearly labelled replay and simulated data. It does not send real alerts, close real roads, dispatch real vehicles, or control physical equipment.

### Memorize this answer

> FloodShield Ops is an AI-assisted flood-response command dashboard. It loads a flood scenario, shows rainfall, hotspots, hospitals, shelters, and affected routes on a map. The AI proposes mitigation actions such as diversions, road closures, pump staging, and ambulance positioning. A deterministic simulator compares baseline and proposed facility reachability using a fixed dispatch origin and a 30-minute threshold. If the plan fails, replanning is required. If it passes, a human operator can approve it for sandbox execution. The current demo uses replay and simulated data, so it does not trigger real emergency actions.

---

## 2. What problem does it solve?

During a flood, emergency teams need fast answers to practical questions:

- Which areas are at high risk?
- Which roads or road edges may be flooded?
- Which hospitals and shelters could become unreachable?
- What response actions could improve access?
- Does the proposed plan actually improve reachability?
- Has a human reviewed and approved the plan?

FloodShield Ops puts these answers into one operational interface instead of making an operator combine separate maps, spreadsheets, messages, and manual calculations.

The key question is:

> If this flood scenario happens, what should we do to keep critical facilities reachable?

---

## 3. The complete workflow

```text
Scenario Ingestion
        ↓
Risk Assessment
        ↓
Action Plan
        ↓
Deterministic Simulation
        ↓
Replanning if required
        ↓
Human Approval
        ↓
Sandbox Execution
        ↓
Audit and Monitoring
```

The interface presents this as:

```text
Scenario Ingestion → Risk Assessment → Action Plan → Simulation
→ Replanning → Approval Gate → Sandbox Execution
```

### 3.1 Scenario ingestion

The system loads a scenario containing:

- Scenario ID
- Operating mode: live or replay
- Geographic area
- Bounding box
- Rainfall total
- Rainfall duration
- Hourly rainfall values
- Data source
- Facilities
- Hotspots

The current replay scenario is:

```text
Scenario ID: blr-2022-09-replay
Area: Bengaluru — Mahadevapura corridor
Mode: Replay
Rainfall: 125 mm over 6 hours
```

### 3.2 Risk assessment

The system identifies risky locations using available scenario data. Reasons can include:

- Low elevation
- Heavy rainfall
- Drainage or culvert capacity problems
- Lake overflow
- Underpasses
- Flooded road edges
- Reduced access to a critical facility

The current replay scenario includes four hotspots:

1. Outer Ring Road EcoSpace Underpass — 92% risk
2. Rainbow Drive / Sarjapur Road Junction — 85% risk
3. Marathahalli Bridge ORR Merge — 78% risk
4. Panathur Railway Subway & Varthur Link — 74% risk

These values belong to the replay fixture. They must not be described as live warnings.

### 3.3 AI action plan

The planner proposes actions such as:

- Road closure
- Traffic diversion
- Pump prepositioning
- Ambulance staging
- Alternate emergency route preparation

Each action should be explainable. The operator should be able to inspect:

- Action type
- Target road or location
- Rationale
- Supporting evidence
- Confidence
- Related hotspot or facility

The AI proposes actions. It does not decide whether a plan passes.

### 3.4 Deterministic verification

The simulator evaluates the plan using the same methodology for baseline and proposed-plan comparisons.

The reachability score is:

```text
Reachability score =
Facilities reachable from the dispatch origin within 30 minutes
÷ Total number of facilities
```

The simulator uses:

- One fixed dispatch origin
- The same road graph
- The same facilities
- A 30-minute travel-time limit
- Flooded road edges
- Proposed mitigation actions

Current passing replay result:

```text
Total facilities: 6
Baseline reachable: 3 of 6
Baseline score: 50.0%

After the proposed plan: 5 of 6 reachable
Plan score: 83.3%

Required threshold: 80.0%
Result: PASSED
```

The plan passes because 83.3% is greater than or equal to the 80% threshold.

### 3.5 Replanning

If the score is below the threshold, approval must stay locked.

Example failing result:

```text
Baseline score: 33.3%
Plan score: 66.7%
Required threshold: 80.0%
Result: FAILED
```

The system then requires another plan iteration. The planner can propose additional actions, such as more pump staging, another diversion, or a different staging point. The new plan must be simulated again.

The threshold and verification methodology must not be changed just to make a plan pass.

### 3.6 Human approval

A passing simulation does not automatically execute anything. The operator reviews the plan, verification result, evidence, and audit history. The operator then confirms the sandbox warning and adds an authorization note.

### 3.7 Sandbox execution

Sandbox execution is a safe demonstration state. It does not:

- Send SMS messages
- Send email
- Contact emergency services
- Close real roads
- Dispatch real ambulances
- Control real pumps
- Trigger physical emergency actions

It records the decision as a simulated event for demonstration and audit purposes.

---

## 4. What is on the current screen?

### 4.1 Left command sidebar

The sidebar contains the product identity, scenario information, navigation, telemetry, data provenance, and operation controls.

It shows:

```text
Scenario ID: blr-2022-09-replay
Location: Bengaluru • Mahadevapura
Mode: REPLAY
```

Navigation sections:

- **COMMAND:** Main operational map and dashboard
- **TERRAIN:** Geographic and watershed view
- **RESPONSE PLAN:** Proposed mitigation actions
- **VERIFICATION:** Simulation and reachability results
- **AUDIT:** Event and decision history

### 4.2 Telemetry profile

This compact area provides quick numbers:

```text
Hotspots: 4 Active
Rainfall: 125 mm
```

### 4.3 Data provenance selector

The selector has three modes:

#### Replay: Pass

A deterministic fixture where Plan 001 passes verification.

#### Replay: Fail

A deterministic fixture where Plan 002 fails and demonstrates replanning.

#### Live API

Attempts to load scenario data from the Express backend. It depends on the required backend routes being available.

The safest hackathon demonstration mode is Replay because it is predictable and works without the complete live service stack.

### 4.4 Simulate Run

In replay mode, this refreshes the selected fixture and simulates the run progression.

In live mode, it attempts to call the backend run endpoint:

```text
POST /api/run
```

Expected request shape:

```json
{
  "scenarioId": "blr-2022-09-replay"
}
```

### 4.5 Export Dossier

This exports an incident report containing scenario information, hotspots, facilities, plan details, simulation results, and audit entries.

It is useful for a demo, review, handover, or documentation.

### 4.6 Command Palette

Press:

```text
Ctrl + K
```

The command palette provides fast access to navigation, hotspot focus, facility focus, run triggering, and report export.

---

## 5. Map features

The map is the main spatial view. The current implementation uses Leaflet, which is a 2D interactive map library with tactical overlays.

Important accuracy note:

> The current map is a 2D Leaflet map with flood and response overlays. It is not yet a true WebGL 3D terrain engine.

The map shows:

### Flood hotspots

Red or amber markers show the hotspot risk percentage.

### Hospitals

Hospitals use medical-style markers.

### Shelters

Shelters use shelter or home-style markers.

### Dispatch origin

The fixed dispatch origin is:

```text
Central Emergency Dispatch Unit, Mahadevapura
```

The simulator starts travel-time calculations from this location.

### Response corridors

The map can show verified, threatened, flooded, or alternate response routes.

### Flood zones

Flood zones are drawn around hotspots. Their size and intensity can change when the replay hour changes.

### Map controls

- Zoom in
- Zoom out
- Layers
- Camera Presets
- Radar Sweep
- List View
- North indicator
- Map scope
- Legend

---

## 6. Map layer controls

The Layers menu can toggle:

- Flood extent inundation
- Verified response corridors
- Vulnerable hotspot pins
- Hospital and shelter assets
- Mahadevapura basin scope

This lets the operator simplify the map and focus on one type of information.

---

## 7. Camera presets

Camera presets provide fast navigation to important locations:

- Mahadevapura overview
- Outer Ring Road EcoSpace hotspot
- Rainbow Drive hotspot
- Sakra World Hospital
- Manipal Hospital Varthur Road

These are useful when explaining the map during a presentation.

---

## 8. Hotspot inspector

Clicking a hotspot opens the inspector panel. It shows:

- Hotspot name
- Hotspot ID
- Risk score
- Latitude and longitude
- Risk reasons
- Flooded network-edge IDs

The inspector also provides an option to focus the map on the selected hotspot.

The Evidence tab explains why the hotspot is considered risky. The Actions tab shows response actions related to that hotspot.

The goal is explainability: the operator should understand not only the score, but also why the score is high and what actions are connected to it.

---

## 9. Facility inspector

Clicking a hospital or shelter opens the facility inspector. It displays:

- Facility type
- Facility name
- Facility ID
- Node ID
- Coordinates
- Baseline reachability
- Reachability after the plan
- Travel time
- Whether the facility is cut off

Example:

```text
Manipal Hospital Varthur Road

Baseline: Unreachable
After proposed plan: Reachable in 26 minutes
```

This is central to the product goal because hospitals and shelters are the facilities that the response plan is trying to protect.

---

## 10. Response Plan page

A plan contains:

```text
Plan ID
Scenario ID
Iteration number
Plan status
Actions
```

Possible plan statuses:

- Proposed
- Verified
- Rejected
- Approved
- Executed in sandbox

The plan is not considered safe merely because the AI generated it. The simulator must evaluate it first.

---

## 11. Verification page

The Verification page explains whether the plan passed.

It displays:

- Baseline score
- Proposed plan score
- Required threshold
- Pass or fail result
- Per-facility results
- Reachability comparison
- Current iteration

Example:

```text
Baseline: 50.0%
Proposed: 83.3%
Threshold: 80.0%
Result: PASSED
```

---

## 12. Why independent verification matters

An AI planner can make mistakes. It may suggest an action that sounds reasonable but does not actually improve access.

The simulator provides a consistent, repeatable check. It prevents the AI from declaring success simply because it generated the plan.

The correct explanation is:

> The AI proposes. The simulator verifies. The human operator approves.

---

## 13. Bottom command tray and rainfall replay

The bottom tray contains:

- Baseline reachability
- Proposed reachability
- Threshold
- Verification state
- Plan iteration
- Play and pause controls
- Playback speed
- Timeline slider
- Current replay hour
- Rainfall accumulation

The current rainfall replay is:

```text
Hour 1: 5 mm
Hour 2: 10 mm
Hour 3: 20 mm
Hour 4: 35 mm
Hour 5: 35 mm
Hour 6: 20 mm
Total: 125 mm
```

The replay can demonstrate how rainfall accumulates and how flood overlays change across the scenario timeline.

This is fixed replay data, not a live weather feed.

---

## 14. Approval gate

Approval is intentionally controlled. It should only be available when:

- A plan exists
- The simulator evaluated it
- The plan passed the threshold
- The plan has not already been approved

The approval modal includes:

- Plan ID
- Baseline score
- Verified plan score
- Number of actions
- Operator authorization note
- Sandbox confirmation checkbox

The approval gate demonstrates human-in-the-loop control.

---

## 15. Audit trail

The Audit page records the operational history. Entries may include:

- Scenario loaded
- Hotspots assessed
- Plan proposed
- Simulation completed
- Verification failed
- Replanning triggered
- Plan approved
- Sandbox action recorded

Each audit entry contains:

```text
Timestamp
Run ID
Actor
Event
Payload
```

Typical actors:

- Sentinel
- Risk
- Planner
- Verifier
- Operator

The audit trail makes the process explainable and reviewable.

---

## 16. Data provenance and limitations

The current screen uses replay and simulated data. That means:

- The data is deterministic
- The demonstration can work without a live backend
- The results are safe to show in a hackathon
- The values are not current emergency information

Use these labels honestly:

- **LIVE API:** Returned by a connected backend
- **REPLAY:** Loaded from a documented fixture
- **SIMULATED:** Produced by a deterministic demo or simulator
- **UNAVAILABLE:** The service or data is not connected

Do not claim that replay data is live.

---

## 17. Technical architecture in simple words

### Frontend

Built with React and Vite. It handles the dashboard, navigation, map, replay controls, API calls, plan display, verification display, approval UI, errors, and report export.

Main technologies:

- React
- Vite
- Leaflet
- Lucide React icons
- CSS theme and reusable components

### Backend

Built with Node.js and Express. It is intended to provide scenario data, orchestrate runs, handle plans, approval, and audit events.

### Simulator

Built as a Python service using FastAPI and a deterministic road-graph calculation. It is intended to calculate reachable facilities, baseline score, plan score, and pass/fail status.

### Team responsibility summary

- Frontend: dashboard, map, user interaction, visual presentation, API integration
- Backend: Express API, planning/orchestration, approval, audit
- Simulator: risk analysis, road graph, reachability verification

---

## 18. Current integration status to explain accurately

The frontend has replay fixtures and an API client prepared for live integration.

The current backend provides these working routes:

```text
GET /api/health
GET /api/scenario/:scenarioId
```

The frontend client is also prepared for these expected routes:

```text
POST /api/run
GET /api/run/:runId
POST /api/plan/:planId/approve
GET /api/audit?runId=...
```

Those additional routes must be available before claiming that the complete live orchestration flow is connected.

The Python simulator also requires a working Python installation and its dependencies.

Safe statement:

> Replay mode demonstrates the complete user experience reliably. Live backend and simulator integration is designed around the shared contracts and depends on the corresponding services being available.

---

## 19. Recommended demo sequence

### Step 1: Start in Replay: Pass

Say:

> I am starting in replay mode so the demonstration is deterministic and clearly labelled as simulated.

### Step 2: Explain the scenario

Point out:

- Scenario ID
- Mahadevapura area
- Rainfall amount
- Replay label

### Step 3: Explain the map

Identify:

- Hotspots
- Hospitals
- Shelters
- Dispatch origin
- Response corridors
- Flood zones

### Step 4: Select a hotspot

Show the risk percentage, reasons, flooded edges, evidence, and related actions.

### Step 5: Open the response plan

Explain that the AI proposes actions but does not verify them.

### Step 6: Open verification

Explain the calculation:

```text
50.0% baseline
83.3% proposed
80.0% threshold
PASSED
```

### Step 7: Play the rainfall timeline

Show that the replay contains six hours of rainfall and that the map can respond to the selected hour.

### Step 8: Open the approval gate

Explain that a human must confirm the verified plan and that the action is sandbox-only.

### Step 9: Switch to Replay: Fail

Explain that the lower score fails the threshold and approval remains locked.

### Step 10: Explain replanning

Show that another plan iteration is required instead of pretending that the failed plan is safe.

### Step 11: Open Audit

Show the sequence of events, actors, timestamps, and run IDs.

---

## 20. Frequently asked questions

### What does FloodShield Ops do?

It helps emergency operators understand flood risk, propose mitigation actions, verify facility reachability, and safely approve sandbox operations.

### Is it a live flood-warning system?

Not in the current demonstration. The current page uses replay and simulated data. A live API mode is prepared for integration.

### Is the AI making the final decision?

No. The AI proposes actions. The deterministic simulator evaluates them. A human operator approves them.

### How does the simulator judge a plan?

It calculates how many hospitals and shelters are reachable from a fixed dispatch origin within 30 minutes.

### What does 83.3% mean?

Five of the six facilities are reachable after the proposed plan:

```text
5 ÷ 6 = 83.3%
```

### Why is the threshold 80%?

It is the minimum reachability target defined for the verification workflow.

### What happens when verification fails?

Approval is locked. The failure is displayed and a new plan iteration is required.

### Can it send real emergency alerts?

No. It supports sandbox simulation and audit logging only.

### What are hotspots?

Hotspots are locations with elevated flood risk based on scenario factors such as rainfall, low elevation, drainage constraints, or nearby water overflow.

### What are facilities?

Facilities are critical locations that should remain reachable, especially hospitals and shelters.

### What is the dispatch origin?

It is the fixed starting point used by the simulator to calculate routes and travel times.

### What is replay mode?

Replay mode uses fixed, documented data so the project can be demonstrated reliably when live services are unavailable.

### What is live API mode?

It attempts to communicate with the Express backend and load backend responses.

### What is the audit trail?

It records what happened, when it happened, which actor performed it, which run it belonged to, and the related payload.

### Is the current map truly 3D?

No. The current implementation is a 2D Leaflet map with tactical styling and overlays. The 3D terrain concept is a future visual direction, not the current map engine.

### Is the rainfall data live?

No. The current replay uses fixed fixture data.

### Can a plan be approved before simulation?

It should not be. Approval is designed to stay locked until the plan passes verification.

---

## 21. What not to claim

Avoid saying:

- The system predicts real floods
- The AI automatically dispatches emergency teams
- The current data is live
- The AI guarantees safety
- The map is a live satellite map
- The simulator represents the entire real city
- All live orchestration routes are complete if they are not running
- The plan is safe because the AI said so

Say instead:

- This is a decision-support system
- The current demonstration uses replay and simulated data
- The simulator independently verifies reachability
- The operator remains in control
- Sandbox actions do not affect the real world

---

## 22. Final presentation answer

> FloodShield Ops is an AI-assisted flood-response command dashboard. It loads a flood scenario, shows rainfall, hotspots, hospitals, shelters, and affected routes on a map. The AI proposes response actions such as diversions, road closures, pump staging, and ambulance positioning. A deterministic simulator then compares baseline and proposed reachability using a fixed dispatch origin and a 30-minute threshold. If the plan fails, the system requires replanning. If it passes, a human operator can approve it for sandbox execution. The current demo uses clearly labelled replay and simulated data, so it does not trigger real emergency actions.

---

## 23. Quick vocabulary

| Term | Simple meaning |
|---|---|
| Scenario | The flood situation being analyzed |
| Replay | Fixed data used for a repeatable demonstration |
| Hotspot | A location with elevated flood risk |
| Facility | A hospital, shelter, or other protected location |
| Dispatch origin | The starting point for route calculations |
| Action | A proposed response measure |
| Plan | A group of proposed actions |
| Simulation | A deterministic test of the plan |
| Baseline score | Reachability without the proposed plan |
| Plan score | Reachability after applying the proposed plan |
| Threshold | Minimum score required to pass |
| Replanning | Creating a new plan after failure |
| Approval gate | Human review before sandbox execution |
| Sandbox | Safe simulated execution, not real dispatch |
| Audit trail | Historical record of events and decisions |
