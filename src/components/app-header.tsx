'use client'

import { PrivyLoginButton } from '@/components/privy-login-button'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  return (
    <header className="relative z-50 px-4 py-3 md:py-4" style={{ backgroundColor: '#0e0e0e' }}>
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

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden text-white hover:text-gray-300" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Auth - Right */}
        <div className="hidden md:flex items-center gap-4">
          <PrivyLoginButton />
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 backdrop-blur-sm" style={{ backgroundColor: 'rgba(14, 14, 14, 0.95)' }}>
            <div className="flex flex-col p-4 gap-4 border-t dark:border-neutral-800">
              <div className="flex justify-end items-center gap-4">
                <PrivyLoginButton />
              </div>
              <ul className="flex flex-col gap-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`block text-lg py-2 ${isActive(path) ? 'text-white' : 'text-gray-300'} hover:text-white`}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
