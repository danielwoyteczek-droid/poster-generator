import { z } from 'zod'
import { locales } from '@/i18n/config'

export const LocaleSchema = z.enum(locales)

export const TargetLocalesSchema = z
  .array(LocaleSchema)
  .refine((arr) => new Set(arr).size === arr.length, {
    message: 'target_locales darf keine doppelten Einträge enthalten',
  })

export const TargetLocalesNonEmptySchema = TargetLocalesSchema.min(1, {
  message: 'Mindestens eine Locale muss ausgewählt sein',
})
