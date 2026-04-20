import { NextRequest, NextResponse } from 'next/server'

type MapTilerFeature = {
  id?: string
  place_name?: string
  center?: [number, number]
}

type MapTilerGeocodeResponse = {
  features?: MapTilerFeature[]
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.MAPTILER_API_KEY || process.env.NEXT_PUBLIC_MAPTILER_API_KEY
  const query = request.nextUrl.searchParams.get('query')?.trim()

  if (!apiKey) {
    return NextResponse.json({ error: 'MapTiler API key fehlt.' }, { status: 500 })
  }

  if (!query) {
    return NextResponse.json({ error: 'Bitte einen Ort angeben.' }, { status: 400 })
  }

  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${encodeURIComponent(apiKey)}&limit=5&language=de`
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: `MapTiler Geocoding fehlgeschlagen (${response.status}).` }, { status: 502 })
    }

    const data = (await response.json()) as MapTilerGeocodeResponse
    const features = data.features?.filter((f) => f.center) ?? []

    if (features.length === 0) {
      return NextResponse.json({ error: 'Kein passender Ort gefunden.' }, { status: 404 })
    }

    return NextResponse.json(
      features.map((f) => ({
        id: f.id ?? null,
        place_name: f.place_name ?? query,
        center: f.center,
      }))
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Serverfehler beim Geocoding.', details: error instanceof Error ? error.message : 'Unbekannt' },
      { status: 500 }
    )
  }
}
