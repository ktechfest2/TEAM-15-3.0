# Spec Delta

## Purpose
Let trained reviewers resolve disputes and uncertain reads visibly, without ever editing submitted figures.

## ADDED Requirements

### Requirement: Review queue
The system SHALL show reviewers a queue of Disputed units, low-confidence reads and failed arithmetic checks.

#### Scenario: Open the queue
- **WHEN** a reviewer opens the console
- **THEN** items needing attention are listed with their reason

### Requirement: Recorded decisions
The system SHALL let a reviewer record one of: photo matches submission 1, photo matches submission 2, request a new photo, leave open, together with a public note.

#### Scenario: Reviewer decides
- **WHEN** a reviewer records a decision
- **THEN** it is stored as a review, an audit event is appended and the unit's public status becomes "Reviewed" or remains open as chosen

### Requirement: No editing of submissions
The system SHALL NOT allow reviewers to modify submitted images or extracted values.

#### Scenario: Reviewer attempts an edit
- **WHEN** a reviewer attempts to change a submission's values
- **THEN** the operation is refused

### Requirement: Reviewer-only access
Only users with the reviewer role SHALL create reviews.

#### Scenario: Observer attempts to review
- **WHEN** an observer attempts to create a review
- **THEN** the operation is refused
