import { defineType } from "sanity";
import { ImagesIcon } from "@sanity/icons";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
import { artworkFields, artworkFieldGroups } from "../objects/artworkFields";

export const artwork = defineType({
  name: "artwork",
  title: "Gallery artwork",
  type: "document",
  icon: ImagesIcon,
  groups: artworkFieldGroups,
  fields: [orderRankField({ type: "artwork" }), ...artworkFields],
  orderings: [
    orderRankOrdering,
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
      presentationStyle: "presentationStyle",
      pairRole: "pairRole",
    },
    prepare({ title, subtitle, sold, media, presentationStyle, pairRole }) {
      const tags = [];
      if (presentationStyle === "stackedPair") tags.push("Stacked pair");
      if (pairRole === "secondary") tags.push("Linked panel");
      if (sold) tags.push("Sold");
      return {
        title,
        subtitle: [subtitle, ...tags].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});
