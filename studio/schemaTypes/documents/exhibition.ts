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
      title: "Start date",
      type: "date",
      description: "The first day of the event.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "End date",
      type: "date",
      description: "The last day of the event (leave empty for single-day events).",
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
      endDate: "endDate",
      venue: "venue",
    },
    prepare({ name, eventDate, endDate, venue }) {
      let formatted = null;
      if (eventDate) {
        const start = new Date(`${eventDate}T12:00:00`);
        if (endDate && endDate !== eventDate) {
          const end = new Date(`${endDate}T12:00:00`);
          const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
          const sameYear = start.getFullYear() === end.getFullYear();
          if (sameMonth) {
            formatted = `${start.getDate()} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
          } else if (sameYear) {
            formatted = `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
          } else {
            formatted = `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
          }
        } else {
          formatted = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        }
      }
      return {
        title: name,
        subtitle: [formatted, venue].filter(Boolean).join(" · "),
      };
    },
  },
});
