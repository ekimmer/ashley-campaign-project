## ADDED Requirements

### Requirement: Alerts expand to show linked articles
Clicking an alert on the Alerts page SHALL expand the alert to display a list of all articles associated with that alert. Each article in the list SHALL show headline, outlet, date published, sentiment badge, and a link to the source article.

#### Scenario: User clicks an alert with one article
- **WHEN** a user clicks on an alert that has a single linked article
- **THEN** the alert expands to reveal an article row showing headline, outlet, date, sentiment, and a clickable link to the original article

#### Scenario: User clicks an alert with multiple aggregated articles
- **WHEN** a user clicks on an alert that has multiple articles grouped under it
- **THEN** the alert expands to reveal a list of all aggregated articles, each showing headline, outlet, date, sentiment, and a clickable link

#### Scenario: User collapses an expanded alert
- **WHEN** a user clicks on an already-expanded alert
- **THEN** the article list collapses and only the alert summary is shown

### Requirement: AI-driven alert aggregation
When a new article triggers an alert during ingestion, the system SHALL determine whether the article belongs to an existing recent alert or requires a new alert. The system SHALL pass the last 7 days of existing alerts to the AI, which SHALL return either an existing alert ID to group under or indicate a new alert should be created.

#### Scenario: New article matches existing alert topic
- **WHEN** a new article is ingested that triggers an alert and the AI determines it is topically similar to an existing alert from the last 7 days
- **THEN** the article is linked to the existing alert via the alert_articles junction table and no new alert record is created

#### Scenario: New article has a novel alert topic
- **WHEN** a new article is ingested that triggers an alert and the AI determines it does not match any existing recent alert
- **THEN** a new alert record is created and the article is linked to it via the alert_articles junction table

#### Scenario: Critical alerts are not absorbed into lower-tier alerts
- **WHEN** a new article triggers a critical-tier alert and a similar standard-tier alert exists
- **THEN** the system creates a new critical alert rather than grouping it under the existing standard alert

### Requirement: Alert-articles junction table
The system SHALL use an `alert_articles` junction table to associate multiple articles with a single alert. This table SHALL have columns: id, alert_id, article_id, and created_at. All queries for alert articles SHALL use this junction table.

#### Scenario: Junction table stores article associations
- **WHEN** an article is linked to an alert (whether new or existing)
- **THEN** a row is inserted into `alert_articles` with the alert_id and article_id
- **AND** the alert's article count can be derived by counting rows in the junction table
