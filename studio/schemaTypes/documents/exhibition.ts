import { defineType, defineField } from "sanity";
import { CalendarIcon } from "@sanity/icons";

export const exhibition = defineType({
  name: "exhibition",
  title: "Exhibition / event",
  type: "document",
  icon: CalendarIcon,
  fields: [
    defineField({
      name: "name",
      title: "Event name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
    }),
    defineField({
      name: "eventDate",
      title: "Event date",
      type: "date",
      description: "The date this event appears on the calendar.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "venue",
      title: "Venue",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "detail",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "day",
      title: "Day of month",
      type: "number",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "month",
      title: "Month",
      type: "number",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "number",
      hidden: true,
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: "Event date",
      name: "eventDateAsc",
      by: [{ field: "eventDate", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      name: "name",
      eventDate: "eventDate",
      venue: "venue",
    },
    prepare({ name, eventDate, venue }) {
      const formatted = eventDate
        ? new Date(`${eventDate}T12:00:00`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : null;
      return {
        title: name,
        subtitle: [formatted, venue].filter(Boolean).join(" · "),
      };
    },
  },
});
