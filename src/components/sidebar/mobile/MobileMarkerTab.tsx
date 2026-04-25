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
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Marker-Pin
        </Label>

        <div className="flex items-center justify-between">
          <Label htmlFor="mobile-marker-switch" className="text-sm text-foreground/70 cursor-pointer">
            Marker anzeigen
          </Label>
          <Switch
            id="mobile-marker-switch"
            checked={marker.enabled}
            onCheckedChange={(enabled) =>
              enabled && !marker.enabled
                ? // Re-activating: snap pin back to default center so it is
                  // guaranteed visible if a prior map pan/zoom pushed the
                  // stored lat/lng off-canvas.
                  setMarker({ enabled: true, lat: null, lng: null })
                : setMarker({ enabled })
            }
          />
        </div>

        {marker.enabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-16 shrink-0">Typ</Label>
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
              <Label className="text-sm text-muted-foreground w-16 shrink-0">Farbe</Label>
              <input
                type="color"
                value={marker.color}
                onChange={(e) => setMarker({ color: e.target.value })}
                className="flex-1 h-11 rounded-md border border-border cursor-pointer px-1"
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Zweiter Marker-Pin
            </Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="mobile-second-marker-switch" className="text-sm text-foreground/70 cursor-pointer">
                Zweiten Marker anzeigen
              </Label>
              <Switch
                id="mobile-second-marker-switch"
                checked={secondMarker.enabled}
                onCheckedChange={(enabled) =>
                  enabled && !secondMarker.enabled
                    ? setSecondMarker({ enabled: true, lat: null, lng: null })
                    : setSecondMarker({ enabled })
                }
              />
            </div>

            {secondMarker.enabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground w-16 shrink-0">Typ</Label>
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
                  <Label className="text-sm text-muted-foreground w-16 shrink-0">Farbe</Label>
                  <input
                    type="color"
                    value={secondMarker.color}
                    onChange={(e) => setSecondMarker({ color: e.target.value })}
                    className="flex-1 h-11 rounded-md border border-border cursor-pointer px-1"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Hint if split mode isn't active */}
      {!secondMarkerVisible && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Ein zweiter Marker wird verfügbar, sobald im Karte-Tab „Zweite Karte" aktiviert ist.
        </p>
      )}
    </div>
  )
}
