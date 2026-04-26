'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBusinessScenarios } from '@/hooks/useBusinessScenarios'
import { ScenarioList } from './business-case/ScenarioList'
import { ScenarioEditor } from './business-case/ScenarioEditor'
import { ScenarioComparison } from './business-case/ScenarioComparison'
import { PlanVsActuals } from './business-case/PlanVsActuals'
import type { ScenarioData } from '@/lib/business-case/types'

type Tab = 'scenarios' | 'editor' | 'comparison' | 'plan-vs-ist'

export function BusinessCenterShell() {
  const {
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
  } = useBusinessScenarios()
  const [tab, setTab] = useState<Tab>('scenarios')
  const [editorId, setEditorId] = useState<string | null>(null)

  const editing = scenarios.find((s) => s.id === editorId) ?? null
  const activePlanScenarioId = activePlan?.sourceScenarioId ?? null

  function openScenario(id: string) {
    setEditorId(id)
    setTab('editor')
  }

  function backToList() {
    setEditorId(null)
    setTab('scenarios')
  }

  async function handleCreate(name: string, cloneFromId?: string) {
    const created = await create(name, cloneFromId)
    if (created) openScenario(created.id)
  }

  async function handleApproveAsPlan() {
    if (!editing) return
    const plan = await approveAsPlan(editing.id)
    if (plan) setTab('plan-vs-ist')
  }

  if (!hydrated) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Lade Szenarien …
      </div>
    )
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
      <TabsList>
        <TabsTrigger value="scenarios">Szenarien</TabsTrigger>
        <TabsTrigger value="editor" disabled={!editing}>Editor</TabsTrigger>
        <TabsTrigger value="comparison">Vergleich</TabsTrigger>
        <TabsTrigger value="plan-vs-ist">Plan vs Ist</TabsTrigger>
      </TabsList>

      <TabsContent value="scenarios" className="mt-6">
        <ScenarioList
          scenarios={scenarios}
          activePlanScenarioId={activePlanScenarioId}
          onCreate={handleCreate}
          onDelete={remove}
          onRename={rename}
          onOpen={openScenario}
        />
      </TabsContent>

      <TabsContent value="editor" className="mt-6">
        {editing ? (
          <ScenarioEditor
            scenario={editing}
            saveState={saveState}
            onChange={(data: ScenarioData) => updateData(editing.id, data)}
            onBack={backToList}
            onApproveAsPlan={handleApproveAsPlan}
            isActivePlan={editing.id === activePlanScenarioId}
          />
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Wähle ein Szenario in der Liste, um es zu bearbeiten.
          </div>
        )}
      </TabsContent>

      <TabsContent value="comparison" className="mt-6">
        <ScenarioComparison scenarios={scenarios} />
      </TabsContent>

      <TabsContent value="plan-vs-ist" className="mt-6">
        <PlanVsActuals plan={activePlan} onPlanChange={refreshActivePlan} />
      </TabsContent>
    </Tabs>
  )
}
