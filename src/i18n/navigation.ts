import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Wrappers around Next.js navigation primitives that automatically
 * prepend the active locale. Use these instead of `next/link` and
 * `next/navigation` whenever a route lives inside `[locale]/`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
