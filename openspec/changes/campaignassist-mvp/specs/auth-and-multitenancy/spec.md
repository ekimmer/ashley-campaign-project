## ADDED Requirements

### Requirement: Email/password authentication
The system SHALL authenticate users via Supabase Auth with email and password.

#### Scenario: User login
- **WHEN** a user enters valid email and password on the login page
- **THEN** they are authenticated and redirected to the dashboard

#### Scenario: Invalid credentials
- **WHEN** a user enters invalid credentials
- **THEN** an error message is displayed and the user remains on the login page

#### Scenario: Logout
- **WHEN** a user clicks the logout button
- **THEN** their session is terminated and they are redirected to the login page

### Requirement: Protected routes
All dashboard routes SHALL require authentication. Unauthenticated users are redirected to the login page.

#### Scenario: Unauthenticated access attempt
- **WHEN** an unauthenticated user attempts to access any dashboard route
- **THEN** they are redirected to the login page

#### Scenario: Session persistence
- **WHEN** a user refreshes the page while authenticated
- **THEN** their session is preserved and they remain logged in

### Requirement: Campaign-scoped data access
All data queries SHALL be scoped to the user's associated campaign(s) via campaign_id.

#### Scenario: User with one campaign
- **WHEN** a user is associated with one campaign
- **THEN** all data displayed is filtered to that campaign's campaign_id

#### Scenario: Row-Level Security enforcement
- **WHEN** any database query is executed
- **THEN** Supabase RLS policies ensure the user can only access data belonging to campaigns they are associated with via the user_campaigns table

### Requirement: User-campaign association
The system SHALL associate users with campaigns via the user_campaigns junction table.

#### Scenario: User associated with campaign
- **WHEN** a user record exists in user_campaigns for a given campaign_id
- **THEN** that user can access all data for that campaign

#### Scenario: User not associated
- **WHEN** a user has no entry in user_campaigns for a given campaign_id
- **THEN** RLS policies prevent them from accessing any data for that campaign

### Requirement: Initial campaign setup
The system SHALL provide a way to create the initial campaign with seed data for the Tara Durant race.

#### Scenario: Seed data populated
- **WHEN** the system is first deployed
- **THEN** a campaign record exists with candidate_name "Tara Durant", appropriate search terms for each bin, and Ashley's user account associated as owner
