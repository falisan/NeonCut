// Renderizado compartido del logo NEONCUT (una "N" en gradiente cian->magenta
// sobre fondo #0A0E17) y un codificador PNG minimo, sin dependencias externas.
// Usado por generate-icon.mjs (.ico) y generate-iconset.mjs (.iconset para macOS).
import zlib from 'zlib'

const BG = [0x0a, 0x0e, 0x17]
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

// Devuelve un buffer RGBA (top-down, 4 bytes/pixel) de tamano size x size
export function renderIcon(size, { rounded = true } = {}) {
  const pixels = new Uint8Array(size * size * 4)
  const margin = size * 0.16
  const strokeW = Math.max(1.6, size * 0.155)
  const x0 = margin
  const x1 = size - margin
  const yTop = margin
  const yBot = size - margin
  const cornerR = size * 0.18

  const inRoundedSquare = (x, y) => {
    if (!rounded) return true
    const rx = Math.max(0, Math.max(margin * 0.15 - x, x - (size - margin * 0.15)))
    const ry = Math.max(0, Math.max(margin * 0.15 - y, y - (size - margin * 0.15)))
    if (rx > 0 || ry > 0) return Math.hypot(rx, ry) <= cornerR
    return true
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      if (!inRoundedSquare(x + 0.5, y + 0.5)) {
        pixels[idx] = 0
        pixels[idx + 1] = 0
        pixels[idx + 2] = 0
        pixels[idx + 3] = 0
        continue
      }

      let r = BG[0]
      let g = BG[1]
      let b = BG[2]

      const dLeft = Math.abs(x + 0.5 - (x0 + strokeW / 2))
      const dRight = Math.abs(x + 0.5 - (x1 - strokeW / 2))
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
      pixels[idx + 3] = 255
    }
  }
  return pixels
}

function crc32(buf) {
  let c
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// Codifica un buffer RGBA top-down como PNG (color type 6, sin filtro por fila)
export function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = size * 4
  const raw = Buffer.alloc(size * (1 + stride))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + stride)
    raw[rowStart] = 0 // sin filtro
    for (let x = 0; x < stride; x++) {
      raw[rowStart + 1 + x] = rgba[y * stride + x]
    }
  }
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

export function renderPng(size, opts) {
  return encodePng(size, Buffer.from(renderIcon(size, opts)))
}
