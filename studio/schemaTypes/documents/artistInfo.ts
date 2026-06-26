import { defineType, defineField } from "sanity";
import { UserIcon } from "@sanity/icons";
import { DEFAULT_ARTIST_BIO } from "../../lib/defaultArtistBio";

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
      description: `Custom bio for the Info section. Leave empty and publish to restore the default:\n\n${DEFAULT_ARTIST_BIO}`,
    }),
  ],
  preview: {
    prepare() {
      return { title: "Artist bio" };
    },
  },
});
