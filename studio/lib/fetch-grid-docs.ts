import type { SanityClient } from "sanity";
import type { ArtworkGridDoc } from "./gallery-grid-entries";

const GRID_DOC_FIELDS = `{
  _id,
  title,
  orderRank,
  presentationStyle,
  pairRole,
  "pairedArtworkId": pairedArtwork._ref,
  image,
  secondImage,
  legacyFilename,
  medium
}`;

export type GridDocScope = "gallery" | "prints" | "all";

export function gridDocsQuery(
  documentType: "artwork" | "assamblage",
  scope: GridDocScope = "gallery"
) {
  const printFilter =
    documentType === "artwork" && scope === "gallery"
      ? ' && !lower(coalesce(medium, "")) match "print*"'
      : documentType === "artwork" && scope === "prints"
        ? ' && lower(coalesce(medium, "")) match "print*"'
        : "";

  return `*[_type == "${documentType}" && !(pairRole == "secondary")${printFilter}] | order(orderRank asc, title asc) ${GRID_DOC_FIELDS}`;
}

export async function fetchGridDocs(
  client: SanityClient,
  documentType: "artwork" | "assamblage",
  scope: GridDocScope = "gallery"
) {
  const previewClient = client.withConfig({ perspective: "previewDrafts" });
  const result = await previewClient.fetch<ArtworkGridDoc[]>(
    gridDocsQuery(documentType, scope)
  );
  return Array.isArray(result) ? result : [];
}
