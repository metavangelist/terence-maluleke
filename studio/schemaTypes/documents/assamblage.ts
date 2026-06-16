import { defineType } from "sanity";
import { ComponentIcon } from "@sanity/icons";
import { artworkFields, artworkFieldGroups } from "../objects/artworkFields";

export const assamblage = defineType({
  name: "assamblage",
  title: "Assamblage",
  type: "document",
  icon: ComponentIcon,
  groups: artworkFieldGroups,
  fields: [
    ...artworkFields.map((field) =>
      field.name === "medium"
        ? { ...field, initialValue: "Assamblage" }
        : field
    ),
  ],
  orderings: [
    {
      title: "Sort order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "year",
      sold: "sold",
      media: "image",
    },
    prepare({ title, subtitle, sold, media }) {
      return {
        title,
        subtitle: [subtitle, sold ? "Sold" : null].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});
