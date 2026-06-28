import imageUrlBuilder from "@sanity/image-url";
import type { SanityClient } from "sanity";
import {
  legacyAssetFilenameCandidates,
  legacyPreviewUrlCandidates,
} from "./legacy-asset-candidates.js";

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>["image"]>[0];

const GRID_PREVIEW_WIDTH = 480;

export const STUDIO_SITE_URL = (
  typeof process !== "undefined" && process.env.SANITY_STUDIO_SITE_URL
    ? process.env.SANITY_STUDIO_SITE_URL
    : "https://maluleke.art"
).replace(/\/$/, "");

export function legacyPreviewUrl(
  documentType: string,
  legacyFilename?: string | null
): string | null {
  return legacyPreviewUrlCandidates(documentType, legacyFilename, STUDIO_SITE_URL)[0] || null;
}

export { legacyAssetFilenameCandidates, legacyPreviewUrlCandidates };

export function gridPreviewUrl(
  client: SanityClient,
  source: SanityImageSource | null | undefined,
  width = GRID_PREVIEW_WIDTH
): string | null {
  if (!source) return null;
  try {
    return imageUrlBuilder(client).image(source).width(width).auto("format").quality(75).url();
  } catch {
    return null;
  }
}

export function resolveGridPreviewUrls(
  client: SanityClient,
  documentType: string,
  doc: {
    image?: SanityImageSource | null;
    secondImage?: SanityImageSource | null;
    legacyFilename?: string | null;
  }
): { imageUrls: string[]; secondImageUrls: string[] } {
  const imageUrls: string[] = [];
  const push = (url: string | null | undefined) => {
    if (url && !imageUrls.includes(url)) imageUrls.push(url);
  };

  push(gridPreviewUrl(client, doc.image));
  for (const url of legacyPreviewUrlCandidates(
    documentType,
    doc.legacyFilename,
    STUDIO_SITE_URL
  )) {
    push(url);
  }

  const secondImageUrls: string[] = [];
  const pushSecond = (url: string | null | undefined) => {
    if (url && !secondImageUrls.includes(url)) secondImageUrls.push(url);
  };
  pushSecond(gridPreviewUrl(client, doc.secondImage));

  return { imageUrls, secondImageUrls };
}
