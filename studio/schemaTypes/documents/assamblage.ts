import { defineType } from "sanity";
import { ComponentIcon } from "@sanity/icons";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
import { artworkFields, artworkFieldGroups } from "../objects/artworkFields";

export const assamblage = defineType({
  name: "assamblage",
  title: "Assamblage",
  type: "document",
  icon: ComponentIcon,
  groups: artworkFieldGroups,
  fields: [
    orderRankField({ type: "assamblage" }),
    ...artworkFields.map((field) => {
      if (field.name === "medium") {
        return { ...field, initialValue: "Assamblage" };
      }
      if (field.name === "pairedArtwork") {
        return { ...field, to: [{ type: "assamblage" }] };
      }
      return field;
    }),
  ],
  orderings: [orderRankOrdering],
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
