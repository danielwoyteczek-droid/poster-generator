'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Upload, Trash2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'

interface CustomMaskRow {
  id: string
  mask_key: string
  label: string
  mask_svg_url: string
  shape_viewbox: string | null
  shape_markup: string | null
  created_at: string
}

export function AdminMasksList() {
  const [masks, setMasks] = useState<CustomMaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('')
  const [maskFile, setMaskFile] = useState<File | null>(null)

  const fetchMasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/masks')
    const data = await res.json()
    if (res.ok) setMasks(data.masks ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMasks() }, [fetchMasks])

  const handleUpload = async () => {
    if (!label.trim() || !maskFile) {
      toast.error('Name und Masken-SVG erforderlich')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('label', label.trim())
      form.append('mask_svg', maskFile)
      const res = await fetch('/api/admin/masks', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload fehlgeschlagen')
      invalidateCustomMasksCache()
      await fetchMasks()
      toast.success('Maske hinzugefügt')
      setUploadOpen(false)
      setLabel('')
      setMaskFile(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/masks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      invalidateCustomMasksCache()
      setMasks((prev) => prev.filter((m) => m.id !== id))
      toast.success('Maske gelöscht')
    } else {
      toast.error('Löschen fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" />
          Lade reine Form-SVGs hoch (nur `&lt;circle&gt;`, `&lt;path&gt;` etc., ohne Rahmen oder Opacity). Alles andere wird im Editor gesteuert.
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Neue Maske
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Form hochladen</DialogTitle>
              <DialogDescription>
                Lade eine reine Form-SVG hoch. Außenbereich, Rahmen und Opacity werden im Editor gesteuert — nicht in der SVG selbst.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="mask-label">Name</Label>
                <Input
                  id="mask-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="z.B. Stern, Oval, Wellen-Form"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mask-svg">Form-SVG</Label>
                <Input
                  id="mask-svg"
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => setMaskFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground/70 leading-snug">
                  viewBox muss gesetzt sein (z.B. 0 0 595.3 841.9 für A4-Proportion).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Abbrechen
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !label.trim() || !maskFile}>
                {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                Hochladen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-border p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/70" />
        </div>
      ) : masks.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          Noch keine eigenen Masken. Lade deine erste hoch.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {masks.map((mask) => (
            <div key={mask.id} className="rounded-xl bg-white border border-border overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mask.mask_svg_url} alt={mask.label} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{mask.label}</h3>
                  <p className="text-[10px] text-muted-foreground/70 font-mono truncate">{mask.mask_key}</p>
                  {mask.shape_markup && (
                    <span className="inline-block mt-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                      ready
                    </span>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground/70 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Maske löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        „{mask.label}" wird dauerhaft entfernt. Presets, die diese Maske nutzen, werden
                        beim Kunden als leere Form dargestellt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(mask.id)} className="bg-red-600 hover:bg-red-700">
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
