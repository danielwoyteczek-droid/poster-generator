'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  approveScenarioAsPlan as apiApproveAsPlan,
  createScenario as apiCreate,
  deleteScenario as apiDelete,
  loadActivePlan,
  loadScenarios,
  updateScenario as apiUpdate,
} from '@/lib/business-case/storage'
import type { BusinessPlan, Scenario, ScenarioData } from '@/lib/business-case/types'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useBusinessScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activePlan, setActivePlan] = useState<BusinessPlan | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const debounceRef = useRef<number | null>(null)
  const savedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadScenarios(), loadActivePlan()])
      .then(([list, plan]) => {
        if (cancelled) return
        setScenarios(list)
        setActivePlan(plan)
        setHydrated(true)
      })
      .catch((err) => {
        if (cancelled) return
        toast.error(`Laden fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
        setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const create = useCallback(async (name: string, cloneFromId?: string): Promise<Scenario | null> => {
    try {
      const created = await apiCreate(name, cloneFromId)
      setScenarios((prev) => [created, ...prev])
      toast.success(cloneFromId ? 'Szenario dupliziert' : `Szenario „${name}" angelegt`)
      return created
    } catch (err) {
      toast.error(`Erstellen fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }, [])

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiDelete(id)
      setScenarios((prev) => prev.filter((s) => s.id !== id))
      toast.success('Szenario gelöscht')
      return true
    } catch (err) {
      toast.error(`Löschen fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }, [])

  const rename = useCallback(async (id: string, name: string): Promise<boolean> => {
    try {
      const updated = await apiUpdate(id, { name })
      setScenarios((prev) => prev.map((s) => (s.id === id ? updated : s)))
      toast.success('Szenario umbenannt')
      return true
    } catch (err) {
      toast.error(`Umbenennen fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }, [])

  const updateData = useCallback((id: string, data: ScenarioData) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, data, updatedAt: new Date().toISOString() } : s)),
    )
    setSaveState('saving')
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      try {
        const updated = await apiUpdate(id, { data })
        setScenarios((prev) => prev.map((s) => (s.id === id ? updated : s)))
        setSaveState('saved')
        if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
        savedTimerRef.current = window.setTimeout(() => setSaveState('idle'), 1500)
      } catch (err) {
        setSaveState('error')
        toast.error(`Speichern fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
      }
    }, 500)
  }, [])

  const approveAsPlan = useCallback(async (scenarioId: string): Promise<BusinessPlan | null> => {
    try {
      const plan = await apiApproveAsPlan(scenarioId)
      setActivePlan(plan)
      toast.success('Szenario als aktiver Plan verabschiedet')
      return plan
    } catch (err) {
      toast.error(`Verabschieden fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }, [])

  const refreshActivePlan = useCallback(async () => {
    try {
      const plan = await loadActivePlan()
      setActivePlan(plan)
    } catch (err) {
      toast.error(`Plan-Abruf fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
    }
  }, [])

  return {
    scenarios,
    activePlan,
    hydrated,
    saveState,
    create,
    remove,
    rename,
    updateData,
    approveAsPlan,
    refreshActivePlan,
  }
}
