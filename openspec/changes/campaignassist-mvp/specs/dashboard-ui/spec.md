## ADDED Requirements

### Requirement: Dashboard layout with sidebar navigation
The dashboard SHALL have a sidebar navigation with links to: News Tracker, VA Politics, Alerts, and Settings. The layout is responsive with a collapsible sidebar on smaller screens.

#### Scenario: Navigation between sections
- **WHEN** the user clicks a navigation item in the sidebar
- **THEN** the main content area updates to show the corresponding section

#### Scenario: Active navigation indicator
- **WHEN** the user is viewing a section
- **THEN** the corresponding navigation item is visually highlighted

### Requirement: Pink color palette
The dashboard SHALL use a professional pink color palette as the primary brand color throughout the UI, including the sidebar, buttons, and accent elements.

#### Scenario: Brand colors applied
- **WHEN** the dashboard renders
- **THEN** the primary color scheme uses pink tones for the sidebar, active states, buttons, and accent elements while maintaining readability and contrast

### Requirement: Alert banner for critical items
The dashboard SHALL display a prominent banner at the top of the main content area when there are unacknowledged critical alerts.

#### Scenario: Critical alert banner shown
- **WHEN** there are unacknowledged critical-tier alerts
- **THEN** a red/pink alert banner appears at the top of the page with the most recent critical alert's title and a link to view it

#### Scenario: No critical alerts
- **WHEN** all critical alerts are acknowledged or none exist
- **THEN** no alert banner is displayed

### Requirement: Header with campaign context
The dashboard header SHALL display the CampaignAssist logo/name, the current campaign name, and user controls (settings, logout).

#### Scenario: Header display
- **WHEN** the dashboard loads
- **THEN** the header shows "CampaignAssist", the campaign name (e.g., "Tara Durant for VA"), and a user menu with settings and logout options

### Requirement: Manual scan trigger
The dashboard SHALL provide a "Scan Now" button that triggers an immediate article ingestion cycle.

#### Scenario: User triggers manual scan
- **WHEN** the user clicks the "Scan Now" button
- **THEN** the ingestion pipeline runs immediately and the button shows a loading state until complete

#### Scenario: Scan complete
- **WHEN** the manual scan finishes
- **THEN** any new articles appear in the appropriate bins and the user sees a brief notification of how many new articles were found

### Requirement: Settings page
The system SHALL provide a settings page where the user can manage campaign configuration.

#### Scenario: View settings
- **WHEN** the user navigates to Settings
- **THEN** they can view and edit: campaign name, candidate name, search terms per bin, alert email address, and digest time

#### Scenario: Save settings
- **WHEN** the user modifies settings and clicks Save
- **THEN** the campaign configuration is updated in the database and takes effect on the next polling cycle

### Requirement: Loading and empty states
All data views SHALL show appropriate loading spinners during data fetch and helpful empty states when no data exists.

#### Scenario: Loading state
- **WHEN** data is being fetched
- **THEN** a loading spinner or skeleton is displayed

#### Scenario: Empty state
- **WHEN** a section has no data (e.g., no articles yet)
- **THEN** a friendly message explains what will appear here and how (e.g., "No articles yet. Articles will appear here once the first scan completes.")
