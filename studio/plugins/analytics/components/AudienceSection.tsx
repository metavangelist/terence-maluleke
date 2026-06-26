import { Box, Card, Flex, Grid, Heading, Stack, Text } from "@sanity/ui";
import type { DeviceBreakdown, RankedCity, RankedLocation } from "../types";

type Props = {
  countries: RankedLocation[];
  cities: RankedCity[];
  devices: DeviceBreakdown[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

function RankedList({
  title,
  items,
  renderLabel,
}: {
  title: string;
  items: { name: string; visits: number }[];
  renderLabel?: (item: { name: string; visits: number }) => string;
}) {
  return (
    <Card padding={3} radius={2} tone="transparent" border>
      <Stack space={3}>
        <Text size={1} weight="semibold">
          {title}
        </Text>
        {items.length === 0 ? (
          <Text muted size={1}>
            No data for this period.
          </Text>
        ) : (
          <Stack space={2}>
            {items.map((item) => (
              <Flex key={`${title}-${item.name}`} align="center" justify="space-between" gap={3}>
                <Text size={1}>{renderLabel ? renderLabel(item) : item.name}</Text>
                <Text size={1} muted>
                  {formatNumber(item.visits)}
                </Text>
              </Flex>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function DeviceChart({ devices }: { devices: DeviceBreakdown[] }) {
  const total = devices.reduce((sum, device) => sum + device.visits, 0);

  if (!total) {
    return (
      <Text muted size={1}>
        No device data for this period.
      </Text>
    );
  }

  const colors: Record<string, string> = {
    mobile: "#5b8def",
    desktop: "#7c5cff",
    tablet: "#2bb673",
    unknown: "#9aa0a6",
  };

  const gradient = devices
    .reduce<{ parts: string[]; cursor: number }>(
      (acc, device) => {
        const share = (device.visits / total) * 100;
        const color = colors[device.category] || colors.unknown;
        const next = acc.cursor + share;
        acc.parts.push(`${color} ${acc.cursor}% ${next}%`);
        acc.cursor = next;
        return acc;
      },
      { parts: [], cursor: 0 },
    )
    .parts.join(", ");

  return (
    <Stack space={4}>
      <Box
        style={{
          width: 180,
          height: 180,
          borderRadius: "50%",
          margin: "0 auto",
          background: `conic-gradient(${gradient})`,
        }}
      />
      <Stack space={2}>
        {devices.map((device) => {
          const share = Math.round((device.visits / total) * 100);
          const label = device.category.charAt(0).toUpperCase() + device.category.slice(1);

          return (
            <Flex key={device.category} align="center" justify="space-between" gap={3}>
              <Flex align="center" gap={2}>
                <Box
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: colors[device.category] || colors.unknown,
                  }}
                />
                <Text size={1}>{label}</Text>
              </Flex>
              <Text size={1} muted>
                {formatNumber(device.visits)} ({share}%)
              </Text>
            </Flex>
          );
        })}
      </Stack>
    </Stack>
  );
}

export function AudienceSection({ countries, cities, devices }: Props) {
  return (
    <Card padding={4} radius={3} shadow={1}>
      <Stack space={4}>
        <Heading as="h2" size={2}>
          Audience
        </Heading>

        <Grid columns={[1, 1, 2]} gap={3}>
          <RankedList title="Countries" items={countries} />
          <RankedList
            title="Cities"
            items={cities}
            renderLabel={(item) => {
              const city = item as RankedCity;
              return city.country ? `${city.name}, ${city.country}` : city.name;
            }}
          />
        </Grid>

        <Card padding={3} radius={2} tone="transparent" border>
          <Stack space={3}>
            <Text size={1} weight="semibold">
              Devices
            </Text>
            <DeviceChart devices={devices} />
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}
