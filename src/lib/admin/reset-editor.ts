import { EDITOR_INITIAL_STATE, useEditorStore } from '@/hooks/useEditorStore'
import { getStarMapInitialState, useStarMapStore } from '@/hooks/useStarMapStore'

/**
 * localStorage key written by useProjectSync for guest-session editor drafts.
 * Kept in sync with src/hooks/useProjectSync.ts → LS_KEY.
 */
const GUEST_DRAFT_KEY = 'poster-generator-draft'

/**
 * Admin-only "Editor zurücksetzen"-Aktion (PROJ-9 V1).
 *
 * Leaves untouched on purpose:
 *  - Cart store (`poster-cart`) — user keeps their basket
 *  - Auth session (Supabase)
 *  - Cookie consent
 *  - NEXT_LOCALE cookie
 *  - Server-side projects in Supabase
 *
 * The page reload at the end is intentional: it gives a clean Map / WebGL
 * context, drops in-flight Sanity queries and any cached preset state, and
 * re-runs useProjectSync from scratch. The performance hit is negligible for
 * a rare admin action.
 */
export function resetEditor(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(GUEST_DRAFT_KEY)
    } catch {
      /* private mode / storage disabled — reload still produces a clean state */
    }
  }
  useEditorStore.setState(EDITOR_INITIAL_STATE, /* replace */ false)
  useStarMapStore.setState(getStarMapInitialState(), /* replace */ false)
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
