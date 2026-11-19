# Spec Delta

## Purpose
Record every significant step on a polling unit's evidence as an append-only, hash-chained event so that later changes to the history are detectable.

## ADDED Requirements

### Requirement: Append-only audit events
The system SHALL record audit events for capture, receipt, hash check, extraction, validation, comparison, confirmation and review, and SHALL NOT allow any role to update or delete them.

#### Scenario: Attempt to delete an event
- **WHEN** any role attempts to update or delete an audit event
- **THEN** the operation is refused

### Requirement: Hash chaining
Each audit event SHALL store the hash of the previous event and its own hash computed over its content and the previous hash.

#### Scenario: New event added
- **WHEN** an event is appended
- **THEN** its `prev_hash` equals the hash of the latest existing event

### Requirement: Chain verification
The system SHALL provide a verification that recomputes the chain and reports the first inconsistent event.

#### Scenario: An event is altered
- **WHEN** the content of a stored event is changed outside the application
- **THEN** chain verification fails and identifies that event

### Requirement: Honest fingerprint wording
Wherever a fingerprint is shown, the system SHALL state that it proves the file has not changed since capture and does not prove the document was genuine.

#### Scenario: Viewing a fingerprint
- **WHEN** a user opens the fingerprint information
- **THEN** the explanation is displayed
