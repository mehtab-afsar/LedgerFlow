import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * Plex is a document-grade industrial sans: holds up at 12px on an office
 * monitor, and its mono companion gives tabular figures for invoice numbers,
 * GSTINs and amounts.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LedgerFlow — invoicing and receivables for logistics businesses",
    template: "%s · LedgerFlow",
  },
  description:
    "Bill any party, collect payments, and always know what's outstanding — without a dispatch system you don't need.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
