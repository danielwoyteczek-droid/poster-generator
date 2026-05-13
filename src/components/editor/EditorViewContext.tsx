'use client'

import { createContext, useContext } from 'react'

/**
 * PROJ-36: Customer-First Sidebar.
 *
 * Two views of the same sidebar tab content:
 * - `customer`: main sidebar for non-admin users — shows ONLY Customer-Min controls
 * - `anpassen`: inside the Anpassen-Sheet — shows ONLY Anpassen controls
 *
 * Admin bypasses both: sees every control (Customer-Min + Anpassen + Admin-only)
 * flat in the main sidebar. The Sheet is never rendered for admin.
 */
export type EditorView = 'customer' | 'anpassen'

export type ControlClass = 'customer-min' | 'anpassen' | 'admin-only'

const EditorViewContext = createContext<EditorView>('customer')

export const EditorViewProvider = EditorViewContext.Provider

export function useEditorView(): EditorView {
  return useContext(EditorViewContext)
}

/**
 * Decide whether a control with the given classification should render in the
 * current view. Admin bypasses the gate and sees every control regardless of
 * classification or view.
 *
 * View semantics (additive, 2026-05-13 pivot):
 * - `customer`: only customer-min controls (default — „Erweiterte Optionen" off)
 * - `anpassen`: customer-min + anpassen controls visible (Switch flipped on)
 *   The switch reveals MORE sections inline rather than swapping to a different
 *   view. Admin-only controls always stay hidden for non-admins regardless.
 */
export function shouldRenderControl(opts: {
  view: EditorView
  isAdmin: boolean
  classification: ControlClass
}): boolean {
  const { view, isAdmin, classification } = opts
  if (isAdmin) return true
  if (classification === 'admin-only') return false
  if (classification === 'customer-min') return true
  if (classification === 'anpassen') return view === 'anpassen'
  return false
}
