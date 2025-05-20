import { parse } from 'vue-docgen-api'
import { promises as fs } from 'fs'
import path from 'path'
import { defineEventHandler } from 'h3'

interface PropInfo {
  name: string
  type?: string
  required: boolean
  defaultValue?: string
}

interface ComponentInfo {
  name: string
  props: PropInfo[]
}

const COMPONENTS_DIR = path.resolve(process.cwd(), './components/content')

function toKebabCase(filename: string) {
  return filename
    .replace(/\.vue$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function uncapitalize(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

async function getVueFiles(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir)
  return files.filter(file => file.endsWith('.vue'))
}

async function parseComponent(filePath: string): Promise<ComponentInfo | null> {
  try {
    const doc = await parse(filePath)
    const props: PropInfo[] = doc.props?.map(p => ({
      name: p.name,
      type: p.type?.name || 'string',
      required: p.required || false,
      defaultValue: p.defaultValue?.value
    })) || []

    return {
      name: path.basename(filePath),
      props
    }
  } catch (error: any) {
    console.warn(`Erreur lors de l'analyse de ${filePath} :`, error.message)
    return null
  }
}

function generateCMSComponent(component: ComponentInfo): string {
  const id = uncapitalize(component.name.replace(/\.vue$/, ''))
  const label = toKebabCase(component.name)
  const pattern = `::${label}\\{([^}]+)\\}\\s*([\\s\\S]*?)\\s*::`

  const fields = component.props.map(prop => {
    return `{ name: "${prop.name}", label: "${prop.name}", widget: "${prop.type || 'string'}" }`
  }).join(',\n    ')

  const fromBlock = `
    function(match) {
      const props = {};
      [...match[1].matchAll(/(\\w+)="([^"]*)"/g)].forEach(([_, key, value]) => {
        props[key] = value;
      });
      props.default = match[2]?.trim?.();
      return props;
    }
  `

  const toBlock = `
    function(obj) {
      const propString = Object.entries(obj)
        .filter(([key]) => key !== 'default')
        .map(([key, value]) => \`\${key}="\${value}"\`)
        .join(' ');
      return \`::${label}{\${propString}}\\n\${obj.default || ''}\\n::\`;
    }
  `

  const toPreview = `
    function(obj) {
      return \`<div style="border:1px dashed #ccc; padding: 1em;">
        <strong>${label}</strong>
        <pre>\${JSON.stringify(obj, null, 2)}</pre>
      </div>\`;
    }
  `

  return `CMS.registerEditorComponent({
  id: "${id}",
  label: "${label}",
  fields: [
    ${fields}
  ],
  pattern: /^${pattern}$/,
  fromBlock: ${fromBlock.trim()},
  toBlock: ${toBlock.trim()},
  toPreview: ${toPreview.trim()}
});`
}

export default defineEventHandler(async () => {
  const files = await getVueFiles(COMPONENTS_DIR)
  const output: string[] = []

  for (const file of files) {
    const fullPath = path.join(COMPONENTS_DIR, file)
    const component = await parseComponent(fullPath)
    if (component) {
      output.push(generateCMSComponent(component))
    }
  }

  return `
${output.join('\n\n')}
  `
})
