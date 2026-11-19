# Spec Delta

## Purpose
Extract figures from result-sheet images, check that they are arithmetically consistent, compare independent submissions, and derive a neutral status for each polling unit.

## ADDED Requirements

### Requirement: Machine-assisted extraction with confidence
The system SHALL extract registered voters, accredited voters, votes per party, valid votes, rejected votes and total votes cast as structured data with a confidence value per field, and SHALL label them as machine-assisted.

#### Scenario: Low-confidence field
- **WHEN** a field's confidence is below the configured threshold
- **THEN** the field is flagged "check" and the submission is routed to human review

### Requirement: Observer confirmation kept separate
The system SHALL store observer-confirmed values separately from machine values and SHALL NOT overwrite machine values.

#### Scenario: Observer fixes a number
- **WHEN** an observer corrects a machine-read value
- **THEN** both the machine value and the confirmed value are retained and shown

### Requirement: Arithmetic validation
The system SHALL check that party votes sum to valid votes, valid plus rejected equals total cast, total cast does not exceed accredited, accredited does not exceed registered, and that no value is negative or missing.

#### Scenario: Party votes do not sum
- **WHEN** party votes do not equal valid votes
- **THEN** the check fails with a message naming the figures involved and the status becomes "Needs human review"

### Requirement: Independent submission comparison
The system SHALL compare extracted values field by field across submissions from different signed-in submitters and SHALL treat identical file hashes as a single submission.

#### Scenario: Two submissions differ
- **WHEN** two independent submissions disagree on a field
- **THEN** the unit's status becomes "Disputed" and the differing field is named, using neutral wording

#### Scenario: Same file from two senders
- **WHEN** two submitters upload files with the same hash
- **THEN** they count as one submission and do not produce "Two people agree"

### Requirement: Neutral status vocabulary
The system SHALL use only these statuses: Waiting for review, Needs human review, Two people agree, Disputed, Reviewed. It SHALL NOT display wording that asserts fraud, correctness or a winner.

#### Scenario: Two independent photos agree
- **WHEN** two independent submissions match on every field and pass arithmetic checks
- **THEN** the status is "Two people agree"
