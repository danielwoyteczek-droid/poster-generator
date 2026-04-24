'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/hooks/useEditorStore'

export function MobileMarkerTab() {
  const { marker, secondMarker, splitMode, setMarker, setSecondMarker } = useEditorStore()
  const secondMarkerVisible = splitMode === 'second-map'

  return (
    <div className="space-y-5 p-4">
      {/* Primary marker */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Marker-Pin
        </Label>

        <div className="flex items-center justify-between">
          <Label htmlFor="mobile-marker-switch" className="text-sm text-gray-700 cursor-pointer">
            Marker anzeigen
          </Label>
          <Switch
            id="mobile-marker-switch"
            checked={marker.enabled}
            onCheckedChange={(enabled) => setMarker({ enabled })}
          />
        </div>

        {marker.enabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-gray-600 w-16 shrink-0">Typ</Label>
              <Select
                value={marker.type}
                onValueChange={(type: 'classic' | 'heart') => setMarker({ type })}
              >
                <SelectTrigger className="flex-1 h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Klassisch</SelectItem>
                  <SelectItem value="heart">Herz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm text-gray-600 w-16 shrink-0">Farbe</Label>
              <input
                type="color"
                value={marker.color}
                onChange={(e) => setMarker({ color: e.target.value })}
                className="flex-1 h-11 rounded-md border border-gray-200 cursor-pointer px-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Secondary marker — only visible when split-map mode is active */}
      {secondMarkerVisible && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Zweiter Marker-Pin
            </Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="mobile-second-marker-switch" className="text-sm text-gray-700 cursor-pointer">
                Zweiten Marker anzeigen
              </Label>
              <Switch
                id="mobile-second-marker-switch"
                checked={secondMarker.enabled}
                onCheckedChange={(enabled) => setSecondMarker({ enabled })}
              />
            </div>

            {secondMarker.enabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-gray-600 w-16 shrink-0">Typ</Label>
                  <Select
                    value={secondMarker.type}
                    onValueChange={(type: 'classic' | 'heart') => setSecondMarker({ type })}
                  >
                    <SelectTrigger className="flex-1 h-11 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Klassisch</SelectItem>
                      <SelectItem value="heart">Herz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="text-sm text-gray-600 w-16 shrink-0">Farbe</Label>
                  <input
                    type="color"
                    value={secondMarker.color}
                    onChange={(e) => setSecondMarker({ color: e.target.value })}
                    className="flex-1 h-11 rounded-md border border-gray-200 cursor-pointer px-1"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Hint if split mode isn't active */}
      {!secondMarkerVisible && (
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Ein zweiter Marker wird verfügbar, sobald im Karte-Tab „Zweite Karte" aktiviert ist.
        </p>
      )}
    </div>
  )
}
