'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  {
    id: 'intro',
    title: 'Introduction',
    content: {
      heading: 'What is Voble?',
      body: `Voble is a skill-based word puzzle game where players compete for cryptocurrency prizes. Built on Solana blockchain, it combines the familiar mechanics of word guessing games with competitive tournaments and real monetary rewards.

Players pay a small entry fee to participate in daily word challenges, with the top performers earning SOL tokens. The game uses verifiable random functions to ensure fair word selection and blockchain technology to guarantee transparent prize distribution.`
    }
  },
  {
    id: 'gameplay',
    title: 'How to Play',
    content: {
      heading: 'Game Mechanics',
      body: `Each day, players attempt to guess a randomly selected 6-letter word within 7 attempts. The game provides feedback after each guess:

• Green tiles indicate correct letters in the correct position
• Purple tiles show correct letters in the wrong position  
• Gray tiles represent letters not in the target word

Players have one attempt per day to maintain fair competition. Your performance is scored based on the number of guesses used, completion time, and accuracy. The scoring algorithm rewards both speed and efficiency.`
    }
  },
  {
    id: 'tournaments',
    title: 'Tournament Structure',
    content: {
      heading: 'Competition Format',
      body: `Voble operates three concurrent tournament formats:

Daily tournaments reset every 24 hours, weekly competitions run Sunday to Sunday, and monthly tournaments span full calendar months. A single entry fee of 0.001 SOL automatically registers you for all three tournaments.

The top 3 players in each tournament period split the prize pool: first place receives 50%, second place gets 30%, and third place earns 20%. Prize distribution occurs automatically at the end of each tournament period.`
    }
  },
  {
    id: 'economics',
    title: 'Platform Economics',
    content: {
      heading: 'Fee Structure',
      body: `Entry fees are allocated transparently across the platform:

• 80% goes directly to player prize pools
• 15% covers platform operational costs
• 5% supports MagicBlock infrastructure

This structure ensures the majority of player contributions return as prizes while maintaining sustainable platform operations. All transactions are recorded on-chain for complete transparency.`
    }
  },
  {
    id: 'technology',
    title: 'Technology',
    content: {
      heading: 'Technical Infrastructure',
      body: `Voble leverages MagicBlock's Ephemeral Rollups technology to provide gasless gameplay on Solana. This architecture enables instant game interactions without requiring players to manage transaction fees or complex wallet operations.

Word selection uses Verifiable Random Functions (VRF) to ensure no party can predict or manipulate the daily word. All game results and prize distributions are recorded immutably on the Solana blockchain.

The platform integrates Privy for seamless user onboarding, allowing players to create accounts using email or social login without prior cryptocurrency experience.`
    }
  }
]

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('intro')

  // Handle initial hash and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash && sections.some(s => s.id === hash)) {
        setActiveSection(hash)
      }
    }

    // Set initial section from hash if present
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateToSection = (id: string) => {
    setActiveSection(id)
    window.history.pushState(null, '', `#${id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentSectionIndex = sections.findIndex(s => s.id === activeSection)
  const currentSection = sections[currentSectionIndex] || sections[0]
  const prevSection = sections[currentSectionIndex - 1]
  const nextSection = sections[currentSectionIndex + 1]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-12">

          {/* Main Content */}
          <main className="flex-1 py-12 lg:py-24 min-w-0">
            <div className="max-w-3xl">
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-3xl font-bold mb-6 tracking-tight text-foreground">
                  {currentSection.content.heading}
                </h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none mb-8">
                  <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                    {currentSection.content.body}
                  </p>
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center justify-between pt-8 border-t border-border/40">
                  {prevSection ? (
                    <Button
                      variant="ghost"
                      className="group pl-0 hover:bg-transparent hover:text-primary"
                      onClick={() => navigateToSection(prevSection.id)}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-muted-foreground font-normal">Previous</span>
                        <span className="font-medium">{prevSection.title}</span>
                      </div>
                    </Button>
                  ) : <div />}

                  {nextSection ? (
                    <Button
                      variant="ghost"
                      className="group pr-0 hover:bg-transparent hover:text-primary"
                      onClick={() => navigateToSection(nextSection.id)}
                    >
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-muted-foreground font-normal">Next</span>
                        <span className="font-medium">{nextSection.title}</span>
                      </div>
                      <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  ) : <div />}
                </div>
              </section>
            </div>
          </main>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0 pt-24 pb-12">
            <div className="sticky top-24">
              <nav className="flex flex-col space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => navigateToSection(section.id)}
                    className={cn(
                      "text-left px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      activeSection === section.id
                        ? "bg-accent text-accent-foreground translate-x-1"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
