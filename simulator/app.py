"""
FloodShield Ops Simulator API.

All data is deterministic synthetic demonstration data.
This API must not be used for real flood or emergency-response decisions.
"""

from __future__ import annotations

from typing import Any, Literal, Sequence

from fastapi import FastAPI, HTTPException, Query
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictStr,
    field_validator,
)

from road_graph import (
    ROAD_IDS,
    build_road_graph,
    calculate_reachability,
    validate_data,
)


# -------------------- Configuration --------------------

DEFAULT_SCENARIO_ID = "demo-rain"
PLAN_THRESHOLD = 0.80


# -------------------- Validate Static Configuration --------------------

try:
    validate_data()
except ValueError as exc:
    raise RuntimeError(
        f"Invalid road network configuration: {exc}"
    ) from exc


# -------------------- Application --------------------

app = FastAPI(
    title="FloodShield Ops Simulator",
    description=(
        "Deterministic synthetic flood-response simulation API. "
        "This API uses demonstration data only."
    ),
    version="1.0.0",
)


# -------------------- Synthetic Hotspots --------------------

HOTSPOTS = (
    {
        "id": "HS01",
        "name": "Road R02 flood-risk segment",
        "lat": 12.95,
        "lng": 77.70,
        "riskScore": 0.90,
        "reasons": ["Synthetic flood scenario"],
        "floodedEdgeIds": ["R02"],
    },
    {
        "id": "HS02",
        "name": "Road R06 flood-risk segment",
        "lat": 12.94,
        "lng": 77.71,
        "riskScore": 0.65,
        "reasons": ["Synthetic low-lying segment"],
        "floodedEdgeIds": ["R06"],
    },
)


# -------------------- Request Models --------------------


