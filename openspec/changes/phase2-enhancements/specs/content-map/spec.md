## ADDED Requirements

### Requirement: Social and video ideas generation
The ContentMap module SHALL have a "Social & Video Ideas" tab that displays AI-generated social media post concepts, video/reel ideas, and interview talking points based on the current news cycle. Ideas SHALL be generated on-demand when the user loads or refreshes the tab, using the last 3 days of articles as input. Each idea SHALL include a title, content description, suggested format (post/reel/interview), and reference to the source article(s).

#### Scenario: User loads social ideas tab
- **WHEN** a user navigates to ContentMap and selects the "Social & Video Ideas" tab
- **THEN** the system generates (or displays cached) AI-created content ideas based on recent articles
- **AND** each idea shows a title, description, suggested format, and source article reference

#### Scenario: User refreshes social ideas
- **WHEN** a user clicks "Refresh Ideas" on the social ideas tab
- **THEN** a new AI generation runs using the most recent 3 days of articles and replaces the previous ideas

#### Scenario: Insufficient articles for ideas
- **WHEN** fewer than 2 articles exist in the last 3 days
- **THEN** the system displays a message indicating insufficient recent coverage to generate ideas

### Requirement: Daily newsletter outline via cron
The ContentMap module SHALL have a "Newsletter" tab displaying a daily newsletter outline for campaign supporters. The outline SHALL be generated automatically via a cron job each morning (alongside the existing digest schedule). The outline SHALL be derived from the last 24 hours of articles and structured as a supporter-facing newsletter draft with sections for top stories, campaign updates, and calls to action.

#### Scenario: Newsletter outline generated on schedule
- **WHEN** the daily cron job runs at the configured time (7am EST)
- **THEN** a new newsletter outline is generated from the last 24 hours of articles and stored in the `newsletter_outlines` table

#### Scenario: User views latest newsletter outline
- **WHEN** a user navigates to the ContentMap "Newsletter" tab
- **THEN** the most recent newsletter outline is displayed with its generation timestamp and source article count

#### Scenario: No newsletter outline available
- **WHEN** no newsletter outline has been generated yet (e.g., first day)
- **THEN** the tab displays an empty state indicating the first outline will be available after the next morning cron run

#### Scenario: User views historical outlines
- **WHEN** a user wants to see previous newsletter outlines
- **THEN** the tab provides a date selector or list showing past outlines with their generation dates

### Requirement: AI-generated hit responses
The ContentMap module SHALL have a "Hit Responses" tab that generates AI response drafts to negative comments from the Tara/GOP Hits system. Each hit from the `candidate_hits` table SHALL have a "Generate Response" button. The generated response SHALL provide a suggested rebuttal or messaging strategy and be stored for future reference.

#### Scenario: User generates a response to a hit
- **WHEN** a user clicks "Generate Response" on a hit that does not yet have a response
- **THEN** the AI generates a response draft addressing the negative comment with suggested messaging
- **AND** the response is stored in the `hit_responses` table linked to the hit

#### Scenario: User views existing response
- **WHEN** a hit already has a generated response
- **THEN** the response text is displayed alongside the original hit summary with the option to regenerate

#### Scenario: No hits available for response
- **WHEN** no candidate hits have been detected
- **THEN** the tab displays an empty state explaining that responses will be available once hits are detected in the Tara/GOP Hits system

### Requirement: ContentMap page with three-tab layout
The ContentMap module SHALL have its own page in the dashboard navigation with three tabs: "Social & Video Ideas", "Newsletter", and "Hit Responses". Each tab SHALL display its respective content category.

#### Scenario: User navigates to ContentMap
- **WHEN** a user clicks "ContentMap" in the sidebar navigation
- **THEN** the ContentMap page loads with three tab options and the first tab (Social & Video Ideas) selected by default

#### Scenario: User switches between tabs
- **WHEN** a user clicks a different ContentMap tab
- **THEN** the content area updates to show that tab's content
