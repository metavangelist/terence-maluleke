import { defineType } from "sanity";
import { ImagesIcon } from "@sanity/icons";
import { artworkFields, artworkFieldGroups } from "../objects/artworkFields";

export const artwork = defineType({
  name: "artwork",
  title: "Gallery artwork",
  type: "document",
  icon: ImagesIcon,
  groups: artworkFieldGroups,
  fields: artworkFields,
  orderings: [
    {
      title: "Sort order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "Year (newest)",
      name: "yearDesc",
      by: [{ field: "year", direction: "desc" }],
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
