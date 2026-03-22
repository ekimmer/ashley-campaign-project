## ADDED Requirements

### Requirement: Star articles from News Tracker
Each article row in the News Tracker table SHALL display a star button. Clicking the star SHALL toggle the article's starred state. Starred articles SHALL appear in the NewsConnector module. The star state SHALL be persisted in the database via an `article_stars` table.

#### Scenario: User stars an article
- **WHEN** a user clicks the star button on an unstarred article in the News Tracker
- **THEN** the star fills in visually, a record is created in `article_stars`, and the article appears in the NewsConnector module

#### Scenario: User unstars an article
- **WHEN** a user clicks the star button on a starred article
- **THEN** the star empties visually, the `article_stars` record is deleted, and the article is removed from NewsConnector

### Requirement: Global tag pool per campaign
The system SHALL maintain a campaign-wide pool of tags in a `tags` table. Tags SHALL have a name and optional color. Tags are reusable across any starred article. New tags can be created inline during tagging and persist for future use.

#### Scenario: User adds an existing tag to an article
- **WHEN** a user starts typing a tag name on a starred article in NewsConnector
- **THEN** the system shows autocomplete suggestions from the existing tag pool
- **AND** selecting a tag creates an `article_tags` record linking the article to that tag

#### Scenario: User creates a new tag
- **WHEN** a user types a tag name that does not exist in the pool
- **THEN** the system offers a "Create tag: [name]" option
- **AND** selecting it creates a new record in the `tags` table and links it to the article

#### Scenario: User removes a tag from an article
- **WHEN** a user removes a tag from a starred article
- **THEN** the `article_tags` junction record is deleted but the tag remains in the global pool for future use

### Requirement: Chronological notes per starred article
Each starred article in NewsConnector SHALL support multiple chronological free-text notes. Each note SHALL have a timestamp (created_at) and content. Notes SHALL be editable after creation. Notes are stored in an `article_notes` table.

#### Scenario: User adds a note to a starred article
- **WHEN** a user clicks "Add Note" on a starred article and enters text
- **THEN** a new note record is created with the current timestamp and the note appears in the chronological list

#### Scenario: User edits an existing note
- **WHEN** a user clicks the edit button on an existing note and modifies the text
- **THEN** the note content is updated and the `updated_at` timestamp is set

#### Scenario: Notes display in chronological order
- **WHEN** a user views a starred article's notes in NewsConnector
- **THEN** notes are displayed in chronological order (oldest first) with timestamps

### Requirement: NewsConnector page with filtering
The NewsConnector module SHALL have its own page in the dashboard navigation. It SHALL display all starred articles in a table similar to the News Tracker (headline, author, outlet, date, sentiment, themes) plus the article's tags. The page SHALL support filtering by tag.

#### Scenario: User navigates to NewsConnector
- **WHEN** a user clicks "NewsConnector" in the sidebar navigation
- **THEN** a page displays showing all starred articles with their metadata and tags

#### Scenario: User filters by tag
- **WHEN** a user selects a tag from the filter dropdown
- **THEN** only starred articles with that tag are displayed

#### Scenario: User clicks a starred article
- **WHEN** a user clicks on a starred article row in NewsConnector
- **THEN** the article detail expands or opens showing full article info, tags, and the chronological notes list with the ability to add/edit notes

#### Scenario: No starred articles
- **WHEN** no articles have been starred
- **THEN** the page displays an empty state explaining how to star articles from the News Tracker
