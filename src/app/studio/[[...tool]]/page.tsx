'use client'

/**
 * Sanity Studio route — embedded via next-sanity's NextStudio.
 * Metadata/viewport live in the sibling layout.tsx (server component).
 * Sanity handles its own authentication (project invites).
 */
import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

export const dynamic = 'force-static'

export default function StudioPage() {
  return <NextStudio config={config} />
}
