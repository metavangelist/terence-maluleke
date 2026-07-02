export const HOME_BUBBLE_DOC_ID = "homeBubble";

export const HOME_BUBBLE_DEFAULT = {
  title: "Anima",
  filename: "DSC01668_2.jpg",
  objectPosition: "52% 42%",
  hotspot: { x: 0.52, y: 0.42, height: 0.45, width: 0.45 },
  previewPath: "/static/home-bubble-default.jpg",
} as const;

export type SanityImageValue = {
  _type: "image";
  asset: { _type: "reference"; _ref: string };
  hotspot?: { x: number; y: number; height: number; width: number };
};

export function imageAssetRef(image?: { asset?: { _ref?: string } } | null) {
  return image?.asset?._ref || "";
}

export function isDefaultHomeBubbleArtwork(
  artwork?: { asset?: { _ref?: string } } | null,
  defaultArtwork?: { asset?: { _ref?: string } } | null
) {
  const current = imageAssetRef(artwork);
  const fallback = imageAssetRef(defaultArtwork);
  return Boolean(current && fallback && current === fallback);
}
