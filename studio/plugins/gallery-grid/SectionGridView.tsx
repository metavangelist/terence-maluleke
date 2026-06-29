import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Spinner,
  Stack,
  Tab,
  Text,
  TextInput,
} from "@sanity/ui";
import { AddIcon, DragHandleIcon, EditIcon, ImagesIcon, TrashIcon } from "@sanity/icons";
import { useClient } from "sanity";
import { useRouter } from "sanity/router";
import { ConfirmDeleteDialog, usePaneRouter } from "sanity/structure";
import styled from "styled-components";
import {
  buildGridEntriesFromDocs,
  canonicalArtworkId,
  dedupeArtworkDocs,
  enrichGridDocs,
  flatEntryOrder,
  listOpenGridSlots,
  packDocsToPages,
  type ArtworkGridDoc,
  type GridEntry,
} from "../../lib/gallery-grid-entries";
import { commitEntryReorder, commitMoveToPosition } from "../../lib/reorder-artworks";
import { deleteArtworkVersions } from "../../lib/delete-artwork";
import type { SectionGridConfig } from "./section-grid-config";

const GridPage = styled.div<{ $cols: number; $rows: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, minmax(0, 1fr));
  grid-template-rows: repeat(${({ $rows }) => $rows}, minmax(300px, auto));
  gap: 16px;
  width: 100%;
  max-width: ${({ $cols }) => ($cols === 2 ? "760px" : "980px")};
  margin: 0 auto;
  align-items: stretch;
`;

const EmptySlot = styled.div<{ $col: number; $row: number }>`
  grid-column: ${({ $col }) => $col};
  grid-row: ${({ $row }) => $row};
  min-height: 280px;
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.02);
`;

const GridCell = styled.div<{
  $col: number;
  $row: number;
  $rowSpan?: number;
  $isDiptych?: boolean;
  $dragging?: boolean;
  $over?: boolean;
  $selected?: boolean;
}>`
  grid-column: ${({ $col }) => $col};
  grid-row: ${({ $row, $rowSpan }) =>
    $rowSpan && $rowSpan > 1 ? `${$row} / span ${$rowSpan}` : $row};
  display: flex;
  flex-direction: column;
  min-height: ${({ $rowSpan }) => ($rowSpan && $rowSpan > 1 ? "620px" : "300px")};
  padding: ${({ $isDiptych }) => ($isDiptych ? "12px 12px 18px" : "14px 14px 20px")};
  border-radius: 20px;
  background: rgba(28, 28, 28, 0.92);
  border: 1px solid
    ${({ $selected, $over }) =>
      $selected ? "rgba(255,255,255,0.72)" : $over ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.08)"};
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  cursor: default;
  opacity: ${({ $dragging }) => ($dragging ? 0.45 : 1)};
  transition: border-color 0.15s ease, opacity 0.15s ease;
  user-select: none;
  box-sizing: border-box;
`;

const OrderBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  pointer-events: none;
`;

const CellActions = styled.div`
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  margin-top: auto;
  padding-top: 8px;
`;

const ListActionBar = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const OrderListRow = styled.div<{ $selected?: boolean }>`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 88px 72px;
  gap: 12px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${({ $selected }) => ($selected ? "rgba(255,255,255,0.08)" : "transparent")};
  cursor: default;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const OrderThumb = styled.img`
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
`;

const DragHandle = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.45);
  background: rgba(0, 0, 0, 0.35);
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`;

const CellFrame = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
`;

const ArtworkStage = styled.div<{ $diptych?: boolean }>`
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  max-height: ${({ $diptych }) => ($diptych ? "420px" : "210px")};
  padding: 4px 0;
  overflow: hidden;
`;

const CellImage = styled.img<{ $diptych?: boolean; $loaded?: boolean }>`
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: ${({ $diptych }) => ($diptych ? "200px" : "100%")};
  object-fit: contain;
  object-position: center;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  opacity: ${({ $loaded }) => ($loaded === false ? 0 : 1)};
  transition: opacity 0.2s ease;
