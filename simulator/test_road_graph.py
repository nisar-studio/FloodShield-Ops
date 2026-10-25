import math

import pytest

from road_graph import (
    DEFAULT_FLOODED_EDGE_IDS,
    FACILITIES,
    NODE_IDS,
    ROAD_EDGES,
    build_road_graph,
    calculate_reachability,
    validate_data,
)


def facilities_by_id(result: dict) -> dict[str, dict]:
    return {facility["id"]: facility for facility in result["perFacility"]}


def test_approved_synthetic_data_is_valid() -> None:
    validate_data()


def test_graph_has_exact_approved_nodes_and_edges() -> None:
    graph = build_road_graph(set())

    assert set(graph.nodes) == set(NODE_IDS)
    assert graph.number_of_edges() == 8
    assert {
        data["edge_id"] for _, _, data in graph.edges(data=True)
    } == {edge["id"] for edge in ROAD_EDGES}


def test_default_flooding_isolates_node_003() -> None:
    graph = build_road_graph()

    assert DEFAULT_FLOODED_EDGE_IDS == {"edge_002", "edge_003"}
    assert graph.has_node("node_003")
    assert graph.degree("node_003") == 0


def test_default_reachability_has_exact_six_facility_entries() -> None:
    result = calculate_reachability(build_road_graph())
    facilities = facilities_by_id(result)

    assert result["reachableCount"] == 5
    assert result["totalFacilities"] == 6
    assert result["score"] == pytest.approx(5 / 6)
    assert set(facilities) == {facility["id"] for facility in FACILITIES}
    assert facilities["fac_003"]["reachable"] is False
    assert facilities["fac_003"]["travelTimeMinutes"] is None
    assert facilities["fac_005"]["travelTimeMinutes"] == 5


def test_alternative_routes_follow_the_approved_edge_table() -> None:
    result = calculate_reachability(build_road_graph({"edge_002", "edge_003", "edge_004"}))
    facilities = facilities_by_id(result)

    # node_005 remains reachable through node_001 -> node_002 -> node_006
    # -> node_005: 5 + 4 + 3 = 12 minutes.
    assert facilities["fac_004"]["reachable"] is True
    assert facilities["fac_004"]["travelTimeMinutes"] == 12


def test_road_closures_can_remove_an_alternate_route() -> None:
    graph = build_road_graph(
        DEFAULT_FLOODED_EDGE_IDS,
        closed_edge_ids={"edge_005", "edge_006", "edge_007", "edge_008"},
    )
    result = calculate_reachability(graph)
    facilities = facilities_by_id(result)

    assert facilities["fac_002"]["reachable"] is False
    assert facilities["fac_002"]["travelTimeMinutes"] is None


def test_threshold_is_inclusive_and_rejects_invalid_values() -> None:
    result = calculate_reachability(build_road_graph(), threshold_minutes=15)
    facilities = facilities_by_id(result)
    assert facilities["fac_001"]["reachable"] is True
    assert facilities["fac_001"]["travelTimeMinutes"] == 15

    for threshold in (-1, math.nan, math.inf, -math.inf, True):
        with pytest.raises(ValueError, match="Threshold"):
            calculate_reachability(build_road_graph(), threshold)  # type: ignore[arg-type]


def test_unknown_edge_ids_are_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown flooded edge IDs"):
        build_road_graph({"edge_999"})

    with pytest.raises(ValueError, match="Unknown closed edge IDs"):
        build_road_graph(set(), {"edge_999"})
