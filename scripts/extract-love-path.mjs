import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'

const fontBytes = readFileSync('public/fonts/Amsterdam.ttf')
const font = opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength))

const text = 'love'
const fontSize = 95
const baseline = 740
const tempPath = font.getPath(text, 0, 0, fontSize)
const tempBbox = tempPath.getBoundingBox()
const textWidth = tempBbox.x2 - tempBbox.x1
const posterCenter = 595.3 / 2
const x = posterCenter - textWidth / 2 - tempBbox.x1
const y = baseline

const path = font.getPath(text, x, y, fontSize)
console.log(path.toPathData(2))

const bb = path.getBoundingBox()
console.error('bbox:', bb)
