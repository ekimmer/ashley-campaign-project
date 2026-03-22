## ADDED Requirements

### Requirement: Automated news polling
The system SHALL poll the Serper API every 30 minutes for news articles matching the campaign's configured search terms.

#### Scenario: Scheduled polling executes
- **WHEN** 30 minutes have elapsed since the last poll
- **THEN** the system queries Serper API with search terms for the candidate bin, each active opponent bin, and the general race bin

#### Scenario: Search terms are campaign-specific
- **WHEN** a poll executes for a campaign
- **THEN** it uses only the search terms configured in that campaign's `search_config`

### Requirement: Article deduplication
The system SHALL NOT ingest duplicate articles. Deduplication is based on URL uniqueness per campaign.

#### Scenario: New article URL
- **WHEN** Serper returns an article with a URL not yet stored for this campaign
- **THEN** the system proceeds to scrape and ingest the article

#### Scenario: Duplicate article URL
- **WHEN** Serper returns an article with a URL already stored for this campaign
- **THEN** the system skips that article

### Requirement: Full-text article scraping
The system SHALL attempt to scrape the full text of each new article from its source URL.

#### Scenario: Successful scrape
- **WHEN** the article page is accessible and contains extractable text
- **THEN** the system stores the full article text in the `full_text` field

#### Scenario: Paywall detected
- **WHEN** the article is behind a paywall
- **THEN** the system logs the article with available metadata (headline, outlet, date) and sets `paywall_status` to `unavailable`

#### Scenario: Scrape failure
- **WHEN** the article page cannot be fetched or parsed
- **THEN** the system logs the article with available metadata from the Serper result and sets `full_text` to null

### Requirement: Article storage
The system SHALL store each ingested article in the `articles` table with all metadata fields populated from the Serper result and scrape.

#### Scenario: Article stored with metadata
- **WHEN** a new article is ingested
- **THEN** the article record includes: headline, url, reporter (if available), outlet, date_published, paywall_status, campaign_id, and ingested_at timestamp

### Requirement: Per-opponent search queries
The system SHALL execute separate Serper queries for each active opponent, using that opponent's configured search terms.

#### Scenario: Opponent added with search terms
- **WHEN** an opponent with status 'active' exists for a campaign
- **THEN** the next polling cycle includes a Serper query using that opponent's search terms

#### Scenario: Opponent deactivated
- **WHEN** an opponent's status is set to 'inactive'
- **THEN** the system stops querying Serper for that opponent's search terms
