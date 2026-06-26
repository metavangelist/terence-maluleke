import { defineField } from "sanity";

function hasUploadedImage(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const asset = (value as { asset?: { _ref?: string } }).asset;
  return Boolean(asset?._ref);
}

function hasLegacyFilename(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export const artworkFields = [
  defineField({
    name: "title",
    title: "Title",
    type: "string",
    group: "details",
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: "slug",
    title: "Slug",
    type: "slug",
    group: "details",
    options: { source: "title", maxLength: 96 },
  }),
  defineField({
    name: "image",
    title: "Image",
    type: "image",
    group: "media",
    options: { hotspot: true },
    description:
      "Upload the artwork image. Imported items can use their legacy filename until you upload here.",
    validation: (rule) =>
      rule.custom(async (image, context) => {
        const doc = context.document as { _id?: string; legacyFilename?: string } | undefined;
        if (hasUploadedImage(image) || hasLegacyFilename(doc?.legacyFilename)) {
          return true;
        }

        const publishedId = doc?._id?.replace(/^drafts\./, "");
        if (publishedId && context.getClient) {
          try {
            const publishedLegacy = await context
              .getClient({ apiVersion: "2025-06-27" })
              .fetch<string | null>(`*[_id == $id][0].legacyFilename`, { id: publishedId });
            if (hasLegacyFilename(publishedLegacy)) return true;
          } catch {
            // Fall through to the message below.
          }
        }

        return "Upload an image (or keep the legacy filename from import).";
      }),
  }),
  defineField({
    name: "year",
    title: "Year",
    type: "string",
    group: "details",
  }),
  defineField({
    name: "medium",
    title: "Medium",
    type: "string",
    group: "details",
    initialValue: "Acrylic on canvas",
  }),
  defineField({
    name: "dimensions",
    title: "Dimensions / price line",
    type: "string",
    group: "details",
    description: "e.g. 100 x 116 in | US$16,000",
  }),
  defineField({
    name: "price",
    title: "Price",
    type: "string",
    group: "details",
  }),
  defineField({
    name: "sold",
    title: "Sold",
    type: "boolean",
    group: "details",
    initialValue: false,
  }),
  defineField({
    name: "presentationStyle",
    title: "Presentation style",
    type: "string",
    group: "display",
    options: {
      list: [
        { title: "Single image", value: "single" },
        { title: "Stacked pair (one slot, top + bottom)", value: "stackedPair" },
      ],
      layout: "radio",
    },
    initialValue: "single",
      description:
        "Stacked pairs share one tall grid slot (top + bottom). Use a bottom panel image on this document, or link a partner artwork (the partner is hidden from the gallery list).",
  }),
  defineField({
    name: "secondImage",
    title: "Bottom panel image",
    type: "image",
    group: "display",
    options: { hotspot: true },
    hidden: ({ parent }) => parent?.presentationStyle !== "stackedPair",
    description: "Shown below the main image in the same grid slot.",
  }),
  defineField({
    name: "pairedArtwork",
    title: "Linked bottom artwork (optional)",
    type: "reference",
    group: "display",
    to: [{ type: "artwork" }],
    hidden: ({ parent }) => parent?.presentationStyle !== "stackedPair",
    description:
      "Use instead of a bottom image when the second panel is its own artwork document. That linked artwork is hidden from the gallery list and moves with this one.",
  }),
  defineField({
    name: "pairRole",
    title: "Pair role",
    type: "string",
    group: "display",
    options: {
      list: [
        { title: "Primary (shown in gallery list)", value: "primary" },
        { title: "Secondary (hidden, moves with primary)", value: "secondary" },
      ],
    },
    readOnly: true,
    hidden: ({ document }) => document?.pairRole !== "secondary",
  }),
  defineField({
    name: "legacyFilename",
    title: "Legacy filename",
    type: "string",
    group: "display",
    readOnly: true,
    description: "Original site filename — kept for reference after import.",
  }),
];

export const artworkFieldGroups = [
  { name: "media", title: "Image", default: true },
  { name: "details", title: "Artwork details" },
  { name: "display", title: "Display order" },
];
