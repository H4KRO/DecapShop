// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    //'@nuxt/test-utils',
    '@nuxt/ui',
    './modules/decap-cms',
    '@nuxtjs/mdc',
  ],
  components: {
    global: true,
    path: './components/content'
  },
  vite: {
    optimizeDeps: {
      include: ['debug']
    }
  },
  decapCms: {
    backend: {
      name: 'github',
      repo: 'H4KRO/DecapShop',
    }
  }
})