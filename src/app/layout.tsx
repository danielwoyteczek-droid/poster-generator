import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GtmNoscript } from "@/components/analytics/GtmScript";
import { ConsentBanner } from "@/components/consent/ConsentBanner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://petite-moment.com'),
  title: {
    default: 'petite-moment — Kartenposter für Erinnerungen, die bleiben',
    template: '%s | petite-moment',
  },
  description: 'Personalisierte Karten- und Sternenposter. Suche einen Ort, wähle Stil und Format, ergänze deinen Text — wir drucken es für dich in Deutschland.',
  openGraph: {
    title: 'petite-moment — Kartenposter für besondere Orte',
    description: 'Personalisierte Karten- und Sternenposter aus München. Gestalte einen Ort, der dir wichtig ist.',
    url: 'https://petite-moment.com',
    siteName: 'petite-moment',
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'petite-moment',
    description: 'Personalisierte Karten- und Sternenposter.',
  },
  icons: {
    icon: '/brand/logo_1024x1024.svg',
  },
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale is read from the request inside the [locale] segment via
  // next-intl. For routes that live outside the prefix (api, auth,
  // private, studio) the html lang stays at the project default.
  const { getLocale } = await import('next-intl/server')
  const locale = await getLocale().catch(() => 'de')
  return (
    <html lang={locale} className={`${cormorant.variable} ${inter.variable}`}>
      <body className="antialiased font-sans bg-background text-foreground">
        {GTM_ID && (
          <>
            <Script id="gtm-consent-defaults" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('consent', 'default', {
                  'ad_storage': 'denied',
                  'ad_user_data': 'denied',
                  'ad_personalization': 'denied',
                  'analytics_storage': 'denied',
                  'wait_for_update': 500
                });
              `}
            </Script>
            <Script id="gtm-init" strategy="afterInteractive">
              {`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `}
            </Script>
          </>
        )}
        <GtmNoscript />
        {children}
        <ConsentBanner />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
