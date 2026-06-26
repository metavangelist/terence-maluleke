import type { SanityClient } from "@sanity/client";
import { LexoRank } from "lexorank";
import {
  canonicalArtworkId,
  reorderDocsByEntryMove,
  reorderDocsToPosition,
  type ArtworkGridDoc,
} from "./gallery-grid-entries";

const ORDER_FIELD = "orderRank";

function parseRank(value: unknown, fallback: LexoRank) {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return LexoRank.parse(value);
  } catch {
    return fallback;
  }
}

export async function reorderArtwork(
  client: SanityClient,
  docs: ArtworkGridDoc[],
  movingIndex: number
) {
  const moving = docs[movingIndex];
  if (!moving) return;

  const prev = docs[movingIndex - 1];
  const next = docs[movingIndex + 1];
  const prevRank = parseRank(prev?.orderRank, LexoRank.min());
  const nextRank = parseRank(next?.orderRank, LexoRank.max());
  const newRank =
    prev && next
      ? prevRank.between(nextRank)
      : prev
        ? prevRank.genNext()
        : nextRank.genPrev();

  const rank = newRank.toString();
  const transaction = client.transaction().patch(moving._id, { set: { [ORDER_FIELD]: rank } });

  const publishedId = canonicalArtworkId(moving._id);
  if (moving._id.startsWith("drafts.") && publishedId !== moving._id) {
    transaction.patch(publishedId, { set: { [ORDER_FIELD]: rank } });
  }

  await transaction.commit({ visibility: "sync" });
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
  await reorderArtwork(client, reordered, destIndex);
}
