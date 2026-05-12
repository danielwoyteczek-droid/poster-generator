'use client'

/**
 * Editor-only design aid: centre-cross + rule-of-thirds grid overlaid on
 * the live canvas. Rendered absolutely on top of the poster, with
 * pointer-events disabled so it never steals drags from the map or
 * text overlays. The toggle lives in useEditorStore.gridVisible.
 */
export function GridOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      aria-hidden
    >
      {/* Rule-of-thirds lines — light grey, thin */}
      <g stroke="rgba(0, 0, 0, 0.18)" strokeWidth="0.15" strokeDasharray="0.8 0.6" fill="none">
        <line x1="33.333" y1="0" x2="33.333" y2="100" />
        <line x1="66.667" y1="0" x2="66.667" y2="100" />
        <line x1="0" y1="33.333" x2="100" y2="33.333" />
        <line x1="0" y1="66.667" x2="100" y2="66.667" />
      </g>
      {/* Centre cross — slightly heavier, solid, for the primary "what's in
          the middle" question */}
      <g stroke="rgba(0, 0, 0, 0.35)" strokeWidth="0.2" fill="none">
        <line x1="50" y1="0" x2="50" y2="100" />
        <line x1="0" y1="50" x2="100" y2="50" />
      </g>
    </svg>
  )
}
