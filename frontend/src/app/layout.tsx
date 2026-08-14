import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Geo-Kurdistan",
    template: "%s | Geo-Kurdistan",
  },
  description:
    "A geological knowledge platform for the Kurdistan Region. Visitor showcase in development.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
