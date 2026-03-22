## ADDED Requirements

### Requirement: Tiered alert creation
The system SHALL create an alert record whenever an article is classified with an alert_tier of 'critical', 'high', or 'standard'.

#### Scenario: Critical alert created
- **WHEN** an article is classified with alert_tier 'critical'
- **THEN** an alert record is created with tier 'critical', a title derived from the article headline, and a description explaining the alert reason

#### Scenario: High alert created
- **WHEN** an article is classified with alert_tier 'high'
- **THEN** an alert record is created with tier 'high'

#### Scenario: Standard alert created
- **WHEN** an article is classified with alert_tier 'standard'
- **THEN** an alert record is created with tier 'standard'

### Requirement: Critical alert immediate email delivery
The system SHALL send an immediate email notification for critical-tier alerts.

#### Scenario: Critical alert triggers email
- **WHEN** a critical alert is created
- **THEN** an email is sent immediately to the campaign's configured alert_email via Resend, containing the article headline, outlet, sentiment, alert reason, and a link to view the article in the dashboard

#### Scenario: Email delivery failure
- **WHEN** the email fails to send
- **THEN** the alert is still stored in the database and the failure is logged

### Requirement: Daily digest email
The system SHALL generate and send a daily digest email at the campaign's configured digest time.

#### Scenario: Daily digest content
- **WHEN** the digest cron triggers
- **THEN** an email is composed containing: a 3-sentence overnight summary, count of new articles per bin since last digest, any alert-tier events from the past 24 hours, and the latest VA Politics briefing highlights

#### Scenario: No new articles
- **WHEN** the digest triggers but no new articles have been ingested since the last digest
- **THEN** the digest is still sent with a "No new coverage detected" message and any other available intelligence

#### Scenario: Digest delivered
- **WHEN** the digest email is composed
- **THEN** it is sent to the campaign's alert_email and a record is stored in the digests table

### Requirement: Alert dashboard view
The user SHALL be able to view and manage alerts in the dashboard.

#### Scenario: Alert list display
- **WHEN** the user navigates to the Alerts section
- **THEN** alerts are displayed in a list sorted by created_at descending, with color-coded tier indicators (red=critical, amber=high, green=standard)

#### Scenario: Acknowledge alert
- **WHEN** the user clicks "Acknowledge" on an alert
- **THEN** the alert's `acknowledged` field is set to true and `acknowledged_at` is recorded

#### Scenario: Filter alerts by tier
- **WHEN** the user filters alerts by tier
- **THEN** only alerts matching the selected tier are displayed

#### Scenario: Unacknowledged alert count badge
- **WHEN** there are unacknowledged alerts
- **THEN** the Alerts navigation item shows a badge with the count of unacknowledged alerts
