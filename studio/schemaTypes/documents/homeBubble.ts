import { defineType, defineField } from "sanity";
import { HomeIcon } from "@sanity/icons";
import { HOME_BUBBLE_DEFAULT } from "../../lib/home-bubble-default";
import { HomeBubbleArtworkInput } from "../../plugins/home-bubble/HomeBubbleArtworkInput";

export const homeBubble = defineType({
  name: "homeBubble",
  title: "Home bubble",
  type: "document",
  icon: HomeIcon,
  fields: [
    defineField({
      name: "defaultArtwork",
      title: "Default artwork",
      type: "image",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "artwork",
      title: "Bubble artwork",
      type: "image",
      options: { hotspot: true },
      components: {
        input: HomeBubbleArtworkInput,
      },
    }),
    defineField({
      name: "objectPosition",
      title: "Crop focus (optional)",
      description:
        'Fine-tune focal point as CSS object-position, e.g. "52% 42%". Leave empty to use the image hotspot. Cleared when you restore the default artwork.',
      type: "string",
      validation: (rule) =>
        rule.custom((value) => {
          if (!value?.trim()) return true;
          return /^\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(value.trim())
            ? true
            : 'Use two percentages like "52% 42%"';
        }),
    }),
  ],
  preview: {
    select: {
      artwork: "artwork",
      defaultArtwork: "defaultArtwork",
    },
    prepare({ artwork, defaultArtwork }) {
      const media = artwork || defaultArtwork;
      const usingCustom = Boolean(artwork?.asset?._ref);

      return {
        title: "Home bubble",
        subtitle: usingCustom
          ? "Custom artwork published"
          : `Site default · ${HOME_BUBBLE_DEFAULT.title}`,
        media,
      };
    },
  },
});
