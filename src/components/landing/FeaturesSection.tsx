import { Map, Type, Printer, Download } from 'lucide-react'

const FEATURES = [
  {
    icon: Map,
    title: 'Jeder Ort der Welt',
    description: 'Suche jeden Ort, zoome und panne die Karte bis der Ausschnitt perfekt sitzt.',
  },
  {
    icon: Type,
    title: 'Dein Text, dein Stil',
    description: 'Füge Titel, Namen oder Koordinaten hinzu und wähle aus verschiedenen Schriftarten.',
  },
  {
    icon: Printer,
    title: 'Druckfertige Formate',
    description: 'A4 und A3 — alle Formate werden in voller Druckauflösung (300 dpi) exportiert.',
  },
  {
    icon: Download,
    title: 'Sofort verfügbar',
    description: 'Lade dein Poster als PNG oder PDF herunter, oder bestelle es direkt gedruckt und gerahmt.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Alles, was du brauchst
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
            Von der Kartenauswahl bis zum fertigen Druck — in wenigen Minuten.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="flex flex-col items-start">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
