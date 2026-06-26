import { defineType, defineField } from "sanity";
import { ImageIcon } from "@sanity/icons";
import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";

export const studyImage = defineType({
  name: "studyImage",
  title: "Study image",
  type: "document",
  icon: ImageIcon,
  fields: [
    orderRankField({ type: "studyImage" }),
    defineField({
      name: "title",
      title: "Title (optional)",
      type: "string",
    }),
    defineField({
      name: "legacyFilename",
      title: "Legacy filename",
      type: "string",
      description: "Matches assets/study/ filename on the site.",
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  orderings: [orderRankOrdering],
  preview: {
    select: {
      title: "title",
      subtitle: "legacyFilename",
      media: "image",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || subtitle || "Study image",
        subtitle,
        media,
      };
    },
  },
});
