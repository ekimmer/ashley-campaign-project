## ADDED Requirements

### Requirement: AI extracts negative comments targeting candidate or party
The per-article AI analysis SHALL extract specific negative comments or statements directed at the candidate (Tara Durant) or the Virginia GOP in the context of the congressional race. Each detected hit SHALL include the source name (person or organization making the statement), a 1-2 sentence summary of the negative comment, and the surrounding context from the article.

#### Scenario: Article contains a negative comment about the candidate
- **WHEN** an article contains a quote from a Democrat affiliate saying "Tara Durant has failed to deliver on her education promises"
- **THEN** the AI returns a candidate_hit with source_name "Democrat Affiliate Name", comment_summary describing the attack, and context containing the surrounding quote

#### Scenario: Article contains a negative comment about the Virginia GOP
- **WHEN** an article contains a statement criticizing the Virginia GOP's stance on a policy issue in the context of the congressional race
- **THEN** the AI returns a candidate_hit with the source identified, summary of the criticism, and article context

#### Scenario: Article has no negative comments about candidate or party
- **WHEN** an article does not contain any tonally negative statements about Tara Durant or the Virginia GOP
- **THEN** the AI returns an empty candidate_hits array

#### Scenario: Multiple hits in one article
- **WHEN** an article contains negative comments from multiple sources
- **THEN** the AI returns a separate hit entry for each distinct negative comment

### Requirement: Candidate hits stored in database
The system SHALL store detected candidate hits in a `candidate_hits` table with columns: id, campaign_id, article_id, source_name, comment_summary, context, created_at. The table SHALL have RLS policies scoped to the user's campaigns.

#### Scenario: Hit records created during ingestion
- **WHEN** the AI detects candidate hits in a new article
- **THEN** one record per hit is inserted into the `candidate_hits` table with the article_id linked

### Requirement: Tara/GOP Hits tab on Opponents page
The Opponents page SHALL include a "Tara/GOP Hits" tab that displays all detected negative comments in a table. The table SHALL show columns: source name, date (from the linked article's date_published), comment/hit summary, and a link to the source article. The table SHALL be sorted by date descending (most recent first).

#### Scenario: User views the Tara/GOP Hits tab
- **WHEN** a user navigates to the Opponents page and clicks the "Tara/GOP Hits" tab
- **THEN** a table is displayed showing all candidate hits with source name, date, summary, and article link sorted by most recent first

#### Scenario: No hits detected yet
- **WHEN** no candidate hits have been detected for the campaign
- **THEN** the tab displays an empty state message indicating no negative hits have been detected

#### Scenario: Clicking article link from hits table
- **WHEN** a user clicks the article link on a hit row
- **THEN** the user is taken to the source article (either opens in new tab or shows article detail dialog)
