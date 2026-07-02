import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { AddIcon, CalendarIcon } from "@sanity/icons";
import { useClient } from "sanity";
import { useRouter } from "sanity/router";
import { usePaneRouter } from "sanity/structure";
import styled from "styled-components";
import { canonicalDocumentId, dedupeDocumentVersions } from "../../lib/delete-document";
import { DocumentRowActions } from "./DocumentRowActions";

const EVENTS_QUERY = `*[_type == "exhibition"] | order(eventDate asc) {
  _id,
  name,
  eventDate,
  endDate,
  venue
}`;

const EVENTS_LISTEN = `*[_type == "exhibition"]`;

type ExhibitionDoc = {
  _id: string;
  name?: string;
  eventDate?: string;
  endDate?: string;
  venue?: string;
};

const EventRow = styled.div<{ $selected?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 1fr) 72px;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ $selected }) => ($selected ? "rgba(255,255,255,0.08)" : "transparent")};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const EventActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

function formatEventDate(startDate?: string, endDate?: string) {
  if (!startDate) return "—";
  const start = new Date(`${startDate}T12:00:00`);
  if (!endDate) {
    return start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  const end = new Date(`${endDate}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  } else if (sameYear) {
    return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

export function CalendarListView() {
  const client = useClient({ apiVersion: "2025-06-27" });
  const router = useRouter();
  const paneRouter = usePaneRouter();
  const [docs, setDocs] = useState<ExhibitionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const load = useCallback(async () => {
    try {
      const previewClient = client.withConfig({ perspective: "previewDrafts" });
      const result = await previewClient.fetch<ExhibitionDoc[]>(EVENTS_QUERY);
      setDocs(dedupeDocumentVersions(Array.isArray(result) ? result : []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    setLoading(true);
    load();
    const subscription = client
      .listen(EVENTS_LISTEN, {}, { includeResult: false })
      .subscribe(() => {
        load();
      });
    return () => subscription.unsubscribe();
  }, [client, load]);

  const openDocument = useCallback(
    (publishedId: string) => {
      setSelectedId(publishedId);
      router.navigate({
        panes: [
          ...paneRouter.routerPanesState.slice(0, paneRouter.groupIndex + 1),
          [{ id: publishedId, params: { type: "exhibition" } }],
        ],
      });
    },
    [router, paneRouter]
  );

  const handleRemoved = useCallback(
    (publishedId: string) => {
      if (selectedId === publishedId) {
        setSelectedId("");
        router.navigate({
          panes: paneRouter.routerPanesState.slice(0, paneRouter.groupIndex + 1),
        });
      }
      void load();
    },
    [selectedId, router, paneRouter, load]
  );

  return (
    <Box padding={4}>
      <Container width={3}>
        <Stack space={4}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Flex align="center" gap={2}>
              <CalendarIcon />
              <Heading size={2}>Calendar</Heading>
            </Flex>
            <Button
              icon={AddIcon}
              mode="ghost"
              text="Add event"
              onClick={() => {
                router.navigateIntent("create", { type: "exhibition", mode: "structure" });
              }}
            />
          </Flex>

          <Text size={1} muted>
            Hover the pencil icon to edit an event, or the trash icon to remove it from the
            website calendar.
          </Text>

          {error ? (
            <Card tone="critical" padding={3} radius={2}>
              <Text size={1}>{error}</Text>
            </Card>
          ) : null}

          {loading && docs.length === 0 ? (
            <Flex align="center" justify="center" padding={5}>
              <Spinner />
            </Flex>
          ) : docs.length === 0 ? (
            <Card padding={4} radius={2} tone="transparent" border>
              <Text size={1} muted>
                No calendar events yet. Use Add event to create one.
              </Text>
            </Card>
          ) : (
            <Card padding={3} radius={3} tone="transparent" border style={{ background: "#151515" }}>
              <Stack space={1}>
                <EventRow>
                  <Text size={1} weight="semibold" muted>
                    Event
                  </Text>
                  <Text size={1} weight="semibold" muted>
                    Date
                  </Text>
                  <Text size={1} weight="semibold" muted>
                    Venue
                  </Text>
                  <span />
                </EventRow>
                {docs.map((doc) => {
                  const id = canonicalDocumentId(doc._id);
                  return (
                    <EventRow key={id} $selected={selectedId === id}>
                      <Text size={1} textOverflow="ellipsis">
                        {doc.name || "Untitled event"}
                      </Text>
                      <Text size={1} muted>
                        {formatEventDate(doc.eventDate, doc.endDate)}
                      </Text>
                      <Text size={1} textOverflow="ellipsis" muted>
                        {doc.venue || "—"}
                      </Text>
                      <EventActions>
                        <DocumentRowActions
                          docId={doc._id}
                          documentType="exhibition"
                          isSelected={selectedId === id}
                          onOpen={openDocument}
                          onDeleted={handleRemoved}
                          onError={setError}
                        />
                      </EventActions>
                    </EventRow>
                  );
                })}
              </Stack>
            </Card>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
