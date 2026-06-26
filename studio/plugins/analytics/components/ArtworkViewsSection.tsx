import { Card, Flex, Heading, Stack, Text } from "@sanity/ui";
import type { ArtworkView } from "../types";

type Props = {
  artworks: ArtworkView[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

export function ArtworkViewsSection({ artworks }: Props) {
  return (
    <Card padding={4} radius={3} shadow={1}>
      <Stack space={4}>
        <Stack space={2}>
          <Heading as="h2" size={2}>
            Artwork page views
          </Heading>
          <Text muted size={1}>
            Paths under <code>/artworks/</code>, sorted by views.
          </Text>
        </Stack>

        {artworks.length === 0 ? (
          <Text muted size={1}>
            No artwork page views recorded for this period.
          </Text>
        ) : (
          <Stack space={2}>
            <Flex paddingX={2} paddingY={1}>
              <Text size={0} weight="semibold" style={{ flex: 1 }}>
                Artwork
              </Text>
              <Text size={0} weight="semibold" style={{ width: 88, textAlign: "right" }}>
                Views
              </Text>
            </Flex>
            {artworks.map((artwork) => (
              <Card key={artwork.path} padding={3} radius={2} tone="transparent" border>
                <Flex align="center" justify="space-between" gap={3}>
                  <Stack space={2}>
                    <Text size={1} weight="medium">
                      {artwork.name}
                    </Text>
                    <Text muted size={0}>
                      {artwork.path}
                    </Text>
                  </Stack>
                  <Text size={1} weight="semibold" style={{ minWidth: 72, textAlign: "right" }}>
                    {formatNumber(artwork.views)}
                  </Text>
                </Flex>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
