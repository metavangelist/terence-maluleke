import { defineType, defineField } from "sanity";
import { UserIcon } from "@sanity/icons";

export const artistInfo = defineType({
  name: "artistInfo",
  title: "Artist bio",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "bio",
      title: "Biography",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "bioPlain",
      title: "Biography (plain text fallback)",
      type: "text",
      rows: 8,
      description: "Used by the static site if Portable Text is not wired yet.",
    }),
  ],
  preview: {
    prepare() {
      return { title: "Artist bio" };
    },
  },
});
