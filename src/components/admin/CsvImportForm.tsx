'use client'

import { useState } from 'react'
import { Loader2, Upload, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ValidRow {
  rowNumber: number
  name: string
  master: string
  location: string
}

interface InvalidRow {
  rowNumber: number
  name: string
  errors: string[]
}

interface DryRunResult {
  total: number
  valid_count: number
  invalid_count: number
  valid: ValidRow[]
  invalid: InvalidRow[]
}

const EXAMPLE_CSV = `name,master_preset_slug,location_lat,location_lng,location_name,target_locales,occasions,mockup_set_slugs,text_main,text_sub
Berlin Master-Pink,Pink London,52.5200,13.4050,Berlin,"de,en",heimat,wohnzimmer-holz,Berlin,Berlin · 52° 31' N · 13° 24' E
Hamburg Master-Pink,Pink London,53.5511,9.9937,Hamburg,de,heimat,wohnzimmer-holz,Hamburg,Hamburg · 53° 33' N · 9° 59' E
München Master-Pink,Pink London,48.1351,11.5820,München,de,heimat,wohnzimmer-holz,München,München · 48° 8' N · 11° 34' E
`

export function CsvImportForm() {
  const [csvText, setCsvText] = useState('')
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)

  const onFile = async (file: File) => {
    const text = await file.text()
    setCsvText(text)
    setDryRunResult(null)
  }

  const runDryRun = async () => {
    if (!csvText.trim()) { toast.error('Erst CSV-Inhalt eintragen oder Datei hochladen'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/presets/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_text: csvText, dry_run: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Validierung fehlgeschlagen')
        return
      }
      setDryRunResult(data)
    } finally {
      setSubmitting(false)
    }
  }

  const runImport = async () => {
    if (!dryRunResult || dryRunResult.valid_count === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/admin/presets/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_text: csvText, dry_run: false }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Import fehlgeschlagen')
        return
      }
      toast.success(`${data.created_count} Preset${data.created_count === 1 ? '' : 's'} angelegt`, {
        description: data.invalid_count > 0 ? `${data.invalid_count} Zeile(n) wurden übersprungen.` : undefined,
      })
      setCsvText('')
      setDryRunResult(null)
    } finally {
      setImporting(false)
    }
  }

  const downloadExample = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'preset-import-example.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-semibold mb-1">CSV-Format</h2>
            <p className="text-sm text-muted-foreground">
              Pflichtspalten: <code className="text-xs">name, master_preset_slug, location_lat, location_lng, location_name,
              target_locales, occasions, mockup_set_slugs</code>. Optional: <code className="text-xs">text_main, text_sub</code>.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>master_preset_slug</strong> ist der exakte Name eines bestehenden Presets, dessen Design (Style/Palette/Frame/Layout)
              geklont wird. Pro Zeile entsteht 1 neues Preset im Status „draft" mit <code className="text-xs">render_status=pending</code>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadExample}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Beispiel-CSV
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">CSV-Datei hochladen</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Oder direkt einfügen</label>
          <Textarea
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setDryRunResult(null) }}
            rows={6}
            placeholder="name,master_preset_slug,location_lat,location_lng,..."
            className="font-mono text-xs"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={runDryRun} disabled={submitting || !csvText.trim()}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Validieren
          </Button>
        </div>
      </div>

      {dryRunResult && (
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold">Validierungs-Report</h2>
              <p className="text-sm text-muted-foreground">
                {dryRunResult.total} Zeile(n) geprüft — {dryRunResult.valid_count} gültig, {dryRunResult.invalid_count} mit Fehler.
              </p>
            </div>
            {dryRunResult.valid_count > 0 && (
              <Button onClick={runImport} disabled={importing}>
                {importing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {dryRunResult.valid_count} gültige Zeile{dryRunResult.valid_count === 1 ? '' : 'n'} importieren
              </Button>
            )}
          </div>

          {dryRunResult.invalid.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-1.5 text-red-700">
                <AlertCircle className="w-4 h-4" />
                Fehlerhafte Zeilen ({dryRunResult.invalid.length})
              </h3>
              <div className="rounded border border-red-200 bg-red-50 divide-y divide-red-200 text-sm">
                {dryRunResult.invalid.map((i) => (
                  <div key={i.rowNumber} className="px-3 py-2">
                    <div className="font-medium">Zeile {i.rowNumber}: „{i.name || '(kein Name)'}"</div>
                    <ul className="mt-0.5 list-disc list-inside text-xs text-red-700">
                      {i.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dryRunResult.valid.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                Gültige Zeilen ({dryRunResult.valid.length})
              </h3>
              <div className="rounded border border-green-200 bg-green-50 max-h-72 overflow-y-auto divide-y divide-green-200 text-sm">
                {dryRunResult.valid.map((v) => (
                  <div key={v.rowNumber} className="px-3 py-1.5 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">Z. {v.rowNumber}</span>
                    <span className="flex-1 font-medium truncate">{v.name}</span>
                    <span className="text-xs text-muted-foreground">{v.master} → {v.location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
