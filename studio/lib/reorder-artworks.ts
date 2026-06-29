import type { SanityClient } from "@sanity/client";
import { LexoRank } from "lexorank";
import {
  canonicalArtworkId,
  flatEntryOrder,
  reorderDocsByEntryMove,
  reorderDocsToPosition,
  type ArtworkGridDoc,
} from "./gallery-grid-entries";

const ORDER_FIELD = "orderRank";

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

export async function reorderArtwork(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  movingIndex: number
) {
  const moving = docs[movingIndex];
  if (!moving) return;
  await rebalanceOrderRanks(client, docs);
}

export async function commitEntryReorder(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  sourceEntryId: string,
  targetEntryId: string
) {
  const sourceId = docs.find((doc) => canonicalArtworkId(doc._id) === sourceEntryId)?._id;
  const targetId = docs.find((doc) => canonicalArtworkId(doc._id) === targetEntryId)?._id;
  if (!sourceId || !targetId) return;

  const reordered = reorderDocsByEntryMove(docs, sourceId, targetId);
  const destIndex = reordered.findIndex((doc) => doc._id === sourceId);
  if (destIndex < 0) return;
  await reorderArtwork(client, reordered, destIndex);
}

export async function commitMoveToPosition(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  sourceEntryId: string,
  targetPosition: number
) {
  const sourceId = docs.find((doc) => canonicalArtworkId(doc._id) === sourceEntryId)?._id;
  if (!sourceId) return;

  const reordered = reorderDocsToPosition(docs, sourceId, targetPosition);
  const destIndex = reordered.findIndex((doc) => doc._id === sourceId);
  if (destIndex < 0) return;

  const currentIndex = flatEntryOrder(docs).indexOf(sourceEntryId);
  if (currentIndex === destIndex) return;

  await reorderArtwork(client, reordered, destIndex);
}
