interface Props {
  pageTitle: string
  pageSubline?: string
}

/**
 * PROJ-42 Stadt-Seiten-Hero — text-only Hero (kein redaktionelles Bild,
 * weil das visuelle Asset der Style-Picker ist, der direkt darunter
 * gerendert wird). Hält die LP-Hierarchie sauber: H1 + Subline → 3 Render-
 * Cards → Body.
 */
export function CityHero({ pageTitle, pageSubline }: Props) {
  return (
    <section className="bg-muted py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
          {pageTitle}
        </h1>
        {pageSubline && (
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            {pageSubline}
          </p>
        )}
      </div>
    </section>
  )
}
