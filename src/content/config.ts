import { defineCollection, z } from 'astro:content';

// Every procedure page is a markdown file in src/content/procedures/.
// The fields below are the "settings" at the top of each file.
const procedures = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),                 // Page title
    section: z.string(),               // Which menu section it belongs to
    order: z.number().default(99),     // Order within the section (low = first)
    summary: z.string().optional(),    // One-line description
    updated: z.date(),                 // Last updated date
    updatedBy: z.string(),             // Who last updated it
  }),
});

export const collections = { procedures };