class ReopenRoadAction(BaseModel):
    """Action used to reopen one road."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["reopen_road"]
    target: StrictStr = Field(
        min_length=1,
        max_length=20,
        description="Road ID to reopen, for example R02.",
    )


class SimulationRequest(BaseModel):
    """Request body for the simulation endpoint."""

    model_config = ConfigDict(extra="forbid")

    scenarioId: StrictStr = Field(
        default=DEFAULT_SCENARIO_ID,
        min_length=1,
        max_length=100,
    )

    floodedEdgeIds: list[StrictStr] = Field(
        default_factory=list,
        max_length=len(ROAD_IDS),
    )

    actions: list[ReopenRoadAction] = Field(
        default_factory=list,
        max_length=100,
    )

    @field_validator("floodedEdgeIds")
    @classmethod
    def validate_flooded_edge_ids(
        cls,
        values: list[str],
    ) -> list[str]:
        """Reject empty and duplicate road IDs."""
        if any(not value.strip() for value in values):
            raise ValueError(
                "floodedEdgeIds cannot contain empty road IDs."
            )

        if len(values) != len(set(values)):
            raise ValueError(
                "floodedEdgeIds must not contain duplicate road IDs."
            )

        return values


# -------------------- Response Models --------------------


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    service: str


class FacilityResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    type: str
    name: str
    nodeId: str
    reachable: bool
    travelTimeMinutes: int | float | None


class FacilitiesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenarioId: str
    facilities: list[FacilityResult]


class HotspotResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    lat: float
    lng: float
    riskScore: float = Field(ge=0.0, le=1.0)
    reasons: list[str]
    floodedEdgeIds: list[str]


class HotspotsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: Literal["synthetic_demo_data"]
    hotspots: list[HotspotResponse]


class VerificationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    method: Literal["deterministic_reachability"]
    reason: str


class SimulationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scenarioId: str
    baselineScore: float = Field(ge=0.0, le=1.0)
    planScore: float = Field(ge=0.0, le=1.0)
    threshold: float = Field(ge=0.0, le=1.0)
    passed: bool
    floodedEdgeIds: list[str]
    perFacility: list[FacilityResult]
    verification: VerificationResponse
    note: str


# -------------------- Simulation Logic --------------------


def _validate_flooded_ids(
    flooded_ids: Sequence[str],
) -> set[str]:
    """Validate and normalize flooded road IDs."""
    values = list(flooded_ids)

    if any(
        not isinstance(value, str) or not value.strip()
        for value in values
    ):
        raise ValueError(
            "Flooded road IDs must be non-empty strings."
        )

    if len(values) != len(set(values)):
        raise ValueError(
            "Flooded road IDs must not contain duplicates."
        )

    unknown_ids = set(values) - ROAD_IDS

    if unknown_ids:
        raise ValueError(
            f"Unknown road IDs: {sorted(unknown_ids)}"
        )

    return set(values)


def simulate(
    flooded_ids: Sequence[str],
    actions: Sequence[ReopenRoadAction],
) -> dict[str, Any]:
    """
    Run one deterministic simulation.

    Flooded roads are removed first. Actions are then applied.
    A reopen_road action removes a road from the flooded set.
    """
    flooded = _validate_flooded_ids(flooded_ids)

    for action in actions:
        if not isinstance(action, ReopenRoadAction):
            raise ValueError(
                "Each action must be a valid reopen_road action."
            )

        if action.target not in ROAD_IDS:
            raise ValueError(
                f"Action target must be a known road ID: "
                f"{action.target}"
            )

        # Reopening an already-open road is harmless and idempotent.
        flooded.discard(action.target)

    graph = build_road_graph(flooded)
    result = calculate_reachability(graph)

    return {
        "score": float(result["score"]),
        "reachableCount": result["reachableCount"],
        "totalFacilities": result["totalFacilities"],
        "perFacility": result["perFacility"],
        "floodedEdgeIds": sorted(flooded),
    }


def _bad_request(exc: ValueError) -> HTTPException:
    """Convert a domain validation error into HTTP 400."""
    return HTTPException(
        status_code=400,
        detail=str(exc),
    )


# -------------------- API Endpoints --------------------


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Check API health",
)
def health() -> HealthResponse:
    """Return API health status."""
    return HealthResponse(
        status="ok",
        service="FloodShield Ops Simulator",
    )


@app.get(
    "/facilities",
    response_model=FacilitiesResponse,
    summary="Get facility reachability",
)
def get_facilities(
    flooded_edge_ids: list[StrictStr] | None = Query(
        default=None,
        alias="floodedEdgeIds",
        description=(
            "Flooded road ID. Repeat this parameter for multiple roads."
        ),
    ),
) -> FacilitiesResponse:
    """
    Get facility reachability for a flooded-road configuration.

    Example:

    /facilities?floodedEdgeIds=R02&floodedEdgeIds=R06
    """
    try:
        result = simulate(
            flooded_ids=flooded_edge_ids or [],
            actions=[],
        )
    except ValueError as exc:
        raise _bad_request(exc) from exc

    return FacilitiesResponse(
        scenarioId=DEFAULT_SCENARIO_ID,
        facilities=result["perFacility"],
    )


@app.get(
    "/hotspots",
    response_model=HotspotsResponse,
    summary="Get synthetic flood hotspots",
)
def get_hotspots() -> HotspotsResponse:
    """Return synthetic hotspot data sorted by risk score."""
    sorted_hotspots = sorted(
        HOTSPOTS,
        key=lambda item: (
            -float(item["riskScore"]),
            str(item["id"]),
        ),
    )

    return HotspotsResponse(
        source="synthetic_demo_data",
        hotspots=sorted_hotspots,
    )


@app.post(
    "/simulate",
    response_model=SimulationResponse,
    summary="Run a flood-response simulation",
)
def run_simulation(
    request: SimulationRequest,
) -> SimulationResponse:
    """
    Compare baseline reachability with the proposed action plan.
    """
    try:
        baseline = simulate(
            flooded_ids=request.floodedEdgeIds,
            actions=[],
        )

        planned = simulate(
            flooded_ids=request.floodedEdgeIds,
            actions=request.actions,
        )
    except ValueError as exc:
        raise _bad_request(exc) from exc

    baseline_score = float(baseline["score"])
    plan_score = float(planned["score"])
    passed = plan_score >= PLAN_THRESHOLD

    reason = (
        "Plan meets the reachability threshold."
        if passed
        else "Plan does not meet the reachability threshold."
    )

    return SimulationResponse(
        scenarioId=request.scenarioId,
        baselineScore=baseline_score,
        planScore=plan_score,
        threshold=PLAN_THRESHOLD,
        passed=passed,
        floodedEdgeIds=planned["floodedEdgeIds"],
        perFacility=planned["perFacility"],
        verification=VerificationResponse(
            method="deterministic_reachability",
            reason=reason,
        ),
        note=(
            "Synthetic simulation only; "
            "not real flood or emergency-response advice."
        ),
    )