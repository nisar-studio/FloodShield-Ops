import math

import pytest

from road_graph import (
    FACILITIES,
    NODE_IDS,
    build_road_graph,
    calculate_reachability,
    validate_data,
)


def facilities_by_id(result: dict) -> dict[str, dict]:
    """Convert per-facility results into a dictionary keyed by facility ID."""
    return {
        facility["id"]: facility
        for facility in result["perFacility"]
    }


def test_synthetic_data_is_valid() -> None:
    """Configured synthetic data should pass validation."""
    validate_data()


def test_graph_contains_all_expected_nodes() -> None:
    """The graph should include every configured node."""
    graph = build_road_graph()

    assert set(graph.nodes) == set(NODE_IDS)


def test_graph_contains_all_expected_roads() -> None:
    """The graph should contain all roads when none are flooded."""
    graph = build_road_graph()

    road_ids = {
        data["road_id"]
        for _, _, data in graph.edges(data=True)
    }

    assert graph.number_of_edges() == 6
    assert road_ids == {
        "R01",
        "R02",
        "R03",
        "R04",
        "R05",
        "R06",
    }


def test_flooded_road_is_removed() -> None:
    """A flooded road should not be included in the graph."""
    graph = build_road_graph({"R02"})

    road_ids = {
        data["road_id"]
        for _, _, data in graph.edges(data=True)
    }

    assert "R02" not in road_ids
    assert graph.number_of_edges() == 5


def test_multiple_flooded_roads_are_removed() -> None:
    """All specified flooded roads should be removed."""
    flooded_roads = {"R01", "R02", "R06"}
    graph = build_road_graph(flooded_roads)

    road_ids = {
        data["road_id"]
        for _, _, data in graph.edges(data=True)
    }

    assert road_ids.isdisjoint(flooded_roads)
    assert graph.number_of_edges() == 3


def test_building_a_graph_does_not_modify_future_graphs() -> None:
    """Each call should return an independent, fresh graph."""
    first_graph = build_road_graph({"R02"})
    second_graph = build_road_graph()

    assert first_graph.number_of_edges() == 5
    assert second_graph.number_of_edges() == 6


def test_normal_scenario_reaches_all_facilities() -> None:
    """Both facilities should be reachable without flooding."""
    result = calculate_reachability(build_road_graph())

    assert result["reachableCount"] == len(FACILITIES)
    assert result["totalFacilities"] == len(FACILITIES)
    assert result["score"] == pytest.approx(1.0)

    facilities = facilities_by_id(result)

    assert facilities["H01"]["reachable"] is True
    assert facilities["H01"]["travelTimeMinutes"] == 13

    assert facilities["S01"]["reachable"] is True
    assert facilities["S01"]["travelTimeMinutes"] == 8


def test_flooded_road_can_still_leave_facilities_reachable() -> None:
    """
    Flooding R02 should not block the facilities because alternate
    routes are still available.
    """
    result = calculate_reachability(
        build_road_graph({"R02"})
    )

    assert result["reachableCount"] == 2
    assert result["score"] == pytest.approx(1.0)

    facilities = facilities_by_id(result)

    assert facilities["H01"]["travelTimeMinutes"] == 13
    assert facilities["S01"]["travelTimeMinutes"] == 8


def test_blocked_origin_reaches_no_facilities() -> None:
    """Removing both roads from the origin should isolate it."""
    graph = build_road_graph({"R01", "R06"})
    result = calculate_reachability(graph)

    assert result["reachableCount"] == 0
    assert result["score"] == pytest.approx(0.0)

    facilities = facilities_by_id(result)

    for facility in facilities.values():
        assert facility["reachable"] is False
        assert facility["travelTimeMinutes"] is None


def test_all_roads_flooded_reaches_no_facilities() -> None:
    """With every road flooded, all nodes remain but no facility is reachable."""
    all_road_ids = {
        data["road_id"]
        for _, _, data in build_road_graph().edges(data=True)
    }

    graph = build_road_graph(all_road_ids)
    result = calculate_reachability(graph)

    assert graph.number_of_nodes() == len(NODE_IDS)
    assert graph.number_of_edges() == 0
    assert result["reachableCount"] == 0
    assert result["score"] == pytest.approx(0.0)


def test_unknown_flooded_road_is_rejected() -> None:
    """Unknown road IDs should raise a clear error."""
    with pytest.raises(
        ValueError,
        match="Unknown flooded road IDs",
    ):
        build_road_graph({"R999"})


@pytest.mark.parametrize(
    "threshold",
    [
        -1,
        math.nan,
        math.inf,
        -math.inf,
        True,
    ],
)
def test_invalid_threshold_is_rejected(threshold: object) -> None:
    """Thresholds must be finite, non-negative numbers."""
    graph = build_road_graph()

    with pytest.raises(
        ValueError,
        match="Threshold",
    ):
        calculate_reachability(graph, threshold)  # type: ignore[arg-type]


def test_threshold_is_inclusive() -> None:
    """A facility exactly at the threshold should be reachable."""
    result = calculate_reachability(
        build_road_graph(),
        threshold_minutes=13,
    )

    facilities = facilities_by_id(result)

    assert facilities["H01"]["travelTimeMinutes"] == 13
    assert facilities["H01"]["reachable"] is True


def test_facility_above_threshold_is_unreachable() -> None:
    """A facility above the threshold should be unreachable."""
    result = calculate_reachability(
        build_road_graph(),
        threshold_minutes=12,
    )

    facilities = facilities_by_id(result)

    assert facilities["H01"]["travelTimeMinutes"] is None
    assert facilities["H01"]["reachable"] is False

    assert facilities["S01"]["travelTimeMinutes"] == 8
    assert facilities["S01"]["reachable"] is True


def test_repeated_runs_produce_identical_results() -> None:
    """The deterministic simulator should return the same result each time."""
    first_result = calculate_reachability(
        build_road_graph({"R02"})
    )
    second_result = calculate_reachability(
        build_road_graph({"R02"})
    )

    assert first_result == second_result