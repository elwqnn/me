import { defineCollection, z } from "astro:content"

const projects = defineCollection({
  type: "content",
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
  }),
})

export const collections = { projects }
