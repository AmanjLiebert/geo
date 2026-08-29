import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
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
    <html lang="en" data-scroll-behavior="smooth" className={`${archivo.variable} ${plexMono.variable}`}>
      <body><SiteHeader />{children}<SiteFooter /></body>
    </html>
  );
}
