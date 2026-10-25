"""Deterministic synthetic road network used by the FloodShield simulator.

The graph, travel times, and facility mappings are approved synthetic demo
data. They are not verified Bengaluru infrastructure or real-world travel
measurements.
"""

from __future__ import annotations

import math
from typing import Any, Iterable

import networkx as nx


REACHABILITY_THRESHOLD_MINUTES = 30
DISPATCH_ORIGIN = "node_001"
DEFAULT_FLOODED_EDGE_IDS = frozenset({"edge_002", "edge_003"})

NODE_IDS = tuple(f"node_{index:03d}" for index in range(1, 7))

ROAD_EDGES = (
    {"id": "edge_001", "from": "node_001", "to": "node_002", "travel_time": 5},
    {"id": "edge_002", "from": "node_002", "to": "node_003", "travel_time": 5},
    {"id": "edge_003", "from": "node_003", "to": "node_004", "travel_time": 5},
    {"id": "edge_004", "from": "node_001", "to": "node_005", "travel_time": 8},
    {"id": "edge_005", "from": "node_005", "to": "node_004", "travel_time": 7},
    {"id": "edge_006", "from": "node_002", "to": "node_006", "travel_time": 4},
    {"id": "edge_007", "from": "node_006", "to": "node_004", "travel_time": 6},
    {"id": "edge_008", "from": "node_005", "to": "node_006", "travel_time": 3},
)

FACILITIES = (
    {
        "id": "fac_001",
        "type": "hospital",
        "name": "Sakra World Hospital",
        "node_id": "node_004",
        "lat": 12.9255,
        "lng": 77.6845,
    },
    {
        "id": "fac_002",
        "type": "hospital",
        "name": "Manipal Hospital Varthur Road",
        "node_id": "node_006",
        "lat": 12.9572,
        "lng": 77.7391,
    },
    {
        "id": "fac_003",
        "type": "hospital",
        "name": "Rainbow Children's Hospital Marathahalli",
        "node_id": "node_003",
        "lat": 12.9497,
        "lng": 77.7011,
    },
    {
        "id": "fac_004",
        "type": "shelter",
        "name": "Mahadevapura Community Center Shelter",
        "node_id": "node_005",
        "lat": 12.9868,
        "lng": 77.6972,
    },
    {
        "id": "fac_005",
        "type": "shelter",
        "name": "Bellandur Relief Staging Post",
        "node_id": "node_002",
        "lat": 12.9351,
        "lng": 77.6710,
    },
    {
        "id": "fac_006",
        "type": "shelter",
        "name": "Marathahalli Sports Complex Relief Camp",
        "node_id": "node_004",
        "lat": 12.9550,
        "lng": 77.7080,
    },
)

ROAD_IDS = frozenset(edge["id"] for edge in ROAD_EDGES)
FACILITY_TYPES = frozenset({"hospital", "shelter"})


def _is_finite_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def validate_data() -> None:
    """Reject inconsistent synthetic network configuration."""
    if set(NODE_IDS) != {f"node_{index:03d}" for index in range(1, 7)}:
        raise ValueError("The synthetic graph must contain node_001 through node_006.")
    if DISPATCH_ORIGIN not in NODE_IDS:
        raise ValueError("Dispatch origin must be a known node.")
    if len(ROAD_EDGES) != 8 or len(ROAD_IDS) != 8:
        raise ValueError("The synthetic graph must contain exactly eight unique edges.")
    if not DEFAULT_FLOODED_EDGE_IDS <= ROAD_IDS:
        raise ValueError("Default flooded edges must be known graph edges.")
    if len(FACILITIES) != 6:
        raise ValueError("The synthetic graph must contain exactly six facilities.")

    endpoint_pairs: set[frozenset[str]] = set()
    for edge in ROAD_EDGES:
        if edge["from"] not in NODE_IDS or edge["to"] not in NODE_IDS:
            raise ValueError(f"{edge['id']}: unknown endpoint.")
        if edge["from"] == edge["to"]:
            raise ValueError(f"{edge['id']}: self-loops are not allowed.")
        if not _is_finite_number(edge["travel_time"]) or edge["travel_time"] <= 0:
            raise ValueError(f"{edge['id']}: travel time must be finite and positive.")
        pair = frozenset((edge["from"], edge["to"]))
        if pair in endpoint_pairs:
            raise ValueError(f"{edge['id']}: duplicate edge endpoints.")
        endpoint_pairs.add(pair)

    facility_ids = [facility["id"] for facility in FACILITIES]
    if len(set(facility_ids)) != len(facility_ids):
        raise ValueError("Facility IDs must be unique.")
    for facility in FACILITIES:
        if facility["node_id"] not in NODE_IDS:
            raise ValueError(f"{facility['id']}: facility references an unknown node.")
        if facility["type"] not in FACILITY_TYPES:
            raise ValueError(f"{facility['id']}: invalid facility type.")
        if not _is_finite_number(facility["lat"]) or not -90 <= facility["lat"] <= 90:
            raise ValueError(f"{facility['id']}: invalid latitude.")
        if not _is_finite_number(facility["lng"]) or not -180 <= facility["lng"] <= 180:
            raise ValueError(f"{facility['id']}: invalid longitude.")


