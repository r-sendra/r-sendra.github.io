import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// "posts" — the notebook. Each entry is an .mdx file in src/content/posts/.
// type: paper (interactive paper explainer) | reflection | project
const posts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(["paper", "reflection", "project"]),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
