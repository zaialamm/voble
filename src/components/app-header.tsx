'use client'

import { PrivyLoginButton } from '@/components/privy-login-button'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BarChart3 } from 'lucide-react'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="relative z-50 px-4 py-3 md:py-4 border-b border-slate-800" style={{ backgroundColor: '#0e0e0e' }}>
      <div className="mx-auto flex justify-between items-center">
        {/* Logo - Left */}
        <div className="flex items-center">
          <Link className="flex items-center gap-3 hover:opacity-80 transition-opacity" href="/">
            <div className="flex items-center gap-2">
              <Image 
                src="/images/voble.png" 
                alt="Voble Logo" 
                width={48} 
                height={48}
                className="h-10 w-10 md:h-12 md:w-12 rounded-full object-contain"
                priority
              />
              <span className="text-xs font-semibold text-gray-400 leading-none">BETA</span>
            </div>
          </Link>
        </div>

        {/* Menu - Center */}
        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
          <ul className="flex gap-6 flex-nowrap items-center">
            {links.map(({ label, path }) => (
              <li key={path}>
                <Link
                  className={`text-white hover:text-gray-300 transition-colors ${isActive(path) ? 'text-gray-300' : ''}`}
                  href={path}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats & Auth - Right */}
        <div className="flex items-center gap-3">
          {/* Stats Icon - Mobile Only */}
          <Link 
            href="/stats"
            className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors group relative"
            title="Stats"
          >
            <BarChart3 className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
            {/* Tooltip */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Stats
            </div>
          </Link>
          
          <PrivyLoginButton />
        </div>

      </div>
    </header>
  )
}
