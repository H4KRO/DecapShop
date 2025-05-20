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

/**
 * Extrait les slots markdown d'une string
 * 
 * Exemple d'entrée :
 * My default slot content
 * 
 * #description
 * Description content here
 * 
 * #footer
 * Footer content
 * 
 * Retourne un objet avec au moins 'default' et les autres slots nommés
 */
function parseSlots(content: string): Record<string, string> {
  const slots: Record<string, string> = {}

  // Sépare au niveau des lignes commençant par # (slot nommé)
  const parts = content.split(/\n(?=#)/)

  // Slot par défaut (tout avant le premier #slot)
  if (parts.length > 0 && !parts[0].startsWith('#')) {
    slots['default'] = parts[0].trim()
  }

  // Slots nommés
  for (const part of parts) {
    const match = part.match(/^#(\w+)\n([\s\S]*)$/)
    if (match) {
      const [, slotName, slotContent] = match
      slots[slotName] = slotContent.trim()
    }
  }

  return slots
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

/**
 * Génère le code JS de l'enregistrement du composant CMS,
 * avec gestion des slots markdown en plus des props classiques.
 */
function generateCMSComponent(component: ComponentInfo): string {
  const id = uncapitalize(component.name.replace(/\.vue$/, ''))
  const label = toKebabCase(component.name)

  // Pattern : capture props entre {} et contenu entre ::...::
  // Attention, on capture ici le bloc complet des slots (tout ce qui est après les props)
  const pattern = `::${label}\\{([^}]*)\\}\\s*([\\s\\S]*?)\\s*::`

  // Champs pour les props
  const propFields = component.props.map(prop => {
    return `{ name: "${prop.name}", label: "${prop.name}", widget: "${prop.type || 'string'}" }`
  })

  // Champs pour les slots : on crée un champ widget markdown par slot (on met default ici, mais on va gérer dynamiquement dans fromBlock)
  // Par défaut on ajoute au moins le slot 'default'
  // Les slots nommés sont détectés dynamiquement donc on doit générer dynamiquement le fields dans le code JS, pas ici.

  // Génération du fromBlock qui parse props + slots markdown
  // props dans match[1], contenu markdown dans match[2]
  const fromBlock = `
    function(match) {
      // Parse les props sous forme key="value"
      const props = {};
      const propsString = match[1];
      [...propsString.matchAll(/(\\w+)="([^"]*)"/g)].forEach(([_, key, value]) => {
        props[key] = value;
      });

      // Parse les slots markdown du contenu
      const content = match[2] || "";
      const slots = {};
      const parts = content.split(/\\n(?=#)/);

      // Slot par défaut (avant premier #)
      if(parts.length > 0 && !parts[0].startsWith("#")) {
        slots["default"] = parts[0].trim();
      }

      // Slots nommés
      parts.forEach(part => {
        const m = part.match(/^#(\\w+)\\n([\\s\\S]*)$/);
        if(m) {
          slots[m[1]] = m[2].trim();
        }
      });

      // Merge props et slots dans un seul objet de retour
      return {...props, ...slots};
    }
  `

  // Génération du toBlock qui reconstruit le markdown avec props et slots
  const toBlock = `
    function(obj) {
      const propString = Object.entries(obj)
        .filter(([key]) => !["default"].includes(key) && !key.startsWith("_")) // on ignore 'default' et clés privées éventuelles
        .map(([key, value]) => \`\${key}="\${value}"\`)
        .join(" ");

      let res = obj.default || "";

      // Ajoute les slots nommés
      for(const key in obj) {
        if(key !== "default" && !key.startsWith("_") && obj[key]) {
          res += "\\n\\n#" + key + "\\n" + obj[key];
        }
      }

      return \`::${label}{\${propString}}\\n\${res}\\n::\`;
    }
  `

  // toPreview simple, à améliorer selon besoins
  const toPreview = `
    function(obj) {
      // On peut afficher les slots en div séparées, on fait simple ici
      let html = '<div style="border:1px dashed #ccc; padding:1em;">';
      html += '<strong>${label}</strong><br/>';
      for(const key in obj) {
        if(obj[key]) {
          html += '<div><strong>' + key + ':</strong><div>' + obj[key].replace(/\\n/g, '<br/>') + '</div></div>';
        }
      }
      html += '</div>';
      return html;
    }
  `

  // Génération du fields array JS qui combine props + un champ markdown pour chaque slot
  // Ici on génère dynamiquement les champs pour les slots dans le JS (car on ne connaît pas les slots à la compilation)
  // Mais on doit au moins fournir les props en dur, pour les slots on les ajoute dynamiquement dans fromBlock/toBlock, 
  // donc ici on ajoute un champ markdown général pour la saisie des slots (optionnel, ou on le fait dans preview)

  // En pratique, on ne peut pas facilement générer dynamiquement les fields pour slots à la compilation,
  // donc on expose un champ "default" markdown pour que l'utilisateur ait au moins un champ de saisie,
  // et on peut documenter que les slots nommés doivent être saisis en markdown avec le #slotname etc.

  const fields = [
    ...component.props.map(prop => ({
      name: prop.name,
      label: prop.name,
      widget: prop.type || 'string'
    })),
    {
      name: 'default',
      label: 'Contenu principal (slot par défaut)',
      widget: 'markdown'
    }
    // Pour plus de slots, on pourrait ajouter un champ "slots" en JSON, ou une autre solution custom
  ]

  return `CMS.registerEditorComponent({
  id: "${id}",
  label: "${label}",
  fields: ${JSON.stringify(fields, null, 2)},
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
