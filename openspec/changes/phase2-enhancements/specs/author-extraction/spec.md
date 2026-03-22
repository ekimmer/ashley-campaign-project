## ADDED Requirements

### Requirement: Multi-strategy author extraction
The article scraper SHALL attempt to extract the author/byline from scraped HTML using multiple strategies in priority order: (1) HTML meta tags, (2) JSON-LD structured data, (3) byline CSS classes/attributes, (4) text pattern matching near article start, (5) Serper result metadata. The first successful match SHALL be used. If no strategy succeeds, the author field SHALL remain null.

#### Scenario: Author found in meta tag
- **WHEN** an article's HTML contains `<meta name="author" content="Jane Doe">`
- **THEN** the article's reporter field is set to "Jane Doe"

#### Scenario: Author found in JSON-LD
- **WHEN** an article's HTML contains a JSON-LD block with `@type: "NewsArticle"` and `author: { name: "John Smith" }`
- **THEN** the article's reporter field is set to "John Smith"

#### Scenario: Author found in byline CSS
- **WHEN** an article's HTML contains an element with class "byline", "author", or "writer" containing "By Sarah Johnson"
- **THEN** the article's reporter field is set to "Sarah Johnson"

#### Scenario: Author found via text pattern
- **WHEN** no meta/JSON-LD/CSS strategy matches, but the first 500 characters of the article body contain the pattern "By [Name]" (e.g., "By Mark Thompson")
- **THEN** the article's reporter field is set to "Mark Thompson"

#### Scenario: No author found
- **WHEN** none of the extraction strategies find an author
- **THEN** the article's reporter field remains null

### Requirement: Author extraction runs during scraping
The author extraction SHALL execute as part of the existing `scrapeArticle()` function and return the author alongside the full text and paywall status. The `ScrapedArticle` interface SHALL include an `author: string | null` field.

#### Scenario: Scraper returns author with article
- **WHEN** an article is scraped and the author is found
- **THEN** the `ScrapedArticle` result includes the author value in the `author` field
- **AND** the ingestion pipeline stores the author in the article's `reporter` column
