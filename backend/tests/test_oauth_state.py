from app.core.security import create_oauth_state, verify_oauth_state


def test_verify_oauth_state_round_trips_org_and_purpose():
    state = create_oauth_state(organization_id="org-1", user_id="user-1", purpose="zoho_connect")

    payload = verify_oauth_state(state, purpose="zoho_connect")

    assert payload is not None
    assert payload["org_id"] == "org-1"
    assert payload["user_id"] == "user-1"


def test_verify_oauth_state_rejects_wrong_purpose():
    state = create_oauth_state(organization_id="org-1", user_id="user-1", purpose="zoho_connect")

    assert verify_oauth_state(state, purpose="something_else") is None


def test_verify_oauth_state_rejects_garbage_token():
    assert verify_oauth_state("not-a-real-token", purpose="zoho_connect") is None
