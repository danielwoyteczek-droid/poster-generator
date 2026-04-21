import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GtmNoscript } from "@/components/analytics/GtmScript";
import { ConsentBanner } from "@/components/consent/ConsentBanner";

export const metadata: Metadata = {
  title: 'petite-moment',
  description: 'Kartenposter für Erinnerungen, die bleiben.',
};

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
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
