import { z } from 'zod'

const backendSchema = z.object({
  name: z.string(),
  repo: z.string(),
  branch: z.string().default('main'),
})

export const moduleOptionsSchema = z.object({
  route: z.string().default('/decap'),
  backend: backendSchema,
  mediaFolder: z.string().default('static/uploads'),
  publicFolder: z.string().default('/uploads'),
}).refine((data) => data.backend !== undefined, {
  message: '[nuxt-decap] "backend" config is required.',
  path: ['backend'],
})

export type ModuleOptions = z.input<typeof moduleOptionsSchema>
export type RequiredModuleOptions = z.output<typeof moduleOptionsSchema>
