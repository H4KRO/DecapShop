import { defineNuxtModule } from '@nuxt/kit'
import { mkdirSync, copyFileSync } from 'fs'
import { join } from 'path'

export default defineNuxtModule({
  meta: {
    name: 'decap-cms',
    configKey: 'decapCms'
  },
  setup(_options, nuxt) {
    nuxt.hook('build:before', () => {
      const indexSource = join(__dirname, 'files', 'index.html')
      const configSource = join(__dirname, 'files', 'config.yml')
      const destinationDir = join(nuxt.options.rootDir, 'public/decap')
      const indexDestination = join(destinationDir, 'index.html')
      const sourceDestination = join(destinationDir, 'config.yml')

      mkdirSync(destinationDir, { recursive: true })
      copyFileSync(indexSource, indexDestination)
      copyFileSync(configSource, sourceDestination)
      console.log('OK')
    })
  }
})
