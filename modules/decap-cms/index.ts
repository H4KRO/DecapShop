import { addServerHandler, createResolver, defineNuxtModule, extendPages  } from '@nuxt/kit'
import { moduleOptionsSchema, type ModuleOptions } from './types'
import resolveOptions from './utils/resolve-options'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'decap-cms-module',
    configKey: 'decapCms',
    dependencies: ['@nuxt/content']
  },
  defaults: moduleOptionsSchema.safeParse({}).data,
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    if (!nuxt.options._installedModules?.some(m => m.meta?.name === '@nuxt/content')) {
      throw new Error('Le module @nuxt/content est requis pour decap-cms-module')
    }

    const options = await resolveOptions(_options, nuxt)

    nuxt.options.runtimeConfig.decapCms = options
    
    addServerHandler({
      route: `${options.route}`,
      handler: resolve('./runtime/index.get.ts')
    })
    
    addServerHandler({
      route: `${options.route}/config.yml`,
      handler: resolve('./runtime/config.get.ts')
    })
    
    addServerHandler({
      route: `${options.route}/components.js`,
      handler: resolve('./runtime/components.get.ts')
    })

    extendPages((pages) => {
      pages.unshift({
        name: 'decap-preview',
        path: `${options.route}/preview`,
        file: resolve('runtime/DecapPreview.vue'),
      })
    })
  }
})
