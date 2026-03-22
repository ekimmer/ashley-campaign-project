## ADDED Requirements

### Requirement: Three-bin article display
The system SHALL display articles sorted into three bins: Candidate, Opponents, and General Race. Each bin is a filterable, sortable table.

#### Scenario: User views candidate bin
- **WHEN** the user selects the Candidate bin tab
- **THEN** a table displays all articles classified as bin 'candidate', sorted by date_published descending

#### Scenario: User views opponents bin
- **WHEN** the user selects the Opponents bin tab
- **THEN** a table displays all articles classified as bin 'opponent', sorted by date_published descending

#### Scenario: User views general race bin
- **WHEN** the user selects the General Race bin tab
- **THEN** a table displays all articles classified as bin 'general_race', sorted by date_published descending

### Requirement: Article table columns
Each bin's table SHALL display the following columns: Headline (hyperlinked to source), Reporter, Outlet, Date Published, Sentiment (color-coded), Reach, Key Themes, and Paywall Status.

#### Scenario: Article row display
- **WHEN** an article appears in a bin table
- **THEN** all columns are populated from the article record, with the headline linking to the original article URL

#### Scenario: Sentiment color coding
- **WHEN** an article's sentiment is displayed
- **THEN** Positive shows green, Neutral shows gray, Negative shows red, Mixed shows yellow

### Requirement: Rolling AI summary per bin
Each bin SHALL display a 200-300 word AI-generated summary above the article table. The summary answers: What is the dominant narrative? Has the tone shifted recently? What are the top 2-3 stories driving coverage?

#### Scenario: Summary displayed above bin
- **WHEN** the user views a bin
- **THEN** the rolling summary is displayed above the article table, including a "Last Updated" timestamp and narrative trend indicator (increasing/stable/declining)

#### Scenario: Summary regeneration
- **WHEN** new articles are added to a bin
- **THEN** the bin summary is regenerated to incorporate the new articles

#### Scenario: Insufficient articles for summary
- **WHEN** a bin has fewer than 3 articles
- **THEN** the system displays a message indicating insufficient data for a summary and lists the articles directly

### Requirement: Article table sorting and filtering
The user SHALL be able to sort the article table by any column and filter by sentiment and date range.

#### Scenario: Sort by date
- **WHEN** the user clicks the Date Published column header
- **THEN** the table sorts by date_published in the toggled direction

#### Scenario: Filter by sentiment
- **WHEN** the user selects a sentiment filter (e.g., "Negative only")
- **THEN** the table shows only articles matching that sentiment

#### Scenario: Filter by date range
- **WHEN** the user sets a date range filter
- **THEN** the table shows only articles published within that range

### Requirement: Article detail view
The user SHALL be able to click on an article to see its full AI summary, detected entities, and full text (if available).

#### Scenario: User clicks article headline
- **WHEN** the user clicks on an article row
- **THEN** a detail panel or modal shows the AI summary, key themes, detected entities, and full text (or "content unavailable" if paywalled)
