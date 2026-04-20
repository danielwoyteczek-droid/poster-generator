import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const styleId = p.get('styleId')
  const lng = p.get('lng')
  const lat = p.get('lat')
  const zoom = p.get('zoom')
  const width = p.get('width')
  const height = p.get('height')
  const retina = p.get('retina') === '1'

  if (!styleId || !lng || !lat || !zoom || !width || !height) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const apiKey = process.env.MAPTILER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 })
  }

  const suffix = retina ? '@2x' : ''
  const url = `https://api.maptiler.com/maps/${styleId}/static/${lng},${lat},${zoom}/${width}x${height}${suffix}.png?key=${apiKey}&attribution=false`

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    return NextResponse.json({ error: 'MapTiler error', detail: text }, { status: 502 })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
