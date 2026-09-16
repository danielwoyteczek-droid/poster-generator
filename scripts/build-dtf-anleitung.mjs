/**
 * Baut die DTF-Anwendungsanleitung als Bild — mehrsprachig aus einer Quelle.
 *
 * Absicht: Nicht ein Bild bearbeiten, sondern eine Vorlage, aus der jede
 * Sprachfassung mit einem Aufruf entsteht. Ändert sich eine Formulierung
 * oder ein Wert, laufen alle Sprachen neu.
 *
 * Aufruf:  node build-dtf-anleitung.mjs [zielordner]
 *
 * Schriften: gerendert wird über sharp/librsvg, das SYSTEM-Schriften nutzt —
 * nicht die WOFF2-Dateien des Projekts. Deshalb bewusst Georgia und Arial
 * Black, die unter Windows vorhanden sind.
 */
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const W = 1588
const H = 1270

/** Inhalte je Sprache. Werte bewusst hier oben, nicht im Layout verstreut. */
const CONTENT = {
  de: {
    title: 'DTF AUFBRINGEN – SO GEHT’S',
    steps: [
      'Heißpresse auf 150 °C einstellen.',
      '8 Sekunden pressen.',
      'Sofort abziehen, solange die Folie heiß ist.',
    ],
  },
  en: {
    title: 'HOW TO APPLY DTF',
    steps: [
      'Set your heat press to 300 °F.',
      'Press for 8 seconds.',
      'Peel immediately while the film is still hot.',
    ],
  },
  fr: {
    title: 'APPLIQUER LE DTF',
    steps: [
      'Réglez la presse sur 150 °C.',
      'Pressez 8 secondes.',
      'Retirez le film immédiatement, encore chaud.',
    ],
  },
  it: {
    title: 'APPLICARE IL DTF',
    steps: [
      'Imposta la pressa a 150 °C.',
      'Pressa per 8 secondi.',
      'Rimuovi subito la pellicola, ancora calda.',
    ],
  },
  es: {
    title: 'CÓMO APLICAR EL DTF',
    steps: [
      'Ajusta la plancha a 150 °C.',
      'Prensa durante 8 segundos.',
      'Retira la lámina de inmediato, aún caliente.',
    ],
  },
}

const BG = '#33363a'
const CIRCLE = '#dcdcdc'
const INK = '#15171a'

/** Feines Raster im Hintergrund — Struktur, ohne vom Text abzulenken. */
function grid() {
  let out = ''
  for (let x = 0; x <= W; x += 132) {
    out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1.5"/>`
  }
  for (let y = 0; y <= H; y += 132) {
    out += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1.5"/>`
  }
  // Zwei weich geschwungene Linien, damit die Fläche nicht rein technisch wirkt.
  out += `<path d="M-40 ${H * 0.32} C ${W * 0.3} ${H * 0.2}, ${W * 0.66} ${H * 0.46}, ${W + 40} ${H * 0.3}"
      fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="3"/>`
  out += `<path d="M-40 ${H * 0.72} C ${W * 0.28} ${H * 0.62}, ${W * 0.7} ${H * 0.86}, ${W + 40} ${H * 0.68}"
      fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="3"/>`
  return out
}

/**
 * Symbole aus lucide-react (ISC), das bereits im Projekt liegt. Bewusst nicht
 * selbst gezeichnet: Handgemalte SVG-Pfade sahen bei dieser Größe wie
 * Basteleien aus, und ein Listing-Bild verzeiht das nicht.
 *
 * Lucide zeichnet auf 24x24 mit Strichstärke 2. Der Wrapper skaliert das in
 * den Kreis und dickt den Strich passend auf.
 */
const LUCIDE = {
  thermometer: [['path', 'M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z']],
  timer: [
    ['line', '10,2,14,2'],
    ['line', '12,14,15,11'],
    ['circle', '12,14,8'],
  ],
  hand: [
    ['path', 'M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2'],
    ['path', 'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2'],
    ['path', 'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8'],
    ['path', 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'],
  ],
}

function lucide(name, cx, cy, size) {
  const k = size / 24
  const parts = LUCIDE[name]
    .map(([kind, d]) => {
      if (kind === 'path') return `<path d="${d}"/>`
      if (kind === 'line') { const [x1, y1, x2, y2] = d.split(','); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>` }
      const [ccx, ccy, r] = d.split(',')
      return `<circle cx="${ccx}" cy="${ccy}" r="${r}"/>`
    })
    .join('')
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${k})"
    fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${parts}</g>`
}

const ICON_NAMES = ['thermometer', 'timer', 'hand']

function buildSvg(locale) {
  const c = CONTENT[locale]
  if (!c) throw new Error(`Keine Inhalte für ${locale}`)

  const titleY = 130
  const ruleY = 186
  // Drei Zeilen, Symbol abwechselnd links und rechts — wie in der Vorlage,
  // weil das Auge dadurch von Schritt zu Schritt geführt wird.
  const rows = [0, 1, 2].map((i) => {
    const left = i % 2 === 0
    const cy = 380 + i * 300
    const circleX = left ? 300 : W - 300
    // Auf dem Kreisrand bei 45°, halb innen halb außen — wie in der Vorlage.
    const badgeX = circleX + (left ? -1 : 1) * 150 * 0.72
    const badgeY = cy - 150 * 0.72
    const textX = left ? circleX + 230 : circleX - 230
    const anchor = left ? 'start' : 'end'
    const text = c.steps[i]
    // Umbruch bei langen Sätzen: höchstens 34 Zeichen je Zeile.
    const words = text.split(' ')
    const lines = []
    let cur = ''
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > 34) { lines.push(cur.trim()); cur = w }
      else cur += ' ' + w
    }
    if (cur.trim()) lines.push(cur.trim())
    const lineH = 62
    const startY = cy - ((lines.length - 1) * lineH) / 2 + 16

    return `
      <circle cx="${circleX}" cy="${cy}" r="150" fill="${CIRCLE}" stroke="${INK}" stroke-width="7"/>
      ${lucide(ICON_NAMES[i], circleX, cy, 168)}
      <circle cx="${badgeX}" cy="${badgeY}" r="58" fill="#ffffff" stroke="${INK}" stroke-width="7"/>
      <text x="${badgeX}" y="${badgeY + 22}" font-family="Georgia, 'Times New Roman', serif"
            font-size="62" font-weight="bold" fill="${INK}" text-anchor="middle">${i + 1}</text>
      ${lines
        .map(
          (l, j) =>
            `<text x="${textX}" y="${startY + j * lineH}" font-family="Georgia, 'Times New Roman', serif"
                   font-size="52" font-weight="bold" fill="#ffffff" text-anchor="${anchor}">${escapeXml(l)}</text>`,
        )
        .join('')}
    `
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${BG}"/>
    ${grid()}
    <text x="${W / 2}" y="${titleY}" font-family="Arial Black, Arial, sans-serif" font-size="76"
          fill="#ffffff" text-anchor="middle" letter-spacing="6">${escapeXml(c.title)}</text>
    <line x1="90" y1="${ruleY}" x2="${W - 90}" y2="${ruleY}" stroke="#ffffff" stroke-width="4"/>
    ${rows.join('')}
  </svg>`
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const outDir = process.argv[2] ?? '.'
const locales = ['de', 'en', 'fr', 'it', 'es']

for (const loc of locales) {
  const svg = buildSvg(loc)
  writeFileSync(`${outDir}/dtf-anleitung-${loc}.svg`, svg)
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`${outDir}/dtf-anleitung-${loc}.png`)
  console.log(`${loc}: ${W}x${H}`)
}
