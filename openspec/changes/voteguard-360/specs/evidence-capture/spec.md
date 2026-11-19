# Spec Delta

## Purpose
Let an observer photograph a polling-unit result sheet and preserve it with a tamper-evident fingerprint, even without network coverage.

## ADDED Requirements

### Requirement: On-device fingerprint at capture
The system SHALL compute a SHA-256 fingerprint of each captured image in the browser at capture time and store it with the capture timestamp before any upload.

#### Scenario: Capture while offline
- **WHEN** an observer saves a photo with no network connection
- **THEN** the fingerprint and capture time are stored on the device and the item is shown as "waiting to upload"

### Requirement: Queued synchronisation
The system SHALL keep unsent captures in a persistent on-device queue and upload them automatically when connectivity returns.

#### Scenario: Signal returns
- **WHEN** the device regains connectivity while captures are queued
- **THEN** each capture is uploaded in order and the observer receives a receipt showing the fingerprint

### Requirement: Write-once original storage
The system SHALL store the original uploaded image so that it cannot be overwritten or deleted by any application role.

#### Scenario: Attempt to replace a stored image
- **WHEN** any role attempts to overwrite or delete a stored evidence image
- **THEN** the operation is refused

### Requirement: Server hash re-check
The system SHALL recompute the SHA-256 of the stored image and compare it with the client fingerprint.

#### Scenario: Hashes differ
- **WHEN** the recomputed hash does not equal the client fingerprint
- **THEN** the submission is flagged as "fingerprint mismatch" and the event is recorded in the audit trail

### Requirement: Correct polling-unit association
The system SHALL require the observer to select a polling unit and confirm its name and code before saving a capture.

#### Scenario: Confirmation shown
- **WHEN** an observer starts a capture
- **THEN** the selected unit's name, code and ward are displayed for confirmation
