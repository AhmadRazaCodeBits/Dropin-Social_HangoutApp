import { Space_Grotesk, Manrope } from "next/font/google"
import "./globals.css"
import { LocationGate } from "@/components/LocationGate"

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata = {
  title: "DropIn — Hang out in 30 seconds",
  description:
    "DropIn is a spontaneous social hangout app. Broadcast your vibe, find nearby friends, let AI pick the perfect spot, and meet right now. No scheduling.",
  keywords: ["hangout", "social", "spontaneous", "meetup", "friends", "nearby", "real-time"],
  authors: [{ name: "DropIn" }],
  openGraph: {
    title: "DropIn — Hang out in 30 seconds",
    description: "Broadcast your vibe, find friends nearby, and meet right now.",
    type: "website",
    siteName: "DropIn",
  },
  twitter: {
    card: "summary_large_image",
    title: "DropIn — Hang out in 30 seconds",
    description: "Broadcast your vibe, find friends nearby, and meet right now.",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f121a",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <LocationGate>{children}</LocationGate>
      </body>
    </html>
  )
}
