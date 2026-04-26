export const fmtEUR = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export const fmtEUR2 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

export const fmtPct = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export const fmtNum = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

export const fmtNum1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export function formatEUR(value: number, decimals: 0 | 2 = 0): string {
  if (!isFinite(value)) return '∞'
  return decimals === 2 ? fmtEUR2.format(value) : fmtEUR.format(value)
}

export function formatPct(value: number): string {
  if (!isFinite(value)) return '—'
  return fmtPct.format(value)
}

export function formatNum(value: number, decimals: 0 | 1 = 0): string {
  if (!isFinite(value)) return '∞'
  return decimals === 1 ? fmtNum1.format(value) : fmtNum.format(value)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
