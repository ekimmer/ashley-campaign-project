export interface ScrapedArticle {
  fullText: string | null;
  paywallStatus: "open" | "bypassed" | "unavailable";
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
      return { fullText: null, paywallStatus: "unavailable" };
    }

    const html = await response.text();

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
        paywallStatus: isPaywalled ? "unavailable" : "unavailable",
      };
    }

    return {
      fullText: text,
      paywallStatus: isPaywalled ? "unavailable" : "open",
    };
  } catch {
    return { fullText: null, paywallStatus: "unavailable" };
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
