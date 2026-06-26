import type { AnalyticsResponse, DateRange } from "./types";

type AnalyticsApiConfig = {
  apiUrl: string;
  apiSecret: string;
};

export async function fetchAnalytics(
  range: DateRange,
  config: AnalyticsApiConfig,
): Promise<AnalyticsResponse> {
  const url = new URL(config.apiUrl);
  url.searchParams.set("range", range);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.apiSecret}`,
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || `Analytics request failed (${response.status})`);
  }

  return payload as AnalyticsResponse;
}
