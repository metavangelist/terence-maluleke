import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { AddIcon, ImageIcon } from "@sanity/icons";
import { useClient } from "sanity";
import { useRouter } from "sanity/router";
import { usePaneRouter } from "sanity/structure";
import styled from "styled-components";
import { canonicalDocumentId } from "../../lib/delete-document";
import { gridPreviewUrl, STUDIO_SITE_URL } from "../../lib/grid-image-url";
import { legacyPreviewUrlCandidates } from "../../lib/legacy-asset-candidates";
import { DocumentRowActions } from "./DocumentRowActions";

const STUDY_QUERY = `*[_type == "studyImage" && !(_id in path("drafts.**"))] | order(orderRank asc, title asc) {
  _id,
  title,
  legacyFilename,
  image
}`;

const STUDY_LISTEN = `*[_type == "studyImage"]`;

type StudyDoc = {
  _id: string;
  title?: string;
  legacyFilename?: string | null;
  image?: { asset?: { _ref?: string } } | null;
  imageUrl?: string | null;
};

const StudyCard = styled(Card)<{ $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 220px;
  border: 1px solid
    ${({ $selected }) => ($selected ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.08)")};
  background: rgba(28, 28, 28, 0.92);
  overflow: hidden;
`;

const StudyThumb = styled.img`
  display: block;
  width: 100%;
  height: 140px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.04);
`;

const StudyActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 10px 10px;
  margin-top: auto;
`;

function enrichStudyDocs(client: ReturnType<typeof useClient>, docs: StudyDoc[]): StudyDoc[] {
  return docs.map((doc) => {
    const urls: string[] = [];
    const push = (url: string | null | undefined) => {
      if (url && !urls.includes(url)) urls.push(url);
    };
    push(gridPreviewUrl(client, doc.image));
    for (const url of legacyPreviewUrlCandidates("studyImage", doc.legacyFilename, STUDIO_SITE_URL)) {
      push(url);
    }
    return { ...doc, imageUrl: urls[0] || null };
  });
}

export function StudyListView() {
  const client = useClient({ apiVersion: "2025-06-27" });
  const router = useRouter();
  const paneRouter = usePaneRouter();
  const [docs, setDocs] = useState<StudyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await client.fetch<StudyDoc[]>(STUDY_QUERY);
      setDocs(enrichStudyDocs(client, Array.isArray(result) ? result : []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load study images");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    setLoading(true);
    load();
    const subscription = client
      .listen(STUDY_LISTEN, {}, { includeResult: false })
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
          [{ id: publishedId, params: { type: "studyImage" } }],
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
      <Container width={4}>
        <Stack space={4}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Flex align="center" gap={2}>
              <ImageIcon />
              <Heading size={2}>Study</Heading>
            </Flex>
            <Button
              icon={AddIcon}
              mode="ghost"
              text="Add study image"
              onClick={() => {
                router.navigateIntent("create", { type: "studyImage", mode: "structure" });
              }}
            />
          </Flex>

          <Text size={1} muted>
            Hover the pencil icon to edit, or the trash icon to remove from the website. Drag
            order is managed in each image&apos;s display order field.
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
                No study images yet. Use Add study image to create one.
              </Text>
            </Card>
          ) : (
            <Grid columns={[2, 3, 4]} gap={3}>
              {docs.map((doc) => {
                const id = canonicalDocumentId(doc._id);
                const title = doc.title || doc.legacyFilename || "Study image";
                return (
                  <StudyCard
                    key={id}
                    padding={0}
                    radius={3}
                    tone="transparent"
                    $selected={selectedId === id}
                  >
                    {doc.imageUrl ? (
                      <StudyThumb src={doc.imageUrl} alt="" />
                    ) : (
                      <Flex align="center" justify="center" style={{ height: 140 }}>
                        <Text size={1} muted>
                          No image
                        </Text>
                      </Flex>
                    )}
                    <Box padding={2} style={{ minHeight: 40 }}>
                      <Text size={1} textOverflow="ellipsis">
                        {title}
                      </Text>
                    </Box>
                    <StudyActions>
                      <DocumentRowActions
                        docId={doc._id}
                        documentType="studyImage"
                        isSelected={selectedId === id}
                        onOpen={openDocument}
                        onDeleted={handleRemoved}
                        onError={setError}
                      />
                    </StudyActions>
                  </StudyCard>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
