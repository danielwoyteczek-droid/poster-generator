// PROJ-56: gemeinsame Schemas der Vorlagen-Endpunkte.

import { z } from 'zod'

export const TEMPLATE_COLUMNS = 'id, name, entries, updated_at'

export const EntriesSchema = z
  .array(z.object({ mockup_set_id: z.string().uuid(), overlay_id: z.string().uuid().nullable() }))
  .min(1, 'Eine Vorlage braucht mindestens ein Mockup')
  .max(20, 'Höchstens 20 Mockups pro Vorlage')

export const TemplateNameSchema = z.string().trim().min(1, 'Name fehlt').max(80, 'Name ist zu lang')

/** Postgres unique_violation (Name bereits vergeben, case-insensitive) */
export function isDuplicateName(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}
