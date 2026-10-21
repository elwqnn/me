import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    images: z.array(z.string()).default([]),
    githubUrl: z.string().optional(),
    liveUrl: z.string().optional(),
    year: z.string(),
    order: z.number().default(99),
    accentColor: z.string().optional(),
    isNew: z.boolean().default(false),
  }),
})

export const collections = { projects }
