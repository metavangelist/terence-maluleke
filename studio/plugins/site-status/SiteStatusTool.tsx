import { useEffect, useState, useCallback } from "react";
import { useClient } from "sanity";
import { Card, Stack, Text, Flex, Badge, Button, Inline } from "@sanity/ui";
import { SyncIcon } from "@sanity/icons";

interface SectionCount {
  label: string;
  type: string;
  count: number | null;
  hasImages: number | null;
  filter?: string;
  skipImageCheck?: boolean;
}

type SectionConfig = Omit<SectionCount, "count" | "hasImages">;

const SECTIONS: SectionConfig[] = [
  {
    label: "Paintings",
    type: "artwork",
    filter: `!(pairRole == "secondary") && !(lower(coalesce(medium, "")) match "print*")`,
  },
  {
    label: "Prints",
    type: "artwork",
    filter: `!(pairRole == "secondary") && lower(coalesce(medium, "")) match "print*"`,
  },
  { label: "Assamblage", type: "assamblage" },
  { label: "Study", type: "studyImage" },
  { label: "Calendar", type: "exhibition", skipImageCheck: true },
];

export function SiteStatusTool() {
  const client = useClient({ apiVersion: "2024-01-01" });
  const [sections, setSections] = useState<SectionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [draftsCount, setDraftsCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        SECTIONS.map(async (sec) => {
          const baseFilter = `_type == "${sec.type}" && !(_id in path("drafts.**"))`;
          const filter = sec.filter
            ? `${baseFilter} && ${sec.filter}`
            : baseFilter;

          const [total, withImages] = await Promise.all([
            client.fetch<number>(`count(*[${filter}])`),
            sec.skipImageCheck
              ? Promise.resolve(null)
              : client.fetch<number>(`count(*[${filter} && defined(image.asset)])`),
          ]);

          return { ...sec, count: total, hasImages: withImages };
        })
      );

      const drafts = await client.fetch<number>(
        `count(*[_type in ["artwork","assamblage","studyImage"] && _id in path("drafts.**")])`
      );

      setSections(results);
      setDraftsCount(drafts);
      setLastChecked(new Date());
    } catch (err) {
      console.error("[SiteStatus] Failed to fetch counts", err);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card padding={4}>
      <Stack space={4}>
        <Flex align="center" justify="space-between">
          <Text size={3} weight="bold">
            Site Status
          </Text>
          <Button
            icon={SyncIcon}
            text="Refresh"
            mode="ghost"
            tone="primary"
            onClick={refresh}
            disabled={loading}
          />
        </Flex>

        <Text size={1} muted>
          Live content counts for{" "}
          <a
            href="https://maluleke.art"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit" }}
          >
            maluleke.art
          </a>
          .{" "}
          {lastChecked && (
            <>Last checked: {lastChecked.toLocaleTimeString()}</>
          )}
        </Text>

        {draftsCount > 0 && (
          <Card tone="caution" padding={3} radius={2} border>
            <Text size={1}>
              <strong>{draftsCount} unpublished draft{draftsCount !== 1 ? "s" : ""}</strong>{" "}
              — these won&rsquo;t appear on the live site until published.
            </Text>
          </Card>
        )}

        <Stack space={3}>
          {sections.map((sec) => {
            const missingImages =
              !sec.skipImageCheck &&
              sec.count !== null &&
              sec.hasImages !== null
                ? sec.count - sec.hasImages
                : 0;

            return (
              <Card key={sec.label} padding={3} radius={2} border>
                <Flex align="center" justify="space-between">
                  <Text size={2} weight="semibold">
                    {sec.label}
                  </Text>
                  <Inline space={2}>
                    <Badge tone="primary" fontSize={1}>
                      {loading
                        ? "…"
                        : `${sec.count ?? 0} published`}
                    </Badge>
                    {!loading && missingImages > 0 && (
                      <Badge tone="caution" fontSize={1}>
                        {missingImages} missing image{missingImages !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {!loading &&
                      !sec.skipImageCheck &&
                      missingImages === 0 &&
                      sec.count !== null &&
                      sec.count > 0 && (
                        <Badge tone="positive" fontSize={1}>
                          All have images
                        </Badge>
                      )}
                  </Inline>
                </Flex>
              </Card>
            );
          })}
        </Stack>

        <Card tone="transparent" padding={3} radius={2}>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              How it works
            </Text>
            <Text size={1} muted>
              When you publish artwork here, it appears on the live site
              immediately — no deployment needed. If an artwork is missing its
              image, it won&rsquo;t display on the site.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}
