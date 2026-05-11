interface Props {
  h1: string
  subline?: string
}

/**
 * PROJ-44: Hub-Hero — text-only, kein redaktionelles Bild. Visueller
 * Anker ist das City-Grid darunter (analog Stadt-LP-CityHero-Pattern).
 */
export function HubHero({ h1, subline }: Props) {
  return (
    <section className="bg-muted py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-6 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
          {h1}
        </h1>
        {subline && (
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            {subline}
          </p>
        )}
      </div>
    </section>
  )
}
