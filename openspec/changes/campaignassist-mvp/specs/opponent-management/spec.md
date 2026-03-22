## ADDED Requirements

### Requirement: AI-detected entity review queue
The system SHALL present a queue of AI-detected entities (potential opponents and supporters) for user review and approval.

#### Scenario: Detected entities displayed
- **WHEN** the AI detects new entities in ingested articles
- **THEN** they appear in a review queue showing: name, detected role (opponent/supporter), source article headline, context excerpt, and confidence score

#### Scenario: User approves detected opponent
- **WHEN** the user clicks "Add as Opponent" on a detected entity
- **THEN** a new opponent record is created with the entity's name, auto-generated search terms, status 'active', and source 'detected'. The detected_entity is marked as resolved.

#### Scenario: User dismisses detected entity
- **WHEN** the user clicks "Dismiss" on a detected entity
- **THEN** the detected_entity is marked as resolved and no opponent record is created

### Requirement: Manual opponent creation
The user SHALL be able to manually add opponents with a name and optional details.

#### Scenario: User adds opponent manually
- **WHEN** the user fills in the "Add Opponent" form with a name
- **THEN** a new opponent record is created with auto-generated search terms, status 'active', and source 'manual'

#### Scenario: Search terms auto-generated
- **WHEN** a new opponent is created (detected or manual)
- **THEN** the system generates default search terms based on the opponent's name and the campaign's district (e.g., "John Doe", "Doe VA", "Doe Congress")

### Requirement: Opponent management
The user SHALL be able to view, edit, and deactivate tracked opponents.

#### Scenario: View opponent list
- **WHEN** the user navigates to opponent management
- **THEN** a list of all opponents is displayed with name, party, status, source, article count, and date added

#### Scenario: Edit opponent search terms
- **WHEN** the user edits an opponent's search terms
- **THEN** the updated search terms are used in subsequent Serper polling cycles

#### Scenario: Deactivate opponent
- **WHEN** the user sets an opponent's status to 'inactive'
- **THEN** the system stops polling for that opponent's articles but retains all existing data

#### Scenario: Reactivate opponent
- **WHEN** the user sets an inactive opponent's status back to 'active'
- **THEN** the system resumes polling for that opponent's articles

### Requirement: Opponent-specific article view
The user SHALL be able to view articles associated with a specific opponent.

#### Scenario: View opponent's articles
- **WHEN** the user selects a specific opponent from the opponents list
- **THEN** a filtered article table shows all articles where that opponent is the primary subject or is referenced as an entity

### Requirement: Detected entity deduplication
The system SHALL group detected entities by name so the user does not see duplicate entries for the same person across multiple articles.

#### Scenario: Same person detected in multiple articles
- **WHEN** the AI detects "John Doe" in 3 separate articles
- **THEN** the review queue shows one entry for "John Doe" with a count of 3 articles and links to each source article
