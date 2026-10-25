"""FastAPI service for the approved FloodShield synthetic simulation.

This service is deterministic decision-support demo code. It is not a flood
prediction system and must not be used for real emergency-response decisions.
"""

from __future__ import annotations

import math
from typing import Any, Literal

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator
from starlette.exceptions import HTTPException as StarletteHTTPException

from road_graph import (
    DEFAULT_FLOODED_EDGE_IDS,
    FACILITIES,
    ROAD_IDS,
    REACHABILITY_THRESHOLD_MINUTES,
    build_road_graph,
    calculate_reachability,
    validate_data,
)


DEFAULT_SCENARIO_ID = "blr-2022-09-replay"
PLAN_THRESHOLD = 0.80
SUPPORTED_ACTION_TYPES = frozenset(
    {
        "road_closure",
        "diversion",
        "pump_prepositioning",
        "ambulance_staging",
    }
)


class SimulationError(Exception):
    """A contract-level simulator error with an HTTP status and optional action."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int,
        action_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.action_id = action_id


try:
    validate_data()
except ValueError as exc:
    raise RuntimeError(f"Invalid synthetic graph configuration: {exc}") from exc


app = FastAPI(
    title="FloodShield Ops Simulator",
    description=(
        "Deterministic synthetic flood-response simulation API. "
        "This API uses demonstration data only."
    ),
    version="2.0.0",
)


# These labels mirror the backend replay fixture. They remain synthetic demo
# data and are not independently verified real-world flood observations.
HOTSPOTS = (
    {
        "id": "hs_001",
        "name": "Outer Ring Road EcoSpace Underpass",
        "lat": 12.926,
        "lng": 77.683,
        "riskScore": 0.92,
        "reasons": [
            "Low elevation underpass sump",
            "Bellandur lake overflow channel surge",
            "Peak replay rainfall exceeds 35mm/h",
        ],
        "floodedEdgeIds": ["edge_002", "edge_003"],
    },
    {
        "id": "hs_002",
        "name": "Rainbow Drive / Sarjapur Road Junction",
        "lat": 12.911,
        "lng": 77.6795,
        "riskScore": 0.85,
        "reasons": [
            "Natural watershed depression bowl",
            "Culvert cross-section capacity deficit",
            "Replay fixture inundation threshold",
        ],
        "floodedEdgeIds": ["edge_004"],
    },
    {
        "id": "hs_003",
        "name": "Marathahalli Bridge ORR Merge",
        "lat": 12.9525,
        "lng": 77.7015,
        "riskScore": 0.78,
        "reasons": [
            "Major storm drain backflow",
            "Western flyover ramp runoff ponding",
        ],
        "floodedEdgeIds": ["edge_006", "edge_008"],
    },
    {
        "id": "hs_004",
        "name": "Panathur Railway Subway & Varthur Link",
        "lat": 12.9412,
        "lng": 77.712,
        "riskScore": 0.74,
        "reasons": [
            "Railway underpass low point",
            "Varthur lake secondary drain bottleneck",
        ],
        "floodedEdgeIds": ["edge_005"],
    },
)


def _require_non_blank(value: str, field_name: str) -> str:
    if not value.strip():
        raise ValueError(f"{field_name} must not be blank")
    return value


def _require_finite_number(value: Any, field_name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field_name} must be a number")
    numeric_value = float(value)
    if not math.isfinite(numeric_value):
        raise ValueError(f"{field_name} must be finite")
    return numeric_value


class ActionTarget(BaseModel):
    model_config = ConfigDict(extra="forbid")

    edgeIds: list[StrictStr] = Field(min_length=1, max_length=len(ROAD_IDS))
    label: StrictStr = Field(min_length=1, max_length=200)

    @field_validator("edgeIds")
    @classmethod
    def validate_edge_ids(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("target.edgeIds must not contain duplicates")
        if any(not edge_id.strip() for edge_id in values):
            raise ValueError("target.edgeIds must not contain blank values")
        return values

    @field_validator("label")
    @classmethod
    def validate_label(cls, value: str) -> str:
        return _require_non_blank(value, "target.label")


class SimulationAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    actionId: StrictStr = Field(min_length=1, max_length=128)
    type: StrictStr = Field(min_length=1, max_length=64)
    target: ActionTarget
    rationale: StrictStr = Field(min_length=1, max_length=1000)
    evidence: list[StrictStr] = Field(min_length=1, max_length=50)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("actionId", "type", "rationale")
    @classmethod
    def validate_non_blank_strings(cls, value: str, info: Any) -> str:
        return _require_non_blank(value, info.field_name)

    @field_validator("evidence")
    @classmethod
    def validate_evidence(cls, values: list[str]) -> list[str]:
        if any(not evidence.strip() for evidence in values):
            raise ValueError("evidence must not contain blank values")
        return values

    @field_validator("confidence", mode="before")
    @classmethod
    def validate_confidence_type(cls, value: Any) -> Any:
        return _require_finite_number(value, "confidence")


class SimulationRequest(BaseModel):
    """Public simulation request.

    ``planId`` is an optional correlation extension used by the backend. When
    supplied, it is echoed in the SimulationResult. ``threshold`` is the
    optional configurable pass threshold. Replay flood observations are owned
    by the simulator and cannot be overridden through this endpoint.
    """

    model_config = ConfigDict(extra="forbid")

    scenarioId: StrictStr = Field(min_length=1, max_length=128)
    actions: list[SimulationAction] = Field(default_factory=list, max_length=100)
    planId: StrictStr = Field(default="plan_simulation", min_length=1, max_length=128)
    threshold: float | None = Field(default=None, ge=0.0, le=1.0)

    @field_validator("scenarioId", "planId")
    @classmethod
    def validate_request_strings(cls, value: str, info: Any) -> str:
        return _require_non_blank(value, info.field_name)

    @field_validator("threshold", mode="before")
    @classmethod
    def validate_threshold_type(cls, value: Any) -> Any:
        if value is None:
            return value
        return _require_finite_number(value, "threshold")


class FacilityResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    type: Literal["hospital", "shelter"]
    name: str
    lat: float
    lng: float
    nodeId: str


class HotspotResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    lat: float
    lng: float
    riskScore: float = Field(ge=0.0, le=1.0)
    reasons: list[str]
    floodedEdgeIds: list[str]


class PerFacilityResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    facilityId: str
    reachableBefore: bool
    reachableAfter: bool
    minutesBefore: int | float | None
    minutesAfter: int | float | None


class SimulationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    planId: str
    baselineScore: float = Field(ge=0.0, le=1.0)
    planScore: float = Field(ge=0.0, le=1.0)
    threshold: float = Field(ge=0.0, le=1.0)
    passed: bool
    perFacility: list[PerFacilityResult]
    floodedEdgeIds: list[str]


def _error_content(error: SimulationError) -> dict[str, dict[str, str]]:
    detail: dict[str, str] = {"code": error.code, "message": error.message}
    if error.action_id is not None:
        detail["actionId"] = error.action_id
    return {"error": detail}


@app.exception_handler(SimulationError)
async def simulation_error_handler(
    request: Request,
    error: SimulationError,
) -> JSONResponse:
    del request
    return JSONResponse(status_code=error.status_code, content=_error_content(error))


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    del request
    first_error = error.errors()[0] if error.errors() else {}
    location = ".".join(str(part) for part in first_error.get("loc", []))
    message = first_error.get("msg", "Request does not match the simulator contract.")
    if location:
        message = f"{location}: {message}"
    return JSONResponse(
        status_code=400,
        content={"error": {"code": "INVALID_REQUEST", "message": message}},
    )


@app.exception_handler(StarletteHTTPException)
async def standard_http_error_handler(
    request: Request,
    error: StarletteHTTPException,
) -> JSONResponse:
    del request
    code = "NOT_FOUND" if error.status_code == 404 else "HTTP_ERROR"
    message = error.detail if isinstance(error.detail, str) else "Simulator request failed."
    return JSONResponse(
        status_code=error.status_code,
        content={"error": {"code": code, "message": message}},
    )


def _require_scenario(scenario_id: str) -> None:
    if scenario_id != DEFAULT_SCENARIO_ID:
        raise SimulationError(
            "SCENARIO_NOT_FOUND",
            f"Scenario '{scenario_id}' was not found.",
            404,
        )


def _closed_edge_ids(actions: list[SimulationAction]) -> set[str]:
    closed: set[str] = set()
    action_ids: set[str] = set()
    for action in actions:
        if action.actionId in action_ids:
            raise SimulationError(
                "INVALID_REQUEST",
                f"Duplicate actionId '{action.actionId}'.",
                400,
                action.actionId,
            )
        action_ids.add(action.actionId)

        if action.type not in SUPPORTED_ACTION_TYPES:
            raise SimulationError(
                "UNSUPPORTED_ACTION",
                f"Action type '{action.type}' is not supported.",
                422,
                action.actionId,
            )

        unknown = set(action.target.edgeIds) - ROAD_IDS
        if unknown:
            raise SimulationError(
                "INVALID_REQUEST",
                f"Unknown target edge IDs: {sorted(unknown)}.",
                400,
                action.actionId,
            )

        if action.type == "road_closure":
            closed.update(action.target.edgeIds)
    return closed


def simulate(request: SimulationRequest) -> dict[str, Any]:
    """Run the baseline and planned synthetic reachability calculations."""
    _require_scenario(request.scenarioId)
    flooded = set(DEFAULT_FLOODED_EDGE_IDS)
    closed = _closed_edge_ids(request.actions)
    threshold = PLAN_THRESHOLD if request.threshold is None else request.threshold

    baseline = calculate_reachability(
        build_road_graph(flooded_edge_ids=flooded),
        threshold_minutes=REACHABILITY_THRESHOLD_MINUTES,
    )
    planned = calculate_reachability(
        build_road_graph(flooded_edge_ids=flooded, closed_edge_ids=closed),
        threshold_minutes=REACHABILITY_THRESHOLD_MINUTES,
    )

    before_by_id = {item["id"]: item for item in baseline["perFacility"]}
    after_by_id = {item["id"]: item for item in planned["perFacility"]}
    per_facility = [
        {
            "facilityId": facility["id"],
            "reachableBefore": before_by_id[facility["id"]]["reachable"],
            "reachableAfter": after_by_id[facility["id"]]["reachable"],
            "minutesBefore": before_by_id[facility["id"]]["travelTimeMinutes"],
            "minutesAfter": after_by_id[facility["id"]]["travelTimeMinutes"],
        }
        for facility in sorted(FACILITIES, key=lambda item: item["id"])
    ]
    plan_score = float(planned["score"])
    return {
        "planId": request.planId,
        "baselineScore": float(baseline["score"]),
        "planScore": plan_score,
        "threshold": threshold,
        "passed": plan_score >= threshold,
        "perFacility": per_facility,
        # This deliberately remains the initial flood list. Road closures only
        # affect the planned graph and are not new flood observations.
        "floodedEdgeIds": sorted(flooded),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "FloodShield Ops Simulator"}


@app.get("/facilities", response_model=list[FacilityResponse])
def get_facilities(
    scenarioId: StrictStr = Query(default=DEFAULT_SCENARIO_ID, min_length=1),
) -> list[FacilityResponse]:
    _require_scenario(scenarioId)
    return [
        FacilityResponse(
            id=facility["id"],
            type=facility["type"],
            name=facility["name"],
            lat=facility["lat"],
            lng=facility["lng"],
            nodeId=facility["node_id"],
        )
        for facility in FACILITIES
    ]


@app.get("/hotspots", response_model=list[HotspotResponse])
def get_hotspots(
    scenarioId: StrictStr = Query(default=DEFAULT_SCENARIO_ID, min_length=1),
) -> list[HotspotResponse]:
    _require_scenario(scenarioId)
    return [HotspotResponse(**hotspot) for hotspot in HOTSPOTS]


@app.post("/simulate", response_model=SimulationResponse)
def run_simulation(request: SimulationRequest) -> SimulationResponse:
    return SimulationResponse(**simulate(request))
