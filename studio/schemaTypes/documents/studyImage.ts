import { defineType, defineField } from "sanity";
import { ImageIcon } from "@sanity/icons";

export const studyImage = defineType({
  name: "studyImage",
  title: "Study image",
  type: "document",
  icon: ImageIcon,
  fields: [
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
    defineField({
      name: "sortOrder",
      title: "Sort order",
      type: "number",
      initialValue: 0,
    }),
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