def _validated_edge_ids(edge_ids: Iterable[str] | None, label: str) -> set[str]:
    values = set(edge_ids or set())
    unknown_ids = values - ROAD_IDS
    if unknown_ids:
        raise ValueError(f"Unknown {label} IDs: {sorted(unknown_ids)}")
    return values


def build_road_graph(
    flooded_edge_ids: Iterable[str] | None = None,
    closed_edge_ids: Iterable[str] | None = None,
) -> nx.Graph:
    """Build a fresh graph after removing flooded and closed edges.

    Omitting ``flooded_edge_ids`` selects the approved default flood list.
    Passing an empty collection explicitly builds the unflooded graph.
    """
    validate_data()
    flooded = (
        set(DEFAULT_FLOODED_EDGE_IDS)
        if flooded_edge_ids is None
        else _validated_edge_ids(flooded_edge_ids, "flooded edge")
    )
    closed = _validated_edge_ids(closed_edge_ids, "closed edge")
    removed = flooded | closed

    graph = nx.Graph()
    graph.add_nodes_from(sorted(NODE_IDS))
    for edge in sorted(ROAD_EDGES, key=lambda item: item["id"]):
        if edge["id"] in removed:
            continue
        graph.add_edge(
            edge["from"],
            edge["to"],
            edge_id=edge["id"],
            road_id=edge["id"],
            travel_time=edge["travel_time"],
        )
    return graph


def calculate_reachability(
    graph: nx.Graph,
    threshold_minutes: float = REACHABILITY_THRESHOLD_MINUTES,
) -> dict[str, object]:
    """Calculate reachability from the approved dispatch origin."""
    if not _is_finite_number(threshold_minutes) or threshold_minutes < 0:
        raise ValueError("Threshold must be a finite, non-negative number.")
    if DISPATCH_ORIGIN not in graph:
        raise ValueError("Dispatch origin is missing from the graph.")

    distances = nx.single_source_dijkstra_path_length(
        graph,
        source=DISPATCH_ORIGIN,
        cutoff=threshold_minutes,
        weight="travel_time",
    )

    per_facility: list[dict[str, object]] = []
    for facility in sorted(FACILITIES, key=lambda item: item["id"]):
        travel_time = distances.get(facility["node_id"])
        per_facility.append(
            {
                "id": facility["id"],
                "facilityId": facility["id"],
                "type": facility["type"],
                "name": facility["name"],
                "nodeId": facility["node_id"],
                "lat": facility["lat"],
                "lng": facility["lng"],
                "reachable": travel_time is not None,
                "travelTimeMinutes": travel_time,
            }
        )

    reachable_count = sum(
        1 for facility in per_facility if facility["reachable"] is True
    )
    total_facilities = len(per_facility)
    return {
        "origin": DISPATCH_ORIGIN,
        "threshold": threshold_minutes,
        "reachableCount": reachable_count,
        "totalFacilities": total_facilities,
        "score": reachable_count / total_facilities if total_facilities else 0.0,
        "perFacility": per_facility,
    }


if __name__ == "__main__":
    validate_data()
    result = calculate_reachability(build_road_graph())
    print("FloodShield Ops — Synthetic Simulator")
    print(f"Origin: {DISPATCH_ORIGIN}")
    print(f"Default flooded edges: {sorted(DEFAULT_FLOODED_EDGE_IDS)}")
    print(f"Reachability score: {result['score']:.3f}")
