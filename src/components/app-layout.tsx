'use client'

import React from 'react'
import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from './app-header'
import { AppFooter } from './app-footer'
import { MobileBottomNav } from './mobile-bottom-nav'

export function AppLayout({
  children,
  links,
}: {
  children: React.ReactNode
  links: { label: string; path: string }[]
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex flex-col min-h-screen">
        <AppHeader links={links} />
        <main className="flex-grow pb-16 md:pb-0">
          {children}
        </main>
        <AppFooter />
        <MobileBottomNav />
      </div>
      <Toaster closeButton />
    </ThemeProvider>
  )
}