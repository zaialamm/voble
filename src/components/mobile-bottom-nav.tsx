'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BookOpen, 
  Trophy, 
  Gamepad2, 
  Ticket, 
  User 
} from 'lucide-react'

const navItems = [
  {
    label: 'About',
    href: '/about',
    icon: BookOpen
  },
  {
    label: 'Leaderboard',
    href: '/leaderboard',
    icon: Trophy
  },
  {
    label: 'Play',
    href: '/game',
    icon: Gamepad2,
    isPrimary: true
  },
  {
    label: 'Raffle',
    href: '/raffle',
    icon: Ticket
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User
  }
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e0e] border-t border-slate-800">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ label, href, icon: Icon, isPrimary }) => {
          const active = isActive(href)
          
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex flex-col items-center justify-center min-w-0 flex-1 py-1 px-1 relative
                transition-all duration-200 ease-in-out rounded-lg
                ${active ? 'text-purple-400' : 'text-gray-400'}
                ${isPrimary ? 'bg-yellow-500/10 border border-yellow-500/20' : ''}
                hover:text-purple-300 active:scale-95
              `}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              )}
              
              {/* Icon */}
              <Icon 
                className={`
                  ${isPrimary ? 'w-7 h-7' : 'w-6 h-6'} 
                  mb-1 transition-all duration-200
                  ${active ? 'scale-110' : 'scale-100'}
                  ${isPrimary ? 'text-yellow-400' : ''}
                `} 
              />
              
              {/* Label */}
              <span 
                className={`
                  text-xs font-medium leading-none truncate max-w-full
                  ${active ? 'font-semibold text-purple-400' : 'text-gray-500'}
                  ${isPrimary ? 'text-[10px]' : 'text-[10px]'}
                `}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
