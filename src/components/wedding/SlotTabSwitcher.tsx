'use client'

import { useTranslations } from 'next-intl'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SlotIndex } from '@/hooks/useWeddingEditorStore'

/**
 * Drei Tabs am oberen Sidebar-Rand: schalten den aktiven Slot um. Nutzt
 * shadcn-`Tabs` aus dem Parent — der Provider liegt in `WeddingSidebar`,
 * damit Tab-Inhalte (TabsContent) und Tab-Leiste denselben Kontext teilen.
 *
 * Mobile-First: Tabs sind volle Breite, stylistisch konsistent zur
 * Editor-Sidebar-TabsList aus EditorLayout — schmale 10-Höhe-Strip mit
 * Bottom-Border-Active-State.
 */
export function SlotTabSwitcher() {
  const t = useTranslations('wedding')

  const tabs: { value: SlotIndex; label: string }[] = [
    { value: 0, label: t('tabSlot1') },
    { value: 1, label: t('tabSlot2') },
    { value: 2, label: t('tabSlot3') },
  ]

  return (
    <TabsList className="w-full rounded-none border-b border-border bg-white h-10 p-0 gap-0 shrink-0">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={String(tab.value)}
          className="flex-1 h-full rounded-none text-xs font-medium data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white"
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
