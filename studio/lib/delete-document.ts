import type { SanityClient } from "sanity";

export function canonicalDocumentId(id: string) {
  return id.replace(/^drafts\./, "");
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
