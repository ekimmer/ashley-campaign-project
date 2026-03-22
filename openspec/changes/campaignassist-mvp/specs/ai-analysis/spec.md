## ADDED Requirements

### Requirement: Single structured AI call per article
The system SHALL process each newly ingested article with a single Claude Sonnet API call that returns a structured JSON response containing all classification fields.

#### Scenario: Article with full text available
- **WHEN** a new article is ingested with full text
- **THEN** Claude Sonnet is called with the headline, full text, and campaign context, returning: bin, sentiment, reach, key_themes, ai_summary, va_politics_relevant, va_politics_topics, alert_tier, alert_reason, and detected entities

#### Scenario: Article without full text
- **WHEN** a new article is ingested with only headline and metadata (paywall or scrape failure)
- **THEN** Claude Sonnet is called with available metadata only, and classifications are marked as lower confidence

### Requirement: Bin classification
The system SHALL classify each article into exactly one bin: 'candidate', 'opponent', or 'general_race'.

#### Scenario: Article primarily about the candidate
- **WHEN** the article's primary subject is the campaign's candidate (Tara Durant)
- **THEN** the article is classified as bin 'candidate'

#### Scenario: Article primarily about an opponent
- **WHEN** the article's primary subject is a tracked opponent
- **THEN** the article is classified as bin 'opponent'

#### Scenario: Article about the race generally
- **WHEN** the article covers the race, polling, or district politics without centering on a specific candidate
- **THEN** the article is classified as bin 'general_race'

### Requirement: Sentiment classification
The system SHALL tag each article with a sentiment value: 'positive', 'neutral', 'negative', or 'mixed'.

#### Scenario: Article with clear sentiment
- **WHEN** an article has a clearly positive, negative, or neutral tone toward the subject
- **THEN** the system tags it with the corresponding sentiment value

#### Scenario: Article with mixed sentiment
- **WHEN** an article contains both positive and negative elements
- **THEN** the system tags it as 'mixed'

### Requirement: Key theme extraction
The system SHALL extract up to 3 topic tags from each article.

#### Scenario: Article with identifiable themes
- **WHEN** an article covers specific topics (e.g., education, polling, endorsements)
- **THEN** the system extracts up to 3 key theme tags

### Requirement: Reach estimation
The system SHALL estimate each article's reach as 'national', 'regional', 'local', or 'niche' based on the outlet.

#### Scenario: Known national outlet
- **WHEN** an article is from a nationally recognized outlet (e.g., Washington Post, CNN)
- **THEN** the reach is classified as 'national'

#### Scenario: Local outlet
- **WHEN** an article is from a local Virginia news source
- **THEN** the reach is classified as 'local'

### Requirement: Entity detection in articles
The system SHALL identify people mentioned in each article and classify them as opponents, supporters, or neutral entities.

#### Scenario: Opponent mentioned in article
- **WHEN** Claude detects a person who appears to be a political opponent or challenger
- **THEN** a record is created in `detected_entities` with role 'opponent', the person's name, context excerpt, and confidence score

#### Scenario: Supporter mentioned in article
- **WHEN** Claude detects a person who appears to be endorsing or supporting the candidate
- **THEN** a record is created in `detected_entities` with role 'supporter'

### Requirement: VA politics relevance scoring
The system SHALL flag articles relevant to the broader Virginia political landscape and tag them with political topics.

#### Scenario: Article relevant to VA politics
- **WHEN** an article discusses statewide political dynamics, party politics, or issues driving Virginia discourse
- **THEN** `va_politics_relevant` is set to true and `va_politics_topics` contains relevant topic tags

#### Scenario: Article not relevant to VA politics
- **WHEN** an article is narrowly about a specific candidate event without broader political implications
- **THEN** `va_politics_relevant` is set to false

### Requirement: Alert tier assignment
The system SHALL assign an alert tier to each article: 'critical', 'high', 'standard', or 'none'.

#### Scenario: Negative national coverage of candidate
- **WHEN** an article is negative sentiment, national reach, and about the candidate
- **THEN** alert_tier is set to 'critical' with an alert_reason explaining why

#### Scenario: New poll results
- **WHEN** an article contains polling data for the race
- **THEN** alert_tier is set to 'high'

#### Scenario: Routine local coverage
- **WHEN** an article is neutral or positive local coverage
- **THEN** alert_tier is set to 'standard' or 'none'

### Requirement: AI classification retry on failure
The system SHALL retry AI classification if the Claude API call fails, and store the article with a pending classification status if retries are exhausted.

#### Scenario: Claude API temporarily unavailable
- **WHEN** the Claude API call fails
- **THEN** the system retries up to 3 times with exponential backoff

#### Scenario: All retries exhausted
- **WHEN** all retry attempts fail
- **THEN** the article is stored with classification fields set to null and a flag indicating pending classification
