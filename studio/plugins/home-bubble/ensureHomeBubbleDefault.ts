import type { SanityClient } from "@sanity/client";
import {
  HOME_BUBBLE_DEFAULT,
  HOME_BUBBLE_DOC_ID,
  type SanityImageValue,
} from "../../lib/home-bubble-default";

type HomeBubbleDoc = {
  _id: string;
  artwork?: SanityImageValue;
  defaultArtwork?: SanityImageValue;
};

async function uploadDefaultAsset(client: SanityClient) {
  const response = await fetch(HOME_BUBBLE_DEFAULT.previewPath);
  if (!response.ok) {
    throw new Error("Could not load the default home bubble image.");
  }

  const blob = await response.blob();
  const file = new File([blob], HOME_BUBBLE_DEFAULT.filename, {
    type: blob.type || "image/jpeg",
  });

  const asset = await client.assets.upload("image", file, {
    filename: HOME_BUBBLE_DEFAULT.filename,
  });

  return {
    _type: "image" as const,
    asset: { _type: "reference" as const, _ref: asset._id },
    hotspot: { ...HOME_BUBBLE_DEFAULT.hotspot },
  };
}

export async function ensureHomeBubbleDefault(client: SanityClient) {
  const previewClient = client.withConfig({ perspective: "previewDrafts" });
  const doc = await previewClient.fetch<HomeBubbleDoc | null>(
    `*[_id == $id][0]{ _id, artwork, defaultArtwork }`,
    { id: HOME_BUBBLE_DOC_ID }
  );

  if (doc?.defaultArtwork?.asset?._ref) {
    return doc.defaultArtwork;
  }

  const defaultArtwork = await uploadDefaultAsset(client);

  if (!doc) {
    await client.createIfNotExists({
      _id: HOME_BUBBLE_DOC_ID,
      _type: "homeBubble",
      defaultArtwork,
    });
    return defaultArtwork;
  }

  await client
    .patch(HOME_BUBBLE_DOC_ID)
    .set({ defaultArtwork })
    .commit({ autoGenerateArrayKeys: true });
  return defaultArtwork;
}
