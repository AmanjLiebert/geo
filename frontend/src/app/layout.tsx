import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, IBM_Plex_Mono } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const readableSans = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-readable-sans",
  display: "swap",
  adjustFontFallback: false,
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Geo-Kurdistan",
    template: "%s | Geo-Kurdistan",
  },
  description:
    "Explore the rocks, formations, fossils, landscapes and geological research of the Kurdistan Region.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/brand/geo-kurdistan-mark-v2.png",
    apple: "/brand/geo-kurdistan-mark-v2.png",
  },
  openGraph: {
    title: "Geo-Kurdistan — Read the Ground",
    description: "Explore the rocks, fossils, minerals, formations, places and research of Kurdistan.",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Geo-Kurdistan — Read the ground" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Geo-Kurdistan — Read the Ground",
    description: "Explore the rocks, fossils, minerals, formations, places and research of Kurdistan.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${readableSans.variable} ${plexMono.variable}`}>
      <body><AuthProvider><SiteHeader />{children}<SiteFooter /></AuthProvider></body>
    </html>
  );
}
