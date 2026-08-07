# ADR-005: Multi-Policy Conflict Resolution Engine

- **Status**: APPROVED
- **Date**: 2026-07-31
- **Deciders**: DWIP Enterprise Technical Steering Committee
- **Technical Story**: Resolving data collisions between offline workshop updates and cloud OEM master records.

---

## Context and Problem Statement

When workshops operate offline or under delayed sync conditions, simultaneous mutations to vehicle attributes or customer profiles on both the local DWIP node and OEM server produce data conflicts.

## Decision Outcome

Implemented `ConflictResolver`:
- Enforces configurable conflict resolution policies:
  1. `SERVER_WINS`: Cloud OEM record overrides local state.
  2. `CLIENT_WINS`: Local DWIP workshop record overrides cloud state.
  3. `LATEST_TIMESTAMP`: Record with most recent timestamp prevails.
  4. `MANUAL_APPROVAL`: Conflict flagged for General Manager manual sign-off.
