"""
FloodShield Ops — deterministic synthetic road network.

All roads, travel times, and facilities below are synthetic
test data, not real Bengaluru traffic or flood measurements.
"""

from __future__ import annotations

import math
from typing import Any

import networkx as nx


# -------------------- Configuration --------------------

REACHABILITY_THRESHOLD_MINUTES = 30
DISPATCH_ORIGIN = "N01"

NODE_IDS = ("N01", "N02", "N03", "N04", "N05")

# Each travel time is a fixed, positive number of minutes.
# The graph is undirected, so travel time is equal in both directions.
ROAD_EDGES = (
    {
        "id": "R01",
        "from": "N01",
        "to": "N02",
        "travel_time": 5,
    },
    {
        "id": "R02",
        "from": "N02",
        "to": "N03",
        "travel_time": 4,
    },
    {
        "id": "R03",
        "from": "N03",
        "to": "N04",
        "travel_time": 6,
    },
    {
        "id": "R04",
        "from": "N02",
        "to": "N05",
        "travel_time": 3,
    },
    {
        "id": "R05",
        "from": "N05",
        "to": "N04",
        "travel_time": 5,
    },
    {
        "id": "R06",
        "from": "N01",
        "to": "N05",
        "travel_time": 8,
    },
)

FACILITIES = (
    {
        "id": "H01",
        "type": "hospital",
        "name": "Demo Hospital",
        "node_id": "N04",
    },
    {
        "id": "S01",
        "type": "shelter",
        "name": "Demo Shelter",
        "node_id": "N05",
    },
)

ROAD_IDS = frozenset(road["id"] for road in ROAD_EDGES)
FACILITY_TYPES = frozenset({"hospital", "shelter"})


# -------------------- Validation --------------------


def _is_finite_number(value: Any) -> bool:
    """Return True for finite ints/floats, excluding booleans."""
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def validate_data() -> None:
    """Reject inconsistent synthetic network configuration."""

    if not NODE_IDS:
        raise ValueError("At least one node is required.")

    if len(set(NODE_IDS)) != len(NODE_IDS):
        raise ValueError("Node IDs must be unique.")

    if DISPATCH_ORIGIN not in NODE_IDS:
        raise ValueError("Dispatch origin must be a known node.")

    road_ids = [road["id"] for road in ROAD_EDGES]

    if len(set(road_ids)) != len(road_ids):
        raise ValueError("Road IDs must be unique.")

    facility_ids = [facility["id"] for facility in FACILITIES]

    if len(set(facility_ids)) != len(facility_ids):
        raise ValueError("Facility IDs must be unique.")

    physical_road_pairs: set[frozenset[str]] = set()

    for road in ROAD_EDGES:
        road_id = road["id"]
        start = road["from"]
        end = road["to"]
        travel_time = road["travel_time"]

        if start not in NODE_IDS or end not in NODE_IDS:
            raise ValueError(f"{road_id}: unknown endpoint.")

        if start == end:
            raise ValueError(f"{road_id}: self-loops are not allowed.")

        if not _is_finite_number(travel_time) or travel_time <= 0:
            raise ValueError(
                f"{road_id}: travel time must be finite and positive."
            )

        # nx.Graph cannot represent two separate roads between the same
        # pair of nodes. Reject duplicate physical connections.
        endpoint_pair = frozenset((start, end))

        if endpoint_pair in physical_road_pairs:
            raise ValueError(
                f"{road_id}: duplicate road endpoints "
                f"({start}, {end})."
            )

        physical_road_pairs.add(endpoint_pair)

    for facility in FACILITIES:
        facility_id = facility["id"]
        node_id = facility["node_id"]
        facility_type = facility["type"]

        if node_id not in NODE_IDS:
            raise ValueError(
                f"{facility_id}: facility references an unknown node."
            )

        if facility_type not in FACILITY_TYPES:
            raise ValueError(
                f"{facility_id}: invalid facility type "
                f"'{facility_type}'."
            )


# -------------------- Graph Construction --------------------


def build_road_graph(
    flooded_edge_ids: set[str] | None = None,
) -> nx.Graph:
    """
    Build and return a fresh undirected graph.

    Flooded roads are excluded from the graph. Unknown flooded road IDs
    are rejected rather than silently ignored.
    """
    validate_data()

    flooded = set(flooded_edge_ids or set())
    unknown_ids = flooded - ROAD_IDS

    if unknown_ids:
        raise ValueError(
            f"Unknown flooded road IDs: {sorted(unknown_ids)}"
        )

    graph = nx.Graph()

    # Add all nodes, including isolated nodes.
    graph.add_nodes_from(sorted(NODE_IDS))

    for road in sorted(ROAD_EDGES, key=lambda item: item["id"]):
        if road["id"] in flooded:
            continue

        graph.add_edge(
            road["from"],
            road["to"],
            road_id=road["id"],
            travel_time=road["travel_time"],
        )

    return graph


# -------------------- Reachability --------------------


def calculate_reachability(
    graph: nx.Graph,
    threshold_minutes: float = REACHABILITY_THRESHOLD_MINUTES,
) -> dict[str, object]:
    """
    Calculate which facilities are reachable from the dispatch origin.

    A facility is reachable when its shortest travel time is less than
    or equal to the threshold.

    Score:
        reachable facilities / total facilities
    """
    if (
        not _is_finite_number(threshold_minutes)
        or threshold_minutes < 0
    ):
        raise ValueError(
            "Threshold must be a finite, non-negative number."
        )

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
        node_id = facility["node_id"]
        travel_time = distances.get(node_id)

        per_facility.append(
            {
                "id": facility["id"],
                "type": facility["type"],
                "name": facility["name"],
                "nodeId": node_id,
                "reachable": travel_time is not None,
                "travelTimeMinutes": travel_time,
            }
        )

    total_facilities = len(per_facility)
    reachable_count = sum(
        1
        for facility in per_facility
        if facility["reachable"] is True
    )

    score = (
        reachable_count / total_facilities
        if total_facilities > 0
        else 0.0
    )

    return {
        "origin": DISPATCH_ORIGIN,
        "threshold": threshold_minutes,
        "reachableCount": reachable_count,
        "totalFacilities": total_facilities,
        "score": score,
        "perFacility": per_facility,
    }


# -------------------- Demonstration --------------------


def main() -> None:
    validate_data()

    # Synthetic demonstration: road R02 is flooded.
    flooded_roads = {"R02"}

    graph = build_road_graph(flooded_roads)
    result = calculate_reachability(graph)

    print("FloodShield Ops — Synthetic Simulator")
    print(f"Origin: {DISPATCH_ORIGIN}")
    print(f"Flooded roads: {sorted(flooded_roads)}")
    print(f"Remaining roads: {graph.number_of_edges()}")

    print(
        "Reachability: "
        f"{result['reachableCount']}/"
        f"{result['totalFacilities']} facilities"
    )

    print(f"Score: {result['score']:.2f}")
    print("Facility results:")

    for facility in result["perFacility"]:
        print(
            f"  {facility['id']} ({facility['type']}): "
            f"reachable={facility['reachable']}, "
            f"time={facility['travelTimeMinutes']} minutes"
        )


if __name__ == "__main__":
    main()