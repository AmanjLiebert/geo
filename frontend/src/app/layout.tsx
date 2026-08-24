import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Geo-Kurdistan",
    template: "%s | Geo-Kurdistan",
  },
  description:
    "Explore the rocks, formations, fossils, landscapes and geological research of the Kurdistan Region.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><SiteHeader />{children}<SiteFooter /></body>
    </html>
  );
}
