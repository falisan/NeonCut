// Genera build/AppIcon.iconset/*.png (juego completo para macOS).
// En CI (macOS), un paso posterior corre `iconutil -c icns` sobre esta carpeta
// para producir build/icon.icns, que es lo que espera electron-builder.
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { renderPng } from './icon-render.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'build', 'AppIcon.iconset')
mkdirSync(OUT_DIR, { recursive: true })

const SIZES = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
]

for (const [name, size] of SIZES) {
  const png = renderPng(size)
  writeFileSync(join(OUT_DIR, name), png)
}
console.log('Iconset generado en', OUT_DIR)
