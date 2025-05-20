import * as yaml from 'js-yaml'
//import { setResponseHeaders } from 'h3'

export default defineEventHandler(async (event) => {
  const { decapCms: options } = useRuntimeConfig()

  //setResponseHeaders(event, {
  //  'Content-Type': 'application/x-yaml'
  //})

  const collections = [
    {
      name: 'page',
      label: 'Pages',
      label_singular: 'Page',
      nested: {
        depth: 100,
        summary: '{{title}}'
      },
      folder: 'content/pages',
      format: 'frontmatter',
      create: true,
      editor: {
        preview: true,
      },
      fields: [
        { label: 'Body', name: 'body', widget: 'markdown' }
      ],
      meta: { path: { widget: 'string', label: 'Path', index_file: 'index' } }
    }
  ]

  const data = {
    backend: {
      name: options.backend.name,
      repo: options.backend.repo,
      branch: options.backend.branch
    },
    media_folder: options.mediaFolder || 'static/img',
    public_folder: options.publicFolder || '/img',
    collections
  }

  return yaml.dump(data, { noRefs: true })
})
