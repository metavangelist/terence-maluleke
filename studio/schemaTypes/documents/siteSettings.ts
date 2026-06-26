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
    defineField({
      name: "ga4MeasurementId",
      title: "GA4 measurement ID",
      description: "Example: G-XXXXXXXXXX. Used by the public site for Google Analytics tracking.",
      type: "string",
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) {
            return true;
          }

          return /^G-[A-Z0-9]+$/.test(value)
            ? true
            : "Use a GA4 measurement ID like G-XXXXXXXXXX";
        }),
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site settings" };
    },
  },
});
