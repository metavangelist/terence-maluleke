import { defineField } from "sanity";

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
    validation: (rule) => rule.required(),
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
    name: "sortOrder",
    title: "Sort order",
    type: "number",
    group: "display",
    description: "Lower numbers appear first (0 = top of gallery).",
    initialValue: 0,
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
