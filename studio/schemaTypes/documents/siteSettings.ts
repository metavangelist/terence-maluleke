import { defineType, defineField } from "sanity";
import { CogIcon } from "@sanity/icons";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "siteTitle",
      title: "Site title",
      type: "string",
      initialValue: "Terence Ntsako Maluleke",
    }),
    defineField({
      name: "enquiryEmail",
      title: "Enquiry email",
      type: "string",
      initialValue: "Contact@maluleke.art",
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: "instagramUrl",
      title: "Instagram URL",
      type: "url",
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site settings" };
    },
  },
});
