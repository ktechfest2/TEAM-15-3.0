# Spec Delta

## Purpose
Give anyone a clear, public, neutral view of the evidence held for each polling unit and how it rolls up to ward level, using clearly labelled synthetic data.

## ADDED Requirements

### Requirement: Polling unit explorer
The system SHALL let users find a polling unit by state, LGA and ward selection or by unit code or name.

#### Scenario: Search by code
- **WHEN** a user enters a unit code
- **THEN** matching units are listed with their current status

### Requirement: Evidence viewer
The system SHALL show for a polling unit the original images, extracted values, validation results, status, fingerprints and audit history.

#### Scenario: Open a unit
- **WHEN** a user opens a polling unit
- **THEN** all submissions, their values and the audit timeline are displayed

### Requirement: Collation tracker
The system SHALL show, for each ward, the evidence held per unit against the published figure from the synthetic data source and whether they match.

#### Scenario: Figure does not match
- **WHEN** the evidence differs from the published demo figure
- **THEN** the row is marked "does not match" with the note that a person should take a look, not that anything is wrong

### Requirement: Submitter privacy
The public views SHALL NOT expose submitter identity.

#### Scenario: Public reads a submission
- **WHEN** an unauthenticated user views a submission
- **THEN** submitter identifiers are absent

### Requirement: Demo and non-official labelling
Every page SHALL display that the data is demo data and that the app is an independent evidence layer, not an INEC system.

#### Scenario: Any page loads
- **WHEN** any page is rendered
- **THEN** the demo-data and non-official notice is visible
