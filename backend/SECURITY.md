# Backend demo security notes

Approval and sandbox execution require an `Authorization: Bearer <token>` header.
The backend compares the token against the process environment variable
`OPERATOR_AUTH_TOKEN` and records the server-configured `CONTROL_ROOM_OPERATOR`
identity in the audit payload. The request-body `approvedBy` and `executedBy`
fields are accepted only as backwards-compatible metadata; they are not used
to authenticate or authorize the caller.

This is a minimal shared-token mechanism for the synthetic hackathon demo. It
is not a user-management system, does not provide token rotation or revocation,
and must be used only over a private network or HTTPS in any deployment. The
token must be supplied through the process environment and must never be
committed, logged, or placed in a frontend bundle.

The simulator and all dispatch behavior remain sandbox-only. No SMS, email,
radio, or real-world road-control action is performed by this repository.
