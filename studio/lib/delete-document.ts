import type { SanityClient } from "sanity";

export function canonicalDocumentId(id: string) {
  return id.replace(/^drafts\./, "");
}

/** Prefer draft versions over published when both exist (e.g. after an image upload). */
export function dedupeDocumentVersions<T extends { _id: string }>(docs: T[]): T[] {
  const byCanonical = new Map<string, T>();
  const order: string[] = [];

  for (const doc of docs) {
    const key = canonicalDocumentId(doc._id);
    const existing = byCanonical.get(key);
    if (!existing) {
      byCanonical.set(key, doc);
      order.push(key);
      continue;
    }
    if (doc._id.startsWith("drafts.") && !existing._id.startsWith("drafts.")) {
      byCanonical.set(key, doc);
    }
  }

  return order.map((key) => byCanonical.get(key)!);
}

export async function deleteDocumentVersions(
  client: SanityClient,
  docId: string,
  versionIds?: string[]
) {
  const publishedId = canonicalDocumentId(docId);
  const draftId = `drafts.${publishedId}`;

  const normalizedVersionIds = versionIds
    ?.map((version) => (typeof version === "string" ? version : ""))
    .filter(Boolean);

  const ids =
    normalizedVersionIds && normalizedVersionIds.length > 0
      ? normalizedVersionIds
      : await client.fetch<string[]>(`*[_id in [$published, $draft]]._id`, {
          published: publishedId,
          draft: draftId,
        });

  if (!ids.length) return;

  const transaction = client.transaction();
  for (const id of ids) transaction.delete(id);
  await transaction.commit({ visibility: "sync" });
}
