import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GtmScript, GtmNoscript } from "@/components/analytics/GtmScript";
import { ConsentBanner } from "@/components/consent/ConsentBanner";

export const metadata: Metadata = {
  title: 'petite-moment',
  description: 'Kartenposter für Erinnerungen, die bleiben.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <GtmScript />
      </head>
      <body className="antialiased">
        <GtmNoscript />
        {children}
        <ConsentBanner />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
