from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def action(action_id: str, action_type: str = "road_closure", edge_ids=None) -> dict:
    return {
        "actionId": action_id,
        "type": action_type,
        "target": {
            "edgeIds": edge_ids or ["edge_004"],
            "label": "Synthetic test target",
        },
        "rationale": "Protect synthetic facility access.",
        "evidence": ["hotspot hs_001"],
        "confidence": 0.8,
    }


def test_simulate_returns_approved_result_shape() -> None:
    response = client.post(
        "/simulate",
        json={"scenarioId": "blr-2022-09-replay", "planId": "plan_001", "actions": []},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "planId",
        "baselineScore",
        "planScore",
        "threshold",
        "passed",
        "perFacility",
        "floodedEdgeIds",
    }
    assert body["planId"] == "plan_001"
    assert body["floodedEdgeIds"] == ["edge_002", "edge_003"]
    assert len(body["perFacility"]) == 6
    assert len({item["facilityId"] for item in body["perFacility"]}) == 6
    assert body["passed"] is (body["planScore"] >= body["threshold"])


def test_threshold_is_configurable_and_controls_passed() -> None:
    low = client.post(
        "/simulate",
        json={
            "scenarioId": "blr-2022-09-replay",
            "actions": [],
            "threshold": 0.83,
        },
    )
    high = client.post(
        "/simulate",
        json={
            "scenarioId": "blr-2022-09-replay",
            "actions": [],
            "threshold": 0.84,
        },
    )

    assert low.status_code == 200
    assert low.json()["passed"] is True
    assert high.status_code == 200
    assert high.json()["passed"] is False


def test_road_closure_changes_planned_graph_but_not_flood_observations() -> None:
    response = client.post(
        "/simulate",
        json={
            "scenarioId": "blr-2022-09-replay",
            "actions": [
                action(
                    "act_001",
                    edge_ids=["edge_005", "edge_006", "edge_007", "edge_008"],
                )
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["floodedEdgeIds"] == ["edge_002", "edge_003"]
    assert body["planScore"] < body["baselineScore"]


def test_invalid_and_unsupported_actions_return_contract_errors() -> None:
    unsupported = client.post(
        "/simulate",
        json={
            "scenarioId": "blr-2022-09-replay",
            "actions": [action("act_unsupported", "reopen_road")],
        },
    )
    invalid = client.post(
        "/simulate",
        json={
            "scenarioId": "blr-2022-09-replay",
            "actions": [action("act_invalid", edge_ids=["edge_999"])],
        },
    )

    assert unsupported.status_code == 422
    assert unsupported.json() == {
        "error": {
            "code": "UNSUPPORTED_ACTION",
            "message": "Action type 'reopen_road' is not supported.",
            "actionId": "act_unsupported",
        }
    }
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "INVALID_REQUEST"
    assert invalid.json()["error"]["actionId"] == "act_invalid"


def test_scenario_and_read_routes_use_the_approved_id() -> None:
    assert client.get("/facilities?scenarioId=blr-2022-09-replay").status_code == 200
    assert client.get("/hotspots?scenarioId=blr-2022-09-replay").status_code == 200

    missing = client.get("/hotspots?scenarioId=not-a-scenario")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "SCENARIO_NOT_FOUND"


def test_replay_flood_observations_cannot_be_overridden_by_public_request() -> None:
    response = client.post(
        "/simulate",
        json={
            "scenarioId": "blr-2022-09-replay",
            "actions": [],
            "floodedEdgeIds": [],
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_unknown_routes_use_the_standard_error_envelope() -> None:
    response = client.get("/not-a-simulator-route")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "Not Found",
        }
    }
