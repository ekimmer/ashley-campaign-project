## ADDED Requirements

### Requirement: Bin navigation uses dashboard cards
The News Tracker page SHALL display three large clickable cards across the top of the page — one for Candidate, one for Opponents, one for General Race. Each card SHALL show the bin name, current article count, and narrative trend indicator (increasing/stable/declining with directional arrow). Clicking a card SHALL set it as the active bin and populate the content area below with that bin's AI summary and article table.

#### Scenario: Page loads with default bin selected
- **WHEN** a user navigates to the News Tracker page
- **THEN** all three bin cards are visible in a horizontal row at the top, the Candidate card is selected by default, and the Candidate bin summary and article table are displayed below

#### Scenario: User switches bin by clicking a card
- **WHEN** a user clicks the "Opponents" card
- **THEN** the Opponents card receives a selected visual state (prominent border/shadow), the other cards become unselected, and the content below updates to show the Opponents bin summary and article table

#### Scenario: Cards display at-a-glance stats
- **WHEN** the News Tracker page loads
- **THEN** each card displays the total article count for that bin and the current narrative trend (e.g., "▲ Increasing", "— Stable", "▼ Declining") sourced from the latest bin_summaries record

### Requirement: Cards are responsive on mobile
The bin cards SHALL stack vertically on screens narrower than 768px while maintaining all functionality and information display.

#### Scenario: Mobile viewport
- **WHEN** the viewport width is below 768px
- **THEN** the three bin cards stack vertically in a single column and remain fully interactive
