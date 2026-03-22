## ADDED Requirements

### Requirement: AI-generated political landscape briefing
The system SHALL generate a 300-500 word rolling briefing synthesizing the current Virginia political landscape from ingested news articles flagged as VA-politics-relevant.

#### Scenario: Briefing generation
- **WHEN** new VA-politics-relevant articles have been ingested since the last briefing
- **THEN** the system generates a new briefing via Claude that covers: key political dynamics, notable endorsements, party dynamics, and relevant district-level context

#### Scenario: Briefing includes "So What" section
- **WHEN** a briefing is generated
- **THEN** it concludes with a "So What" section containing 2-3 strategic implications for the campaign

### Requirement: Hot-button issues tracker
The system SHALL maintain a ranked list of the top 5-10 issues driving Virginia political discourse, derived from article analysis.

#### Scenario: Issues ranked by volume
- **WHEN** the hot issues list is generated
- **THEN** issues are ranked by frequency of appearance across recent articles, with each issue showing: a plain-language summary, partisan lean, and relevance to the district

#### Scenario: Issues re-ranked on new data
- **WHEN** new articles shift the distribution of political topics
- **THEN** the hot issues ranking is updated to reflect current discourse

### Requirement: VA Politics dashboard view
The user SHALL be able to view the latest VA Politics briefing and hot issues on a dedicated dashboard page.

#### Scenario: User views VA Politics page
- **WHEN** the user navigates to the VA Politics section
- **THEN** the page displays: the latest briefing text with generation timestamp, the ranked hot issues list, and a "So What" section with strategic implications

#### Scenario: No briefing available yet
- **WHEN** the system has not yet generated a briefing (no VA-politics-relevant articles)
- **THEN** the page displays a message indicating insufficient data and shows any articles flagged as VA-politics-relevant

### Requirement: Briefing regeneration
The system SHALL regenerate the VA Politics briefing daily as part of the digest generation process, and on-demand when the user requests it.

#### Scenario: Daily regeneration
- **WHEN** the daily digest cron runs
- **THEN** a new VA Politics briefing is generated from articles of the past 7 days

#### Scenario: Manual refresh
- **WHEN** the user clicks a "Refresh Briefing" button
- **THEN** a new briefing is generated immediately from the most recent articles
