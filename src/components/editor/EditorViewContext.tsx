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
 * classification or view — the Sheet UI isn't used by admin.
 */
export function shouldRenderControl(opts: {
  view: EditorView
  isAdmin: boolean
  classification: ControlClass
}): boolean {
  const { view, isAdmin, classification } = opts
  if (isAdmin) return true
  if (classification === 'admin-only') return false
  if (view === 'customer') return classification === 'customer-min'
  if (view === 'anpassen') return classification === 'anpassen'
  return false
}
