import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import "@solana/wallet-adapter-react-ui/styles.css"
import { Navigation } from "@/components/navigation"
import { Providers } from "@/components/providers"
import { SolanaProvider } from "./provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Magical Headlines - Where Headlines Becomes Tradable",
  description: "Speculate on attention, profit from trends. Trade headline tokens in a revolutionary news marketplace.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">
        <SolanaProvider>
          <Providers>
            <Navigation />
            {children}
          </Providers>
        </SolanaProvider>
      </body>
    </html>
  )
}
