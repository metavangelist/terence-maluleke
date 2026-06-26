import { useCallback, useEffect, useState } from "react";
import { Box, Card, Container, Flex, Heading, Spinner, Stack, Text } from "@sanity/ui";
import { fetchAnalytics } from "./api";
import { AudienceSection } from "./components/AudienceSection";
import { ArtworkViewsSection } from "./components/ArtworkViewsSection";
import { DateRangeSelector } from "./components/DateRangeSelector";
import { TrafficSection } from "./components/TrafficSection";
import type { AnalyticsResponse, DateRange } from "./types";

type AnalyticsToolProps = {
  apiUrl: string;
  apiSecret: string;
};

export function AnalyticsTool({ apiUrl, apiSecret }: AnalyticsToolProps) {
  const [range, setRange] = useState<DateRange>("30d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiUrl || !apiSecret) {
      setError("Analytics API is not configured. Add SANITY_STUDIO_ANALYTICS_API_URL and SANITY_STUDIO_ANALYTICS_API_SECRET.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAnalytics(range, { apiUrl, apiSecret });
      setData(response);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [apiSecret, apiUrl, range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box padding={4} sizing="border-box">
      <Container width={4}>
        <Stack space={5}>
          <Stack space={3}>
            <Heading as="h1" size={3}>
              Analytics
            </Heading>
            <Text muted size={1}>
              Live Google Analytics 4 data for terence-maluleke-v2.vercel.app.
            </Text>
            <DateRangeSelector value={range} onChange={setRange} />
          </Stack>

          {loading ? (
            <Card padding={5} radius={3} shadow={1}>
              <Flex align="center" justify="center" gap={3}>
                <Spinner muted />
                <Text muted>Loading analytics…</Text>
              </Flex>
            </Card>
          ) : null}

          {!loading && error ? (
            <Card padding={4} radius={3} shadow={1} tone="critical">
              <Stack space={3}>
                <Text weight="semibold">Could not load analytics</Text>
                <Text size={1}>{error}</Text>
              </Stack>
            </Card>
          ) : null}

          {!loading && data ? (
            <Stack space={4}>
              {data.traffic.totals.pageviews === 0 &&
              data.traffic.totals.visitors === 0 &&
              data.traffic.totals.sessions === 0 ? (
                <Card padding={4} radius={3} shadow={1} tone="caution">
                  <Stack space={3}>
                    <Text weight="semibold">No data yet</Text>
                    <Text size={1}>
                      The CMS connection is working, but GA4 has not received traffic yet.
                      In Site settings, set and publish your GA4 measurement ID (`G-XXXXXXXXXX`),
                      then visit the live site and open artwork detail pages. Data can take a
                      few minutes to appear here.
                    </Text>
                  </Stack>
                </Card>
              ) : null}
              <TrafficSection data={data.traffic} />
              <AudienceSection
                countries={data.audience.countries}
                cities={data.audience.cities}
                devices={data.audience.devices}
              />
              <ArtworkViewsSection artworks={data.artworks} />
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
