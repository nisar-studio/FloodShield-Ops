# FloodShield Ops — Frontend Operator Dashboard
**Team Nexora | ChronoForge 2026 Hackathon | Agentic AI Track**  
**Frontend Engineer:** Ibrahim Shaadan Akthar

FloodShield Ops is an autonomous pre-flood operations decision-support and verification dashboard designed for city control rooms monitoring the Bengaluru Mahadevapura corridor (Outer Ring Road, Bellandur, Marathahalli, Sarjapur Road).

---

## 1. Architecture & Capabilities

The frontend visualizes the complete agent lifecycle:
$$\text{SENSE} \rightarrow \text{ASSESS} \rightarrow \text{PLAN} \rightarrow \text{VERIFY} \rightarrow \text{REPLAN (if needed)} \rightarrow \text{APPROVE} \rightarrow \text{SANDBOX}$$

### Core Features
- **Scenario & Telemetry Header:** Visualizes active scenario (`blr-2022-09-replay`), rainfall accumulation ($125\,\text{mm}$ over $6\,\text{h}$), and hourly distribution.
- **Dual Operating Modes:**
  - **Live API Mode:** Connects via HTTP to Mohammed Nisaruddin's Express backend (`http://localhost:3000`).
  - **Replay Fixture Mode:** Operates completely offline with verified passing (`Plan 001`) and failing/replan (`Plan 002`) deterministic fixtures based on KSNDMC historical records.
- **Interactive Spatial Map & List Fallback:** Leaflet map with custom SVG pins for hotspots, hospitals, shelters, and fixed dispatch origin. Automatically falls back to a clean tabular list if network or map tiles are unavailable.
- **Deterministic Reachability Verification:** Communicates the strict contract:
  $$\text{Reachability Score} = \frac{\text{Facilities reachable within } T=30\text{ minutes}}{\text{Total facilities}}$$
  Compares baseline score ($50.0\%$) against proposed plan score ($83.3\%$) relative to required threshold ($80.0\%$).
- **Human-in-the-Loop Operator Gate:** Strict approval gate. Approval is locked whenever verification has failed or is pending. Requires explicit operator confirmation modal with notes before sandbox dispatch.
- **Chronological Audit Trail:** Immutable log of events across Sentinel, Risk, Planner, Verifier, and Operator.

---

## 2. Shared Data Contract

Directly adheres to `AGENTS.md`:
- `Scenario`: `{ scenarioId, mode, areaName, bbox, rainfall, source }`
- `Facility`: `{ id, type, name, lat, lng, nodeId }`
- `Hotspot`: `{ id, name, lat, lng, riskScore, reasons, floodedEdgeIds }`
- `Action`: `{ actionId, type, target: { edgeIds, label }, rationale, evidence, confidence }`
- `Plan`: `{ planId, scenarioId, iteration, actions, status }`
- `SimulationResult`: `{ planId, baselineScore, planScore, threshold, passed, perFacility, floodedEdgeIds }`
- `AuditEntry`: `{ ts, runId, actor, event, payload }`

---

## 3. Getting Started

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```
The dashboard starts at `http://localhost:5173`.

### Production Build
```bash
npm run build
npm run preview
```

### Environment Configuration
Copy `.env.example` to `.env` (never commit `.env` or secrets):
```env
VITE_API_BASE_URL=http://localhost:3000
```
