# Spec Delta

## Purpose
Make evidence and status understandable and usable by voters who are blind or have low vision, cannot read English, have low literacy, or are elderly.

## ADDED Requirements

### Requirement: Listen to a result sheet
The system SHALL read a polling unit's verified figures and status aloud in plain language using text-to-speech, with the same wording available as text.

#### Scenario: Press Listen
- **WHEN** a user presses Listen on an evidence page
- **THEN** the party figures and the status are spoken and the transcript is shown

### Requirement: Narration restraint
The narration SHALL be generated only from verified fields and the current status, and SHALL NOT contain the words "correct", "fraud" or "winner".

#### Scenario: Disputed unit
- **WHEN** a unit is Disputed
- **THEN** the narration states that two photos differ on a named figure and that a person will look at it

### Requirement: Language options with honest limits
The system SHALL offer narration text in English and Nigerian Pidgin, and SHALL show text only when no suitable voice exists for a language.

#### Scenario: No voice available
- **WHEN** the device has no voice for the chosen language
- **THEN** the text is shown with a note that audio is unavailable

### Requirement: Accessibility mode
The system SHALL provide large text, high contrast, reduced motion and slow-voice options, screen-reader labels on all controls, and full keyboard operation.

#### Scenario: Enable large text
- **WHEN** a user turns on large text
- **THEN** all primary content scales up and the setting persists across visits

### Requirement: Easy-read statuses
Each status SHALL be explained in one short plain-English sentence with an icon, and in Nigerian Pidgin.

#### Scenario: View a status
- **WHEN** a status is displayed
- **THEN** the short sentence and icon appear beside the status label
