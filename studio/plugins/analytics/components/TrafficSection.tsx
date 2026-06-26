import { Box, Card, Flex, Grid, Heading, Stack, Text } from "@sanity/ui";
import type { TrafficData } from "../types";

type Props = {
  data: TrafficData;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

function LineChart({ data }: { data: TrafficData["series"] }) {
  if (!data.length) {
    return (
      <Box padding={4}>
        <Text muted size={1}>
          No traffic data for this period.
        </Text>
      </Box>
    );
  }

  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 32, left: 16 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((point) => point.pageviews), 1);

  const points = data.map((point, index) => {
    const x =
      padding.left + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
    const y = padding.top + innerHeight - (point.pageviews / maxValue) * innerHeight;
    return `${x},${y}`;
  });

  const labelIndexes = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  return (
    <Box overflow="auto">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Pageviews over time">
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={width - padding.right}
          y2={padding.top + innerHeight}
          stroke="var(--card-border-color)"
        />
        <polyline
          fill="none"
          stroke="var(--card-focus-ring-color)"
          strokeWidth="2.5"
          points={points.join(" ")}
        />
        {data.map((point, index) => {
          const x =
            padding.left +
            (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
          const y = padding.top + innerHeight - (point.pageviews / maxValue) * innerHeight;

          return (
            <circle
              key={point.date}
              cx={x}
              cy={y}
              r="3.5"
              fill="var(--card-focus-ring-color)"
            />
          );
        })}
        {labelIndexes.map((index) => {
          const point = data[index];
          const x =
            padding.left +
            (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);

          return (
            <text
              key={point.date}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--card-muted-fg-color)"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
    </Box>
  );
}

export function TrafficSection({ data }: Props) {
  return (
    <Card padding={4} radius={3} shadow={1}>
      <Stack space={4}>
        <Heading as="h2" size={2}>
          Traffic
        </Heading>

        <Grid columns={[1, 1, 3]} gap={3}>
          <Card padding={3} radius={2} tone="transparent" border>
            <Stack space={2}>
              <Text size={1} muted>
                Pageviews
              </Text>
              <Text size={4} weight="semibold">
                {formatNumber(data.totals.pageviews)}
              </Text>
            </Stack>
          </Card>
          <Card padding={3} radius={2} tone="transparent" border>
            <Stack space={2}>
              <Text size={1} muted>
                Unique visitors
              </Text>
              <Text size={4} weight="semibold">
                {formatNumber(data.totals.visitors)}
              </Text>
            </Stack>
          </Card>
          <Card padding={3} radius={2} tone="transparent" border>
            <Stack space={2}>
              <Text size={1} muted>
                Sessions
              </Text>
              <Text size={4} weight="semibold">
                {formatNumber(data.totals.sessions)}
              </Text>
            </Stack>
          </Card>
        </Grid>

        <Stack space={2}>
          <Flex align="center" justify="space-between">
            <Text size={1} weight="medium">
              Pageviews over time
            </Text>
            <Text size={0} muted>
              Line chart
            </Text>
          </Flex>
          <LineChart data={data.series} />
        </Stack>
      </Stack>
    </Card>
  );
}
