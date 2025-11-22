import type { Metadata } from 'next'
import './globals.css'
import { AppLayout } from '@/components/app-layout'
import React from 'react'
import Providers from "@/providers/providers";

export const metadata: Metadata = {
  title: 'Voble',
  description: "Where your vocabulary's skill earn reward",
}

const links: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'Game', path: '/game' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Stats', path: '/stats' },
  { label: 'Raffle', path: '/raffle' },
  { label: 'Profile', path: '/profile' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <Providers>
          <AppLayout links={links}>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  )
}

declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}