`;

const CellTitle = styled.div`
  flex: 0 0 auto;
  margin-top: 8px;
  padding: 0 2px;
  min-height: 1.35em;
  text-align: center;
  font-size: 11px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.58);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DiptychStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 100%;
`;

type PlacedEntry = {
  entry: GridEntry;
  placement: { col: number; row: number; rowSpan?: number; colSpan?: number };
};

function entryId(entry: GridEntry) {
  return entry.id || "";
}

function GridPreviewImage({
  urls,
  alt,
  diptych,
}: {
  urls: string[];
  alt: string;
  diptych?: boolean;
}) {
  const candidates = urls.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = candidates[index] || "";

  if (!candidates.length) {
    return <Text size={1}>No image</Text>;
  }

  if (index >= candidates.length) {
    return <Text size={1}>Image failed to load</Text>;
  }

  return (
    <CellImage
      key={src}
      $diptych={diptych}
      $loaded={loaded}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        setIndex((current) => current + 1);
      }}
    />
  );
}

function CellContent({ entry }: { entry: GridEntry }) {
  if (entry.kind === "diptych") {
    const topUrls = entry.item.previewUrls?.length
      ? entry.item.previewUrls
      : entry.item.imageUrl
        ? [entry.item.imageUrl]
        : [];
    const bottomUrls = entry.bottomItem?.previewUrls?.length
      ? entry.bottomItem.previewUrls
      : entry.bottomItem?.imageUrl || entry.item.secondImageUrl
        ? [entry.bottomItem?.imageUrl || entry.item.secondImageUrl || ""]
        : [];
    return (
      <ArtworkStage $diptych>
        <DiptychStack>
          {topUrls.length ? (
            <GridPreviewImage urls={topUrls} alt={entry.item.title || "Top panel"} diptych />
          ) : null}
          {bottomUrls.length ? (
            <GridPreviewImage
              urls={bottomUrls}
              alt={entry.item.title || "Bottom panel"}
              diptych
            />
          ) : null}
        </DiptychStack>
      </ArtworkStage>
    );
  }

  const urls = entry.item.previewUrls?.length
    ? entry.item.previewUrls
    : entry.item.imageUrl
      ? [entry.item.imageUrl]
      : [];

  return (
    <ArtworkStage>
      {urls.length ? (
        <GridPreviewImage urls={urls} alt={entry.item.title || "Artwork"} />
      ) : (
        <Text size={1}>No image</Text>
      )}
    </ArtworkStage>
  );
}

function dedupePlacedPage(page: PlacedEntry[]) {
  const seen = new Set<string>();
  return page.filter((placed) => {
    const id = entryId(placed.entry);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function OrderPositionInput({
  value,
  max,
  disabled,
  onCommit,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onCommit: (position: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(1, Math.min(max, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <TextInput
      value={draft}
      disabled={disabled}
      inputMode="numeric"
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    />
  );
}

function DetailsButton({
  docId,
  isSelected,
  compact,
  onOpen,
}: {
  docId: string;
  isSelected?: boolean;
  compact?: boolean;
  onOpen: (publishedId: string) => void;
}) {
  const publishedId = canonicalArtworkId(docId);

  return (
    <Button
      fontSize={1}
      padding={2}
      mode={isSelected ? "default" : "ghost"}
      tone="primary"
      icon={EditIcon}
      text={compact ? undefined : "Details"}
      title="View and edit details"
      aria-label="View and edit details"
      style={compact ? { justifyContent: "center", minWidth: 0 } : undefined}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen(publishedId);
      }}
      onMouseDown={(event) => event.stopPropagation()}
    />
  );
}

function RemoveArtworkButton({
  docId,
  documentType,
  compact,
  disabled,
  onDeleted,
  onError,
}: {
  docId: string;
  documentType: "artwork" | "assamblage";
  compact?: boolean;
  disabled?: boolean;
  onDeleted: (publishedId: string) => void;
  onError?: (message: string) => void;
}) {
  const client = useClient({ apiVersion: "2025-06-27" });
  const publishedId = canonicalArtworkId(docId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async (versions: string[]) => {
    setDeleting(true);
    try {
      await deleteArtworkVersions(client, publishedId, versions);
      setConfirmOpen(false);
      onDeleted(publishedId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove artwork";
      onError?.(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        fontSize={1}
        padding={2}
        mode="ghost"
        tone="critical"
        icon={TrashIcon}
        text={compact ? undefined : "Remove"}
        title="Remove from website"
        aria-label="Remove from website"
        disabled={disabled || deleting}
        style={compact ? { justifyContent: "center", minWidth: 0 } : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setConfirmOpen(true);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      />
      {confirmOpen ? (
        <ConfirmDeleteDialog
          action="delete"
          id={publishedId}
          type={documentType}
          onCancel={() => {
            if (!deleting) setConfirmOpen(false);
          }}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
}

function ArtworkActions({
  docId,
  documentType,
  isSelected,
  compact,
  disabled,
  onOpen,
  onDeleted,
  onError,
}: {
  docId: string;
  documentType: "artwork" | "assamblage";
  isSelected?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onOpen: (publishedId: string) => void;
  onDeleted: (publishedId: string) => void;
  onError?: (message: string) => void;
}) {
  const actions = (
    <>
      <DetailsButton
        docId={docId}
        isSelected={isSelected}
        compact={compact}
        onOpen={onOpen}
      />
      <RemoveArtworkButton
        docId={docId}
        documentType={documentType}
        compact={compact}
        disabled={disabled}
        onDeleted={onDeleted}
        onError={onError}
      />
    </>
  );

  if (compact) {
    return <>{actions}</>;
  }

  return <ListActionBar>{actions}</ListActionBar>;
}

function OrderListPanel({
  entries,
  selectedId,
  saving,
  documentType,
  onOpenDetails,
  onArtworkRemoved,
  onArtworkError,
  onMove,
}: {
  entries: GridEntry[];
  selectedId: string;
  saving: boolean;
  documentType: "artwork" | "assamblage";
  onOpenDetails: (publishedId: string) => void;
  onArtworkRemoved: (publishedId: string) => void;
  onArtworkError: (message: string) => void;
  onMove: (entryId: string, position: number) => void;
}) {
  return (
    <Card padding={3} radius={3} tone="transparent" border style={{ background: "#151515" }}>
      <Stack space={3}>
        <Text size={1} weight="semibold">
          Order list
        </Text>
        <Text size={1} muted>
          Artworks are numbered 1–{entries.length} in display order. Change a number to move without
          dragging.
        </Text>
        <Stack space={1}>
          {entries.map((entry, index) => {
            const id = entry.id || "";
            const title = entry.item.title || "Untitled";
            const thumb = entry.item.imageUrl || "";
            const position = index + 1;
            return (
              <OrderListRow
                key={id}
                $selected={selectedId === id}
              >
                <Text size={1} weight="semibold" muted>
                  {position}
                </Text>
                <Flex align="center" gap={2} style={{ minWidth: 0 }}>
                  {thumb ? <OrderThumb src={thumb} alt="" /> : null}
                  <Text size={1} textOverflow="ellipsis">
                    {title}
                  </Text>
                </Flex>
                <OrderPositionInput
                  value={position}
                  max={entries.length}
                  disabled={saving}
                  onCommit={(nextPosition) => onMove(id, nextPosition)}
                />
                <ArtworkActions
                  docId={entry.item._id}
                  documentType={documentType}
                  isSelected={selectedId === id}
                  compact
                  disabled={saving}
                  onOpen={onOpenDetails}
                  onDeleted={onArtworkRemoved}
                  onError={onArtworkError}
                />
              </OrderListRow>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}

export function SectionGridView({ config }: { config: SectionGridConfig }) {
  const client = useClient({ apiVersion: "2025-06-27" });
  const router = useRouter();
  const paneRouter = usePaneRouter();
  const dragIdRef = useRef("");
  const panelId = `${config.id}-grid-panel`;
  const [docs, setDocs] = useState<ArtworkGridDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [dragId, setDragId] = useState("");
  const [overId, setOverId] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const openDocumentDetails = useCallback(
    (publishedId: string) => {
      setSelectedId(publishedId);
      router.navigate({
        panes: [
          ...paneRouter.routerPanesState.slice(0, paneRouter.groupIndex + 1),
          [
            {
              id: publishedId,
              params: { type: config.documentType },
            },
          ],
        ],
      });
    },
    [router, paneRouter, config.documentType]
  );

  const load = useCallback(async () => {
    try {
      const previewClient = client.withConfig({ perspective: "previewDrafts" });
      const result = await previewClient.fetch<ArtworkGridDoc[]>(config.query);
      const deduped = dedupeArtworkDocs(Array.isArray(result) ? result : []);
      setDocs(enrichGridDocs(previewClient, deduped, config.documentType));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${config.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [client, config.query, config.title, config.documentType]);

  const handleArtworkRemoved = useCallback(
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

  useEffect(() => {
    setLoading(true);
    load();
    const subscription = client
      .listen(config.listenQuery, {}, { includeResult: false })
      .subscribe(() => {
        load();
      });
    return () => subscription.unsubscribe();
  }, [client, config.listenQuery, load]);

  const mobile = viewport === "mobile";
  const pages = useMemo(() => packDocsToPages(docs, mobile), [docs, mobile]);
  const gridEntries = useMemo(() => buildGridEntriesFromDocs(docs), [docs]);
  const orderNumberById = useMemo(
    () => Object.fromEntries(flatEntryOrder(docs).map((id, index) => [id, index + 1])),
    [docs]
  );
  const layout = useMemo(
    () => (mobile ? { cols: 2, rows: 2 } : { cols: 3, rows: 2 }),
    [mobile]
  );

  const handleMoveToPosition = useCallback(
    async (entryId: string, targetPosition: number) => {
      if (!entryId || saving) return;
      setSaving(true);
      setError(null);
      try {
        await commitMoveToPosition(client, docs, entryId, targetPosition);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reorder failed");
      } finally {
        setSaving(false);
        dragIdRef.current = "";
        setDragId("");
        setOverId("");
      }
    },
    [client, docs, load, saving]
  );

  const handleDrop = useCallback(
    async (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId || saving) return;
      setSaving(true);
      setError(null);
      try {
        await commitEntryReorder(client, docs, sourceId, targetId);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reorder failed");
      } finally {
        setSaving(false);
        dragIdRef.current = "";
        setDragId("");
        setOverId("");
      }
    },
    [client, docs, load, saving]
  );

  useEffect(() => {
    const preventFileDrop = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", preventFileDrop);
    window.addEventListener("drop", preventFileDrop);
    return () => {
      window.removeEventListener("dragover", preventFileDrop);
      window.removeEventListener("drop", preventFileDrop);
    };
  }, []);

  const renderCell = (placed: PlacedEntry, pageIndex: number) => {
    const id = entryId(placed.entry);
    const title = placed.entry.item.title || "Untitled";
    const orderNumber = orderNumberById[id] || 0;

    return (
      <GridCell
        key={`${pageIndex}-${id}-${placed.placement.col}-${placed.placement.row}`}
        $col={placed.placement.col}
        $row={placed.placement.row}
        $rowSpan={placed.placement.rowSpan}
        $isDiptych={placed.entry.kind === "diptych"}
        $dragging={dragId === id}
        $over={overId === id && dragId !== id}
        $selected={selectedId === id}
        title={`#${orderNumber} ${title}`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (id !== dragIdRef.current) setOverId(id);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (id !== dragIdRef.current) setOverId(id);
        }}
        onDragLeave={(event) => {
          if (overId === id && event.currentTarget === event.target) setOverId("");
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const sourceId =
            event.dataTransfer.getData("application/x-gallery-artwork-id") ||
            event.dataTransfer.getData("text/plain") ||
            dragIdRef.current;
          if (sourceId) void handleDrop(sourceId, id);
        }}
      >
        <CellFrame>
          <OrderBadge aria-hidden>#{orderNumber}</OrderBadge>
          <DragHandle
            aria-label={`Drag to reorder ${title}`}
            draggable={!saving}
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              dragIdRef.current = id;
              setDragId(id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", id);
              event.dataTransfer.setData("application/x-gallery-artwork-id", id);
            }}
            onDragEnd={() => {
              dragIdRef.current = "";
              setDragId("");
              setOverId("");
            }}
          >
            <DragHandleIcon />
          </DragHandle>
          <CellContent entry={placed.entry} />
          <CellTitle title={title}>{title}</CellTitle>
          <CellActions>
            <ArtworkActions
              docId={placed.entry.item._id}
              documentType={config.documentType}
              isSelected={selectedId === id}
              compact
              disabled={saving}
              onOpen={openDocumentDetails}
              onDeleted={handleArtworkRemoved}
              onError={setError}
            />
          </CellActions>
        </CellFrame>
      </GridCell>
    );
  };

  return (
    <Box padding={4}>
      <Container width={4}>
        <Stack space={4}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Flex align="center" gap={2}>
              <ImagesIcon />
              <Heading size={2}>{config.heading}</Heading>
            </Flex>
            <Flex gap={2} align="center">
              <Button
                icon={AddIcon}
                mode="ghost"
                text={config.addButtonLabel}
                onClick={() => {
                  router.navigateIntent("create", { type: config.documentType, mode: "structure" });
                }}
              />
              <Tab
                aria-controls={panelId}
                id={`${config.id}-desktop-tab`}
                label="Desktop (6 per page)"
                onClick={() => setViewport("desktop")}
                selected={viewport === "desktop"}
              />
              <Tab
                aria-controls={panelId}
                id={`${config.id}-mobile-tab`}
                label="Mobile (4 per page)"
                onClick={() => setViewport("mobile")}
                selected={viewport === "mobile"}
              />
            </Flex>
          </Flex>

          <Text size={1} muted>
            {config.helpText}
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
                No artworks found for this section. Use Add to create one, or check that medium is
                set correctly (paintings vs prints).
              </Text>
            </Card>
          ) : (
            <Stack space={5} id={panelId}>
              {pages.map((page, pageIndex) => {
                const placed = dedupePlacedPage(page);
                const openSlots = listOpenGridSlots(placed, mobile);
                return (
                  <Stack space={3} key={`page-${pageIndex}`}>
                    <Text size={1} weight="semibold">
                      Page {pageIndex + 1}
                    </Text>
                    <Card padding={3} radius={3} tone="transparent" style={{ background: "#151515" }}>
                      <GridPage
                        $cols={layout.cols}
                        $rows={layout.rows}
                        onDragOver={(event) => event.preventDefault()}
                      >
                        {placed.map((item) => renderCell(item, pageIndex))}
                        {openSlots.map((slot) => (
                          <EmptySlot
                            key={`empty-${pageIndex}-${slot.col}-${slot.row}`}
                            $col={slot.col}
                            $row={slot.row}
                            aria-hidden
                          />
                        ))}
                      </GridPage>
                    </Card>
                  </Stack>
                );
              })}

              <OrderListPanel
                entries={gridEntries}
                selectedId={selectedId}
                saving={saving}
                documentType={config.documentType}
                onOpenDetails={openDocumentDetails}
                onArtworkRemoved={handleArtworkRemoved}
                onArtworkError={setError}
                onMove={(entryId, position) => void handleMoveToPosition(entryId, position)}
              />
            </Stack>
          )}

          {saving ? (
            <Text size={1} muted>
              Saving order…
            </Text>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
