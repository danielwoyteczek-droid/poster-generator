import { useTranslations } from 'next-intl'
import { Map, Type, Printer, Download } from 'lucide-react'

export function FeaturesSection() {
  const t = useTranslations('features')
  const items = [
    { icon: Map, title: t('f1Title'), description: t('f1Description') },
    { icon: Type, title: t('f2Title'), description: t('f2Description') },
    { icon: Printer, title: t('f3Title'), description: t('f3Description') },
    { icon: Download, title: t('f4Title'), description: t('f4Description') },
  ]
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {t('heading')}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="flex flex-col items-start">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
