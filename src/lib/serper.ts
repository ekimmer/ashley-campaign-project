const SERPER_API_URL = "https://google.serper.dev/news";

export interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  imageUrl?: string;
}

export interface SerperNewsResponse {
  news: SerperNewsResult[];
  searchParameters: {
    q: string;
    type: string;
  };
}

export async function searchNews(
  query: string,
  num: number = 10
): Promise<SerperNewsResult[]> {
  const response = await fetch(SERPER_API_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num,
      type: "news",
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data: SerperNewsResponse = await response.json();
  return data.news || [];
}
