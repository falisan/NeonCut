// Genera build/icon.ico (multi-resolucion, 32bpp con alpha) sin dependencias externas.
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { renderIcon } from './icon-render.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'build')
mkdirSync(OUT_DIR, { recursive: true })

// Codifica una imagen RGBA (top-down) como DIB de 32bpp para insertar en el ICO (bottom-up, BGRA)
function encodeDib(size, rgbaTopDown) {
  const headerSize = 40
  const pixelDataSize = size * size * 4
  const andMaskRowBytes = Math.ceil(size / 8 / 4) * 4
  const andMaskSize = andMaskRowBytes * size
  const buf = Buffer.alloc(headerSize + pixelDataSize + andMaskSize)

  buf.writeUInt32LE(headerSize, 0)
  buf.writeInt32LE(size, 4)
  buf.writeInt32LE(size * 2, 8)
  buf.writeUInt16LE(1, 12)
  buf.writeUInt16LE(32, 14)
  buf.writeUInt32LE(0, 16)
  buf.writeUInt32LE(pixelDataSize, 20)
  buf.writeInt32LE(0, 24)
  buf.writeInt32LE(0, 28)
  buf.writeUInt32LE(0, 32)
  buf.writeUInt32LE(0, 36)

  let offset = headerSize
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4
      buf[offset++] = rgbaTopDown[srcIdx + 2]
      buf[offset++] = rgbaTopDown[srcIdx + 1]
      buf[offset++] = rgbaTopDown[srcIdx + 0]
      buf[offset++] = rgbaTopDown[srcIdx + 3]
    }
  }
  return buf
}

function buildIco(sizes) {
  const images = sizes.map((size) => ({ size, dib: encodeDib(size, renderIcon(size)) }))

  const headerSize = 6
  const dirEntrySize = 16
  let dataOffset = headerSize + dirEntrySize * images.length
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const dirEntries = []
  const dataBuffers = []
  for (const { size, dib } of images) {
    const entry = Buffer.alloc(dirEntrySize)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(dib.length, 8)
    entry.writeUInt32LE(dataOffset, 12)
    dataOffset += dib.length
    dirEntries.push(entry)
    dataBuffers.push(dib)
  }

  return Buffer.concat([header, ...dirEntries, ...dataBuffers])
}

const ico = buildIco([16, 32, 48, 256])
writeFileSync(join(OUT_DIR, 'icon.ico'), ico)
console.log('Icono generado en', join(OUT_DIR, 'icon.ico'), `(${ico.length} bytes)`)
