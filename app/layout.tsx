import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";

const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.ttf",
  weight: "300 900",
  display: "swap",
  variable: "--font-satoshi",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Polyshield — Secure every AI agent action before it happens",
  description:
    "Polyshield routes agent tool calls through policies, approvals, credential isolation, and audit logs so agents can work without going rogue.",
  icons: {
    icon: "/polyshield_logo_nobg.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${satoshi.variable} ${instrumentSerif.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
