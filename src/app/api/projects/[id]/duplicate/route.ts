import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: original, error: readErr } = await supabase
    .from('projects')
    .select('title, location_name, config_json, preview_image_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (readErr || !original) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const { data: created, error: insertErr } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: `${original.title ?? 'Poster'} (Kopie)`,
      location_name: original.location_name,
      config_json: original.config_json,
      preview_image_url: original.preview_image_url,
      is_locked: false,
    })
    .select('id, title')
    .single()

  if (insertErr || !created) {
    return NextResponse.json({ error: insertErr?.message || 'Fehler' }, { status: 500 })
  }

  return NextResponse.json({ id: created.id, title: created.title })
}
