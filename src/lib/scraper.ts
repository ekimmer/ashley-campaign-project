export interface ScrapedArticle {
  fullText: string | null;
  author: string | null;
  paywallStatus: "open" | "bypassed" | "unavailable";
}

/**
 * Extracts the author name from raw HTML using multiple strategies:
 * 1. Meta tags (name="author" or property="article:author")
 * 2. JSON-LD structured data (NewsArticle / Article)
 * 3. Byline CSS classes / rel="author"
 * 4. Text pattern matching ("By First Last")
 */
export function extractAuthor(html: string): string | null {
  // Strategy 1: Meta tags
  const metaAuthorMatch =
    html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']author["']/i) ||
    html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']article:author["']/i);

  if (metaAuthorMatch) {
    const author = metaAuthorMatch[1].trim();
    if (author.length > 0 && author.length < 100) {
      return author;
    }
  }

  // Strategy 2: JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (
          item["@type"] === "NewsArticle" ||
          item["@type"] === "Article" ||
          item["@type"] === "ReportageNewsArticle"
        ) {
          const authorField = item.author;
          if (authorField) {
            let authorName: string | null = null;
            if (typeof authorField === "string") {
              authorName = authorField;
            } else if (Array.isArray(authorField) && authorField.length > 0) {
              authorName =
                typeof authorField[0] === "string"
                  ? authorField[0]
                  : authorField[0]?.name || null;
            } else if (typeof authorField === "object" && authorField.name) {
              authorName = authorField.name;
            }
            if (authorName && authorName.trim().length > 0 && authorName.length < 100) {
              return authorName.trim();
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }

  // Strategy 3: Byline CSS classes and rel="author"
  const bylinePatterns = [
    /<[^>]+class=["'][^"']*\bbyline\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<[^>]+class=["'][^"']*\bauthor\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<[^>]+class=["'][^"']*\bwriter\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<[^>]+rel=["']author["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<a[^>]+rel=["']author["'][^>]*>([\s\S]*?)<\/a>/i,
  ];

  for (const pattern of bylinePatterns) {
    const bylineMatch = html.match(pattern);
    if (bylineMatch) {
      // Strip HTML tags from the matched content
      const text = bylineMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[Bb]y\s+/, "");
      if (text.length > 1 && text.length < 100) {
        return text;
      }
    }
  }

  // Strategy 4: Text pattern near start of article
  // Strip HTML tags from first portion to search plain text
  const firstChunk = html
    .substring(0, 5000)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .substring(0, 500);

  const bylineTextMatch = firstChunk.match(
    /[Bb]y\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/
  );
  if (bylineTextMatch) {
    return bylineTextMatch[1].trim();
  }

  return null;
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CampaignAssist/1.0; +https://campaignassist.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { fullText: null, author: null, paywallStatus: "unavailable" };
    }

    const html = await response.text();

    // Extract author before stripping HTML
    const author = extractAuthor(html);

    // Detect paywall indicators
    const paywallIndicators = [
      "subscribe to continue",
      "subscription required",
      "paywall",
      "premium content",
      "sign in to read",
      "create an account to continue",
      "members only",
    ];

    const lowerHtml = html.toLowerCase();
    const isPaywalled = paywallIndicators.some((indicator) =>
      lowerHtml.includes(indicator)
    );

    // Extract article text from HTML
    const text = extractArticleText(html);

    if (!text || text.length < 100) {
      return {
        fullText: null,
        author,
        paywallStatus: isPaywalled ? "unavailable" : "unavailable",
      };
    }

    return {
      fullText: text,
      author,
      paywallStatus: isPaywalled ? "unavailable" : "open",
    };
  } catch {
    return { fullText: null, author: null, paywallStatus: "unavailable" };
  }
}

function extractArticleText(html: string): string | null {
  // Remove script and style tags
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  // Try to find article content by common selectors
  const articleMatch =
    cleaned.match(/<article[\s\S]*?<\/article>/i) ||
    cleaned.match(/<div[^>]*class="[^"]*article[^"]*"[\s\S]*?<\/div>/i) ||
    cleaned.match(
      /<div[^>]*class="[^"]*story-body[^"]*"[\s\S]*?<\/div>/i
    ) ||
    cleaned.match(
      /<div[^>]*class="[^"]*entry-content[^"]*"[\s\S]*?<\/div>/i
    );

  if (articleMatch) {
    cleaned = articleMatch[0];
  }

  // Strip remaining HTML tags and decode entities
  const text = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 50 ? text : null;
}
