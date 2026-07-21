// Genera build/icon.ico (multi-resolucion, 32bpp con alpha) sin dependencias externas.
// Dibuja una "N" en gradiente cian->magenta sobre fondo #0A0E17, acorde a la paleta NEONCUT.
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'build')
mkdirSync(OUT_DIR, { recursive: true })

const BG = [0x0a, 0x0e, 0x17] // #0A0E17
const CYAN = [0x00, 0xf5, 0xff]
const MAGENTA = [0xff, 0x2b, 0xd6]

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerpColor(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))]
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

// Renderiza un canvas RGBA (Uint8ClampedArray-like array) de tamano size x size
function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4) // RGBA, top-down
  const margin = size * 0.16
  const strokeW = Math.max(1.6, size * 0.155)
  const x0 = margin
  const x1 = size - margin
  const yTop = margin
  const yBot = size - margin
  const cornerR = size * 0.18

  const inRoundedSquare = (x, y) => {
    const rx = Math.max(0, Math.max(margin * 0.15 - x, x - (size - margin * 0.15)))
    const ry = Math.max(0, Math.max(margin * 0.15 - y, y - (size - margin * 0.15)))
    if (rx > 0 || ry > 0) return Math.hypot(rx, ry) <= cornerR
    return true
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      let r = BG[0]
      let g = BG[1]
      let b = BG[2]
      let a = 255

      if (!inRoundedSquare(x + 0.5, y + 0.5)) {
        // fuera del cuadrado redondeado -> transparente
        pixels[idx] = 0
        pixels[idx + 1] = 0
        pixels[idx + 2] = 0
        pixels[idx + 3] = 0
        continue
      }

      // Trazo izquierdo (vertical)
      const dLeft = Math.abs(x + 0.5 - (x0 + strokeW / 2))
      // Trazo derecho (vertical)
      const dRight = Math.abs(x + 0.5 - (x1 - strokeW / 2))
      // Trazo diagonal (de arriba-izq a abajo-der)
      const dDiag = distToSegment(x + 0.5, y + 0.5, x0 + strokeW / 2, yTop, x1 - strokeW / 2, yBot)

      const onLeft = dLeft <= strokeW / 2 && y + 0.5 >= yTop - strokeW / 2 && y + 0.5 <= yBot + strokeW / 2
      const onRight = dRight <= strokeW / 2 && y + 0.5 >= yTop - strokeW / 2 && y + 0.5 <= yBot + strokeW / 2
      const onDiag = dDiag <= strokeW / 2

      if (onLeft || onRight || onDiag) {
        const t = (y + 0.5 - yTop) / (yBot - yTop)
        const col = lerpColor(CYAN, MAGENTA, Math.max(0, Math.min(1, t)))
        r = col[0]
        g = col[1]
        b = col[2]
      }

      pixels[idx] = r
      pixels[idx + 1] = g
      pixels[idx + 2] = b
      pixels[idx + 3] = a
    }
  }
  return pixels
}

// Codifica una imagen RGBA (top-down) como DIB de 32bpp para insertar en el ICO (bottom-up, BGRA)
function encodeDib(size, rgbaTopDown) {
  const headerSize = 40
  const pixelDataSize = size * size * 4
  const andMaskRowBytes = Math.ceil(size / 8 / 4) * 4
  const andMaskSize = andMaskRowBytes * size
  const buf = Buffer.alloc(headerSize + pixelDataSize + andMaskSize)

  buf.writeUInt32LE(headerSize, 0) // biSize
  buf.writeInt32LE(size, 4) // biWidth
  buf.writeInt32LE(size * 2, 8) // biHeight (x2: XOR + AND)
  buf.writeUInt16LE(1, 12) // biPlanes
  buf.writeUInt16LE(32, 14) // biBitCount
  buf.writeUInt32LE(0, 16) // biCompression = BI_RGB
  buf.writeUInt32LE(pixelDataSize, 20) // biSizeImage
  buf.writeInt32LE(0, 24) // biXPelsPerMeter
  buf.writeInt32LE(0, 28) // biYPelsPerMeter
  buf.writeUInt32LE(0, 32) // biClrUsed
  buf.writeUInt32LE(0, 36) // biClrImportant

  // Pixel data: bottom-up, BGRA
  let offset = headerSize
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4
      buf[offset++] = rgbaTopDown[srcIdx + 2] // B
      buf[offset++] = rgbaTopDown[srcIdx + 1] // G
      buf[offset++] = rgbaTopDown[srcIdx + 0] // R
      buf[offset++] = rgbaTopDown[srcIdx + 3] // A
    }
  }

  // AND mask: todo cero (opaco donde alpha manda); ya esta en 0 por Buffer.alloc
  return buf
}

function buildIco(sizes) {
  const images = sizes.map((size) => {
    const rgba = renderIcon(size)
    const dib = encodeDib(size, rgba)
    return { size, dib }
  })

  const headerSize = 6
  const dirEntrySize = 16
  const dirSize = dirEntrySize * images.length
  let dataOffset = headerSize + dirSize
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type = icon
  header.writeUInt16LE(images.length, 4)

  const dirEntries = []
  const dataBuffers = []
  for (const { size, dib } of images) {
    const entry = Buffer.alloc(dirEntrySize)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // color count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bit count
    entry.writeUInt32LE(dib.length, 8) // size in bytes
    entry.writeUInt32LE(dataOffset, 12) // offset
    dataOffset += dib.length
    dirEntries.push(entry)
    dataBuffers.push(dib)
  }

  return Buffer.concat([header, ...dirEntries, ...dataBuffers])
}

const ico = buildIco([16, 32, 48, 256])
writeFileSync(join(OUT_DIR, 'icon.ico'), ico)
console.log('Icono generado en', join(OUT_DIR, 'icon.ico'), `(${ico.length} bytes)`)
