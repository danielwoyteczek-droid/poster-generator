import { cn } from '@/lib/utils'

interface Props {
  unitAmount: number
  compareAtCents?: number
  className?: string
}

export function DiscountBadge({ unitAmount, compareAtCents, className }: Props) {
  if (!compareAtCents || compareAtCents <= unitAmount) return null
  const percent = Math.round((1 - unitAmount / compareAtCents) * 100)
  if (percent <= 0) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold px-1.5 py-0.5 leading-none',
        className,
      )}
    >
      −{percent} %
    </span>
  )
}
