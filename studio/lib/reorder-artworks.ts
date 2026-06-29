import type { SanityClient } from "@sanity/client";
import { LexoRank } from "lexorank";
import {
  canonicalArtworkId,
  flatEntryOrder,
  reorderDocsByEntryMove,
  reorderDocsToPosition,
  type ArtworkGridDoc,
} from "./gallery-grid-entries";
import { fetchGridDocs, type GridDocScope } from "./fetch-grid-docs";

const ORDER_FIELD = "orderRank";

function isPrintMedium(medium: unknown) {
  return /^print/i.test(String(medium || "").trim());
}

/** Rewrite orderRank for every doc so sort order matches the visual grid exactly. */
export async function rebalanceOrderRanks(client: SanityClient, docs: ArtworkGridDoc[]) {
  if (!docs.length) return;

  let rank = LexoRank.min();
  const transaction = client.transaction();

  for (const doc of docs) {
    rank = rank.genNext();
    const orderRank = rank.toString();
    transaction.patch(doc._id, { set: { [ORDER_FIELD]: orderRank } });

    const publishedId = canonicalArtworkId(doc._id);
    if (doc._id.startsWith("drafts.") && publishedId !== doc._id) {
      transaction.patch(publishedId, { set: { [ORDER_FIELD]: orderRank } });
    }
  }

  await transaction.commit({ visibility: "sync" });
}

async function rebalanceScopedDocs(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  reorderedPartition: ArtworkGridDoc[],
  scope: GridDocScope
) {
  if (!docs.length) return;

  if (docs[0]._type === "artwork") {
    const allDocs = await fetchGridDocs(client, "artwork", "all");
    const galleryDocs =
      scope === "gallery"
        ? reorderedPartition
        : allDocs.filter((doc) => !isPrintMedium(doc.medium));
    const printDocs =
      scope === "prints"
        ? reorderedPartition
        : allDocs.filter((doc) => isPrintMedium(doc.medium));

    await rebalanceOrderRanks(client, [...galleryDocs, ...printDocs]);
    return;
  }

  await rebalanceOrderRanks(client, reorderedPartition);
}

export async function reorderArtwork(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  movingIndex: number,
  scope: GridDocScope = "gallery"
) {
  if (!docs[movingIndex]) return;
  await rebalanceScopedDocs(client, docs, docs, scope);
}

export async function commitEntryReorder(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  sourceEntryId: string,
  targetEntryId: string,
  scope: GridDocScope = "gallery"
) {
  const sourceId = docs.find((doc) => canonicalArtworkId(doc._id) === sourceEntryId)?._id;
  const targetId = docs.find((doc) => canonicalArtworkId(doc._id) === targetEntryId)?._id;
  if (!sourceId || !targetId) return;

  const reordered = reorderDocsByEntryMove(docs, sourceId, targetId);
  const destIndex = reordered.findIndex((doc) => doc._id === sourceId);
  if (destIndex < 0) return;
  await rebalanceScopedDocs(client, docs, reordered, scope);
}

export async function commitMoveToPosition(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  sourceEntryId: string,
  targetPosition: number,
  scope: GridDocScope = "gallery"
) {
  const sourceId = docs.find((doc) => canonicalArtworkId(doc._id) === sourceEntryId)?._id;
  if (!sourceId) return;

  const reordered = reorderDocsToPosition(docs, sourceId, targetPosition);
  const destIndex = reordered.findIndex((doc) => doc._id === sourceId);
  if (destIndex < 0) return;

  const currentIndex = flatEntryOrder(docs).indexOf(sourceEntryId);
  if (currentIndex === destIndex) return;

  await rebalanceScopedDocs(client, docs, reordered, scope);
}
