import { packGalleryPages, gridLayout, listOpenGridSlots } from "./gallery-grid-layout.js";
import { dedupeDocumentVersions } from "./delete-document.js";
import { resolveGridPreviewUrls } from "./grid-image-url.js";
import type { SanityClient } from "sanity";

export type GridDocumentType = "artwork" | "assamblage";

export type GridEntry = {
  kind: "single" | "diptych";
  catalogIndex: number;
  id?: string;
  item: ArtworkGridDoc;
  bottomItem?: ArtworkGridDoc;
  indices?: number[];
};

export type ArtworkGridDoc = {
  _id: string;
  _type?: string;
  title?: string;
  medium?: string | null;
  orderRank?: string;
  presentationStyle?: string | null;
  pairRole?: string | null;
  pairedArtworkId?: string | null;
  legacyFilename?: string | null;
  image?: { asset?: { _ref?: string } } | null;
  secondImage?: { asset?: { _ref?: string } } | null;
  imageUrl?: string | null;
  secondImageUrl?: string | null;
  previewUrls?: string[];
  secondPreviewUrls?: string[];
};

export function enrichGridDocs(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  documentType: GridDocumentType
): ArtworkGridDoc[] {
  return docs.map((doc) => {
    const { imageUrls, secondImageUrls } = resolveGridPreviewUrls(client, documentType, doc);
    return {
      ...doc,
      previewUrls: imageUrls,
      secondPreviewUrls: secondImageUrls,
      imageUrl: imageUrls[0] || null,
      secondImageUrl: secondImageUrls[0] || null,
    };
  });
}

export function canonicalArtworkId(id: string) {
  return id.replace(/^drafts\./, "");
}

export function dedupeArtworkDocs(docs: ArtworkGridDoc[]): ArtworkGridDoc[] {
  return dedupeDocumentVersions(docs);
}

export function buildGridEntriesFromDocs(docs: ArtworkGridDoc[]): GridEntry[] {
  const entries: GridEntry[] = [];
  const byId = Object.fromEntries(docs.map((doc) => [doc._id, doc]));

  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i];
    if (doc.pairRole === "secondary") continue;

    const isStacked =
      doc.presentationStyle === "stackedPair" &&
      Boolean(doc.secondImageUrl || doc.pairedArtworkId);

    if (isStacked) {
      let bottomItem: ArtworkGridDoc | null = null;
      if (doc.secondImageUrl) {
        bottomItem = {
          ...doc,
          title: `${doc.title || "Artwork"} (bottom panel)`,
          imageUrl: doc.secondImageUrl,
        };
      } else if (doc.pairedArtworkId) {
        bottomItem = byId[doc.pairedArtworkId] || null;
      }

      entries.push({
        kind: "diptych",
        catalogIndex: i,
        indices: [i],
        id: canonicalArtworkId(doc._id),
        item: doc,
        bottomItem: bottomItem || undefined,
      });
      continue;
    }

    entries.push({
      kind: "single",
      catalogIndex: i,
      id: canonicalArtworkId(doc._id),
      item: doc,
    });
  }

  return entries;
}

export function packDocsToPages(docs: ArtworkGridDoc[], mobile: boolean) {
  const entries = buildGridEntriesFromDocs(docs);
  return packGalleryPages(entries, { mobile });
}

export function flatEntryOrder(docs: ArtworkGridDoc[]) {
  return buildGridEntriesFromDocs(docs).map((entry) => entry.id || "");
}

export function entryOrderIndex(docs: ArtworkGridDoc[], entryId: string) {
  const order = flatEntryOrder(docs);
  return order.indexOf(entryId);
}

function entriesToDocOrder(docs: ArtworkGridDoc[], entries: GridEntry[]) {
  const ordered = entries
    .map((entry) => docs.find((doc) => canonicalArtworkId(doc._id) === entry.id))
    .filter((doc): doc is ArtworkGridDoc => Boolean(doc));

  const used = new Set(ordered.map((doc) => canonicalArtworkId(doc._id)));
  for (const doc of docs) {
    if (!used.has(canonicalArtworkId(doc._id))) ordered.push(doc);
  }

  return ordered;
}

export function reorderDocsByEntryMove(
  docs: ArtworkGridDoc[],
  sourceEntryId: string,
  targetEntryId: string
) {
  const sourceKey = canonicalArtworkId(sourceEntryId);
  const targetKey = canonicalArtworkId(targetEntryId);
  const entries = buildGridEntriesFromDocs(docs);
  const sourceIdx = entries.findIndex((entry) => entry.id === sourceKey);
  const targetIdx = entries.findIndex((entry) => entry.id === targetKey);
  if (sourceIdx < 0 || targetIdx < 0) return docs;

  const moving = entries[sourceIdx];
  const rest = entries.filter((_, index) => index !== sourceIdx);
  const newEntries = [...rest.slice(0, targetIdx), moving, ...rest.slice(targetIdx)];
  return entriesToDocOrder(docs, newEntries);
}

/** Move one grid entry to a 1-based position in the current order. */
export function reorderDocsToPosition(
  docs: ArtworkGridDoc[],
  sourceEntryId: string,
  targetPosition: number
) {
  const sourceKey = canonicalArtworkId(sourceEntryId);
  const entries = buildGridEntriesFromDocs(docs);
  const sourceIdx = entries.findIndex((entry) => entry.id === sourceKey);
  if (sourceIdx < 0 || entries.length === 0) return docs;

  const destIdx = Math.max(0, Math.min(Math.floor(targetPosition) - 1, entries.length - 1));
  if (sourceIdx === destIdx) return docs;

  const moving = entries[sourceIdx];
  const rest = entries.filter((_, index) => index !== sourceIdx);
  const newEntries = [...rest.slice(0, destIdx), moving, ...rest.slice(destIdx)];
  return entriesToDocOrder(docs, newEntries);
}

export { gridLayout, packGalleryPages, listOpenGridSlots };
